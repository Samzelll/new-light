import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface CastVotePayload {
  contestId: string;
  stageId: string;
  groupId: string;
  participantId: string;
  trustWeight: number;
}

export interface Vote {
  id: string;
  contest_id: string;
  stage_id: string;
  group_id: string;
  voter_id: string;
  participant_id: string;
  trust_weight: number;
  created_at: string;
  contests?: { id: string; title: string };
  participants?: { id: string; submission_data?: { photos?: string[] } };
}

export interface StageResult {
  id: string;
  stage_id: string;
  group_id: string;
  participant_id: string;
  vote_percentage: number;
  rank_in_group: number;
  passed: boolean;
}

export interface EternalVote {
  id: string;
  contest_id: string;
  voter_id: string;
  participant_id: string;
  trust_weight: number;
  voted_at: string;
  updated_at: string;
}

function buildSafeId(...parts: string[]): string {
  const joined = parts
    .map((p) => p.replace(/[^a-zA-Z0-9_-]/g, '_'))
    .join('_');
  if (joined.length <= 120) return joined;

  let hash = 2166136261;
  for (let i = 0; i < joined.length; i++) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16);
  return `${joined.slice(0, 96)}_${hex}`;
}

export async function getContestVotes(
  contestId: string
): Promise<{ data: Vote[]; error: string | null }> {
  if (!contestId) return { data: [], error: null };
  try {
    const snap = await getDocs(
      query(collection(db, 'votes'), where('contest_id', '==', contestId))
    );
    return {
      data: snap.docs.map((d) => d.data() as Vote),
      error: null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'votes');
  }
}

export async function castVote(
  payload: CastVotePayload
): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: 'Authentication required. Please sign in to vote.' };

  const stageId = payload.stageId || payload.contestId;
  const groupId = payload.groupId || payload.contestId;
  const voteId = buildSafeId('v', payload.contestId, groupId, user.uid);
  const now = new Date().toISOString();

  try {
    const voteRef = doc(db, 'votes', voteId);
    const existing = await getDoc(voteRef);

    if (existing.exists()) {
      const prev = existing.data() as Vote;
      await setDoc(voteRef, {
        id: voteId,
        contest_id: payload.contestId,
        stage_id: stageId,
        group_id: groupId,
        voter_id: user.uid,
        participant_id: payload.participantId,
        trust_weight: payload.trustWeight || 1.0,
        created_at: prev.created_at || now,
      });
    } else {
      await setDoc(voteRef, {
        id: voteId,
        contest_id: payload.contestId,
        stage_id: stageId,
        group_id: groupId,
        voter_id: user.uid,
        participant_id: payload.participantId,
        trust_weight: payload.trustWeight || 1.0,
        created_at: now,
      });
      logVoteActivity(user.uid, payload.contestId, payload.participantId).catch(() => {});
    }

    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `votes/${voteId}`);
  }
}

export async function cancelVote(payload: {
  contestId: string;
  stageId?: string;
  groupId?: string;
}): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: null };

  const groupId = payload.groupId || payload.contestId;
  const deterministicId = buildSafeId('v', payload.contestId, groupId, user.uid);

  try {
    await deleteDoc(doc(db, 'votes', deterministicId));
    const snap = await getDocs(
      query(
        collection(db, 'votes'),
        where('contest_id', '==', payload.contestId),
        where('voter_id', '==', user.uid)
      )
    );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `votes/${deterministicId}`);
  }
}

export async function castEternalVote(
  contestId: string,
  participantId: string,
  trustWeight: number
): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: 'Authentication required' };

  const voteId = buildSafeId('ev', contestId, user.uid);
  const now = new Date().toISOString();

  try {
    const ref = doc(db, 'eternal_votes', voteId);
    const snap = await getDoc(ref);
    const votedAt = snap.exists() ? (snap.data() as EternalVote).voted_at : now;

    await setDoc(ref, {
      id: voteId,
      contest_id: contestId,
      voter_id: user.uid,
      participant_id: participantId,
      trust_weight: trustWeight || 1.0,
      voted_at: votedAt,
      updated_at: now,
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `eternal_votes/${voteId}`);
  }
}

export async function getMyVoteForGroup(
  stageId: string,
  groupId: string
): Promise<{ participantId: string | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { participantId: null, error: null };

  try {
    const snap = await getDocs(
      query(
        collection(db, 'votes'),
        where('stage_id', '==', stageId),
        where('group_id', '==', groupId),
        where('voter_id', '==', user.uid),
        limit(1)
      )
    );
    const first = snap.docs[0]?.data() as Vote | undefined;
    return { participantId: first?.participant_id ?? null, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'votes');
  }
}

export async function getStageResults(
  stageId: string
): Promise<{ data: StageResult[]; error: string | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'stage_results'), where('stage_id', '==', stageId))
    );
    const results = snap.docs
      .map((d) => d.data() as StageResult)
      .sort((a, b) => a.rank_in_group - b.rank_in_group);
    return { data: results, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'stage_results');
  }
}

export async function getMyVoteHistory(): Promise<{
  data: Vote[];
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: [], error: null };

  try {
    const snap = await getDocs(
      query(collection(db, 'votes'), where('voter_id', '==', user.uid), limit(100))
    );
    const votes = snap.docs
      .map((d) => d.data() as Vote)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return { data: votes, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'votes');
  }
}

export async function getMyEternalVotes(): Promise<{
  data: EternalVote[];
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: [], error: null };

  try {
    const snap = await getDocs(
      query(collection(db, 'eternal_votes'), where('voter_id', '==', user.uid))
    );
    const votes = snap.docs
      .map((d) => d.data() as EternalVote)
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

    return { data: votes, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'eternal_votes');
  }
}

async function logVoteActivity(
  userId: string,
  _contestId: string,
  _participantId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const logId = buildSafeId('log', userId, today);
  const logRef = doc(db, 'user_daily_log', logId);
  const existing = await getDoc(logRef);
  const currentCount = existing.exists()
    ? Number((existing.data() as { votes_cast?: number }).votes_cast ?? 0)
    : 0;

  await setDoc(logRef, {
    id: logId,
    user_id: userId,
    log_date: today,
    votes_cast: currentCount + 1,
  });
}
