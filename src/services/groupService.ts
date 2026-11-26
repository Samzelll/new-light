import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { getParticipantById } from './participantService';
import { getProfile } from './profileService';

export interface ContestGroup {
  id: string;
  stage_id: string;
  contest_id: string;
  group_number: number;
  status: 'pending' | 'active' | 'completed';
}

export interface GroupMember {
  id: string;
  group_id: string;
  stage_id: string;
  participant_id: string;
  contest_id: string;
}

export interface ContestStage {
  id: string;
  contest_id: string;
  stage_number: number;
  title?: string;
  status: 'pending' | 'active' | 'completed';
}

export interface FraudFlag {
  id: string;
  participant_id: string;
  reason: string;
  reviewed: boolean;
  admin_action?: string | null;
  created_at: string;
  severity?: string;
  flag_type?: string;
  participants?: {
    id: string;
    profiles?: { username?: string | null };
  };
}

export async function getGroups(
  stageId: string
): Promise<{ data: ContestGroup[] | null; error: string | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'contest_groups'), where('stage_id', '==', stageId))
    );
    const data = snap.docs
      .map((d) => d.data() as ContestGroup)
      .sort((a, b) => a.group_number - b.group_number);
    return { data, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'contest_groups');
  }
}

export async function getGroupMembers(
  groupId: string
): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'group_members'), where('group_id', '==', groupId))
    );
    const members = snap.docs.map((d) => d.data() as GroupMember);
    const enriched = await Promise.all(
      members.map(async (m) => {
        const { data: participant } = await getParticipantById(m.participant_id);
        let profileData = participant?.profiles ?? null;
        if (!profileData && participant?.user_id) {
          const { data: prof } = await getProfile(participant.user_id);
          if (prof) {
            profileData = {
              username: prof.username,
              display_name: prof.display_name,
              avatar_url: prof.avatar_url,
            };
          }
        }
        return {
          ...m,
          participants: participant
            ? {
                ...participant,
                profiles: profileData,
              }
            : null,
        };
      })
    );
    return { data: enriched, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'group_members');
  }
}

export async function saveStageGroupsAndMembers(
  contestId: string,
  stageId: string,
  groupedParticipants: string[][]
): Promise<{ error: string | null }> {
  try {
    for (let i = 0; i < groupedParticipants.length; i++) {
      const participantIds = groupedParticipants[i];
      const groupNumber = i + 1;
      const groupId = `grp_${stageId}_${groupNumber}_${Date.now()}`.slice(0, 128);

      await setDoc(doc(db, 'contest_groups', groupId), {
        id: groupId,
        contest_id: contestId,
        stage_id: stageId,
        group_number: groupNumber,
        status: 'pending',
      });

      for (const participantId of participantIds) {
        const memberId = `gm_${groupId}_${participantId}`.slice(0, 128);
        await setDoc(doc(db, 'group_members', memberId), {
          id: memberId,
          group_id: groupId,
          stage_id: stageId,
          contest_id: contestId,
          participant_id: participantId,
        });
      }
    }

    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'contest_groups');
  }
}

export async function getActiveStageForContest(
  contestId: string
): Promise<{ data: ContestStage | null; error: string | null }> {
  try {
    const snap = await getDocs(
      query(
        collection(db, 'contest_stages'),
        where('contest_id', '==', contestId),
        where('status', '==', 'active')
      )
    );
    const stage = (snap.docs[0]?.data() as ContestStage | undefined) ?? null;
    return { data: stage, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'contest_stages');
  }
}

export async function getStageResultsForParticipant(
  participantId: string
): Promise<{ data: any[]; error: string | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'stage_results'), where('participant_id', '==', participantId))
    );
    const rows = await Promise.all(
      snap.docs.map(async (d) => {
        const result = d.data() as Record<string, unknown> & { stage_id?: string };
        let contest_stages: { stage_number?: number; title?: string } | null = null;
        if (result.stage_id) {
          try {
            const stageSnap = await getDoc(doc(db, 'contest_stages', result.stage_id));
            if (stageSnap.exists()) {
              contest_stages = stageSnap.data() as { stage_number?: number; title?: string };
            }
          } catch {}
        }
        return { ...result, contest_stages };
      })
    );
    return { data: rows, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'stage_results');
  }
}

export async function getUnreviewedFraudFlags(): Promise<{
  data: FraudFlag[];
  error: string | null;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, 'fraud_flags'), where('reviewed', '==', false))
    );
    const flags = await Promise.all(
      snap.docs.map(async (d) => {
        const flag = d.data() as FraudFlag;
        const { data: part } = await getParticipantById(flag.participant_id);
        return {
          ...flag,
          participants: part
            ? {
                id: part.id,
                profiles: part.profiles,
              }
            : undefined,
        };
      })
    );
    return { data: flags, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'fraud_flags');
  }
}

export async function resolveFraudFlag(
  flagId: string,
  action: 'dismissed' | 'disqualified'
): Promise<{ error: string | null }> {
  try {
    await updateDoc(doc(db, 'fraud_flags', flagId), {
      reviewed: true,
      admin_action: action,
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `fraud_flags/${flagId}`);
  }
}
