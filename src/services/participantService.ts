import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { getProfile } from './profileService';
import { SEED_CONTESTS, SEED_PARTICIPANTS } from './seedData';

export interface Participant {
  id: string;
  contest_id: string;
  user_id: string;
  submission_data: {
    name?: string;
    author?: string;
    photos?: string[];
    description?: string;
    social_links?: { instagram?: string; tiktok?: string; website?: string };
    sponsor?: { name: string; url: string; product_name?: string; buy_link?: string } | null;
    tags?: string[];
    votes?: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'eliminated';
  admin_note: string | null;
  submitted_at: string;
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null };
  contests?: { id: string; title: string; status: string; type: string };
}

export interface SubmitApplicationPayload {
  contestId: string;
  photos: string[];
  description: string;
  socialLinks?: { instagram?: string; tiktok?: string; website?: string };
  sponsor?: { name: string; url: string; product_name?: string; buy_link?: string };
  tags?: string[];
}

export interface AddBattleParticipantPayload {
  contestId: string;
  name: string;
  photoUrl: string;
  description?: string;
}

function safeParticipantId(): string {
  return `part_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function hydrateParticipantProfiles(list: Participant[]): Promise<Participant[]> {
  const missingProfileIds = Array.from(
    new Set(list.filter((p) => !p.profiles && p.user_id).map((p) => p.user_id))
  );
  if (missingProfileIds.length === 0) return list;

  const profileMap = new Map<string, Participant['profiles']>();
  await Promise.all(
    missingProfileIds.map(async (uid) => {
      try {
        const { data } = await getProfile(uid);
        if (data) {
          profileMap.set(uid, {
            username: data.username,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
          });
        }
      } catch {
        // Ignore individual profile lookup failure
      }
    })
  );

  return list.map((p) => ({
    ...p,
    profiles: p.profiles || profileMap.get(p.user_id),
  }));
}

export async function getParticipants(
  contestId: string,
  status: Participant['status'] | 'all' = 'approved'
): Promise<{ data: Participant[]; error: string | null }> {
  let firestoreRows: Participant[] = [];

  try {
    const colRef = collection(db, 'participants');
    if (status === 'all') {
      try {
        const snap = await getDocs(query(colRef, where('contest_id', '==', contestId)));
        firestoreRows = snap.docs.map((d) => d.data() as Participant);
      } catch {
        // Non-admins querying 'all' must filter by status == 'approved' per security rules
        const approvedSnap = await getDocs(
          query(colRef, where('contest_id', '==', contestId), where('status', '==', 'approved'))
        );
        firestoreRows = approvedSnap.docs.map((d) => d.data() as Participant);
      }
    } else {
      const snap = await getDocs(
        query(colRef, where('contest_id', '==', contestId), where('status', '==', status))
      );
      firestoreRows = snap.docs.map((d) => d.data() as Participant);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'participants');
  }

  const seedRows = SEED_PARTICIPANTS.filter(
    (p) => p.contest_id === contestId && (status === 'all' || p.status === status)
  );

  const merged = new Map<string, Participant>();
  seedRows.forEach((p) => merged.set(p.id, p));
  firestoreRows.forEach((p) => merged.set(p.id, p));

  const sorted = Array.from(merged.values()).sort(
    (a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
  );

  const hydrated = await hydrateParticipantProfiles(sorted);
  return { data: hydrated, error: null };
}

export async function getParticipantById(
  id: string
): Promise<{ data: Participant | null; error: string | null }> {
  if (!id) return { data: null, error: 'Participant ID is required' };

  try {
    const snap = await getDoc(doc(db, 'participants', id));
    if (snap.exists()) {
      const [hydrated] = await hydrateParticipantProfiles([snap.data() as Participant]);
      return { data: hydrated, error: null };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `participants/${id}`);
  }

  const seed = SEED_PARTICIPANTS.find((p) => p.id === id);
  return { data: seed ?? null, error: seed ? null : 'Participant not found' };
}

export async function addBattleParticipant(
  payload: AddBattleParticipantPayload
): Promise<{ data: Participant | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  const id = safeParticipantId();
  const participantDoc: Omit<Participant, 'profiles' | 'contests'> = {
    id,
    contest_id: payload.contestId,
    user_id: user.uid,
    submission_data: {
      name: payload.name.trim(),
      photos: [payload.photoUrl.trim()],
      description: payload.description?.trim() || '',
    },
    status: 'approved',
    admin_note: null,
    submitted_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'participants', id), participantDoc);
    const [hydrated] = await hydrateParticipantProfiles([participantDoc]);
    return { data: hydrated, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `participants/${id}`);
  }
}

export async function addBattleParticipants(
  contestId: string,
  competitors: Array<{ name: string; photoUrl: string; description?: string; author?: string }>
): Promise<{ data: Participant[] | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Authentication required.' };

  const validCompetitors = competitors.filter((c) => c.name.trim() || c.photoUrl.trim());
  if (validCompetitors.length === 0) return { data: [], error: null };

  const created: Participant[] = [];
  for (let idx = 0; idx < validCompetitors.length; idx++) {
    const comp = validCompetitors[idx];
    const id = `${safeParticipantId()}_${idx}`;
    const docData: Omit<Participant, 'profiles' | 'contests'> = {
      id,
      contest_id: contestId,
      user_id: user.uid,
      submission_data: {
        name: comp.name.trim() || `Competitor ${idx + 1}`,
        author: comp.author?.trim() || '',
        photos: [
          comp.photoUrl.trim() ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        ],
        description: comp.description?.trim() || '',
      },
      status: 'approved',
      admin_note: null,
      submitted_at: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'participants', id), docData);
      created.push(docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `participants/${id}`);
    }
  }

  return { data: created, error: null };
}

export async function deleteParticipant(
  participantId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await deleteDoc(doc(db, 'participants', participantId));
    return { success: true, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `participants/${participantId}`);
  }
}

export async function submitApplication(
  payload: SubmitApplicationPayload
): Promise<{ data: Participant | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  try {
    const existingSnap = await getDocs(
      query(
        collection(db, 'participants'),
        where('contest_id', '==', payload.contestId),
        where('user_id', '==', user.uid)
      )
    );
    if (!existingSnap.empty) {
      return { data: null, error: 'You have already registered for this contest.' };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'participants');
  }

  const id = safeParticipantId();
  const docData: Omit<Participant, 'profiles' | 'contests'> = {
    id,
    contest_id: payload.contestId,
    user_id: user.uid,
    submission_data: {
      photos: payload.photos,
      description: payload.description,
      social_links: payload.socialLinks ?? {},
      sponsor: payload.sponsor ?? null,
      tags: payload.tags ?? [],
    },
    status: 'approved',
    admin_note: null,
    submitted_at: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'participants', id), docData);
    const [hydrated] = await hydrateParticipantProfiles([docData]);
    return { data: hydrated, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `participants/${id}`);
  }
}

export async function updateParticipantStatus(
  participantId: string,
  status: Participant['status'],
  adminNote?: string
): Promise<{ error: string | null }> {
  try {
    await updateDoc(doc(db, 'participants', participantId), {
      status,
      admin_note: adminNote ?? null,
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `participants/${participantId}`);
  }
}

export async function updateParticipantDetails(
  participantId: string,
  updates: {
    name?: string;
    photoUrl?: string;
    description?: string;
    status?: Participant['status'];
    adminNote?: string;
  }
): Promise<{ error: string | null }> {
  const { data: existing } = await getParticipantById(participantId);
  if (!existing) return { error: 'Participant not found' };

  const currentSubmission = existing.submission_data || {};
  const updatedSubmission = {
    ...currentSubmission,
    ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
    ...(updates.photoUrl !== undefined ? { photos: [updates.photoUrl.trim()] } : {}),
    ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
  };

  const payload: Record<string, unknown> = { submission_data: updatedSubmission };
  if (updates.status) payload.status = updates.status;
  if (updates.adminNote !== undefined) payload.admin_note = updates.adminNote;

  try {
    await updateDoc(doc(db, 'participants', participantId), payload);
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `participants/${participantId}`);
  }
}

export async function resetParticipantVotes(
  participantId: string
): Promise<{ error: string | null }> {
  try {
    const snap = await getDocs(
      query(collection(db, 'votes'), where('participant_id', '==', participantId))
    );
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'votes');
  }
}

export async function getMyApplications(): Promise<{
  data: Participant[];
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: [], error: null };

  try {
    const snap = await getDocs(
      query(collection(db, 'participants'), where('user_id', '==', user.uid))
    );
    const rows = snap.docs
      .map((d) => d.data() as Participant)
      .sort((a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime());

    const contestCache = new Map<string, Participant['contests']>();
    await Promise.all(
      Array.from(new Set(rows.map((r) => r.contest_id))).map(async (cid) => {
        try {
          const cSnap = await getDoc(doc(db, 'contests', cid));
          if (cSnap.exists()) {
            const c = cSnap.data() as { id: string; title: string; status: string; type: string };
            contestCache.set(cid, { id: c.id, title: c.title, status: c.status, type: c.type });
            return;
          }
        } catch {}
        const seedC = SEED_CONTESTS.find((c) => c.id === cid);
        if (seedC) {
          contestCache.set(cid, {
            id: seedC.id,
            title: seedC.title,
            status: seedC.status,
            type: seedC.type,
          });
        }
      })
    );

    const enriched = rows.map((r) => ({
      ...r,
      contests: contestCache.get(r.contest_id),
    }));

    return { data: enriched, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'participants');
  }
}

export async function getPendingParticipantsForAdmin(): Promise<{
  data: Participant[];
  error: string | null;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, 'participants'), where('status', '==', 'pending'))
    );
    const rows = snap.docs.map((d) => d.data() as Participant);
    const hydrated = await hydrateParticipantProfiles(rows);
    return { data: hydrated, error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'participants');
  }
}
