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
import type { ContestStatus, ContestType } from '@/constants/contestTypes';
import { SEED_CATEGORIES, SEED_CONTESTS } from './seedData';

export interface ContestRuleSection {
  title: string;
  body: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  prize?: string | null;
  quickRules?: string[];
  rulesSections?: ContestRuleSection[];
  type: ContestType;
  status: ContestStatus;
  visibility?: 'public' | 'private';
  feed_listing_status?: 'none' | 'pending' | 'approved' | 'rejected';
  category_id: string | null;
  cover_url: string | null;
  max_participants: number | null;
  group_size: number;
  registration_start: string | null;
  registration_end: string | null;
  voting_start: string | null;
  voting_end: string | null;
  created_by: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  categories?: { name: string; slug: string; icon_url: string | null } | null;
}

export interface ContestFilters {
  status?: ContestStatus | 'all';
  type?: ContestType | 'all';
  category_id?: string;
  featured?: boolean;
  includePausedOrBlocked?: boolean;
}

export interface CreateContestPayload {
  title: string;
  description?: string;
  rules?: string;
  prize?: string;
  type: ContestType;
  status?: ContestStatus;
  category_id?: string;
  cover_url?: string;
  max_participants?: number;
  group_size?: number;
  registration_start?: string;
  registration_end?: string;
  voting_start?: string;
  voting_end?: string;
  is_featured?: boolean;
}

function enrichContestCategory(c: Contest): Contest {
  if (c.categories) return c;
  const cat = SEED_CATEGORIES.find((item) => item.id === c.category_id);
  if (cat) {
    return {
      ...c,
      categories: { name: cat.name, slug: cat.slug, icon_url: cat.icon_url },
    };
  }
  return c;
}

export async function getContests(
  filters: ContestFilters = {}
): Promise<{ data: Contest[]; error: string | null }> {
  let firestoreContests: Contest[] = [];

  try {
    const colRef = collection(db, 'contests');
    let q;

    if (filters.includePausedOrBlocked) {
      try {
        const snap = await getDocs(colRef);
        firestoreContests = snap.docs.map((d) => d.data() as Contest);
      } catch {
        // Non-admin creators can list public contests + their own contests
        const publicSnap = await getDocs(query(colRef, where('visibility', '==', 'public')));
        const map = new Map<string, Contest>();
        publicSnap.docs.forEach((d) => map.set(d.id, d.data() as Contest));
        if (auth.currentUser) {
          const ownSnap = await getDocs(
            query(colRef, where('created_by', '==', auth.currentUser.uid))
          );
          ownSnap.docs.forEach((d) => map.set(d.id, d.data() as Contest));
        }
        firestoreContests = Array.from(map.values());
      }
    } else {
      q = query(colRef, where('visibility', '==', 'public'));
      const snap = await getDocs(q);
      firestoreContests = snap.docs.map((d) => d.data() as Contest);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'contests');
  }

  // Merge Firestore documents with SEED_CONTESTS so initial launch always shows rich catalog
  const mergedMap = new Map<string, Contest>();
  for (const seed of SEED_CONTESTS) {
    mergedMap.set(seed.id, enrichContestCategory(seed));
  }
  for (const docItem of firestoreContests) {
    mergedMap.set(docItem.id, enrichContestCategory(docItem));
  }

  let list = Array.from(mergedMap.values()).filter((c) => c.status !== 'draft');

  if (filters.status && filters.status !== 'all') {
    list = list.filter((c) => c.status === filters.status);
  } else if (!filters.includePausedOrBlocked) {
    list = list.filter((c) => c.status !== 'paused' && (c.status as string) !== 'blocked');
  }

  if (filters.type && filters.type !== 'all') {
    list = list.filter((c) => c.type === filters.type);
  }
  if (filters.category_id && filters.category_id !== 'cat-all') {
    list = list.filter((c) => c.category_id === filters.category_id);
  }
  if (filters.featured) {
    list = list.filter((c) => c.is_featured);
  }

  list.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return { data: list, error: null };
}

export async function getContestById(
  id: string
): Promise<{ data: Contest | null; error: string | null }> {
  if (!id) return { data: null, error: 'Contest ID is required' };

  try {
    const snap = await getDoc(doc(db, 'contests', id));
    if (snap.exists()) {
      return { data: enrichContestCategory(snap.data() as Contest), error: null };
    }
  } catch (err) {
    // Only surface permission error if doc wasn't accessible; fallback to alias/seed check for missing/private
    console.warn('Contest lookup note:', err);
  }

  const aliasMap: Record<string, string> = {
    'contest-neon-shinjuku': 'contest-neon-shinjuku',
    'battle-01': 'contest-neon-shinjuku',
    'battle-02': 'contest-tennis-apply',
    'battle-03': 'contest-photo-month',
    'battle-04': 'contest-glamour',
    'battle-05': 'contest-design-ideas',
  };
  const mappedId = aliasMap[id];
  if (mappedId && mappedId !== id) {
    try {
      const aliasSnap = await getDoc(doc(db, 'contests', mappedId));
      if (aliasSnap.exists()) {
        return { data: enrichContestCategory(aliasSnap.data() as Contest), error: null };
      }
    } catch {}
  }

  const seedContest = SEED_CONTESTS.find((c) => c.id === id || c.id === mappedId);
  if (seedContest) {
    return { data: enrichContestCategory(seedContest), error: null };
  }

  try {
    const { SEED_SAMPLE_BATTLES } = await import('@/services/battleDataService');
    const matchedBattle = SEED_SAMPLE_BATTLES.find((b) => b.id === id || b.contestId === id);
    if (matchedBattle) {
      const syntheticContest: Contest = {
        id: matchedBattle.contestId || matchedBattle.id,
        title: matchedBattle.title.replace(/·.*/, '').trim(),
        description: `Live duel tournament in ${matchedBattle.category}. Vote for the most compelling shot.`,
        rules: 'Fair community 1v1 battle voting on Opinion Net.',
        type: 'battle',
        status: 'active',
        visibility: 'public',
        category_id: 'cat-creative',
        cover_url: matchedBattle.red.photo || matchedBattle.green.photo,
        max_participants: 2,
        group_size: 2,
        registration_start: null,
        registration_end: null,
        voting_start: new Date().toISOString(),
        voting_end: null,
        created_by: 'usr-admin-01',
        is_featured: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { data: enrichContestCategory(syntheticContest), error: null };
    }
  } catch {}

  return { data: null, error: 'Contest not found' };
}

export async function createContest(
  payload: CreateContestPayload
): Promise<{ data: Contest | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  const isBattle = payload.type === 'battle';
  const initialStatus: ContestStatus = payload.status || (isBattle ? 'active' : 'registration');
  const now = new Date().toISOString();
  const contestId = `contest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const contestDoc: Omit<Contest, 'categories'> = {
    id: contestId,
    title: payload.title.trim().slice(0, 160),
    description: payload.description?.trim() || null,
    rules: payload.rules?.trim() || null,
    prize: payload.prize?.trim() || null,
    type: payload.type,
    status: initialStatus,
    visibility: 'public',
    feed_listing_status: 'approved',
    category_id: payload.category_id ?? null,
    cover_url: payload.cover_url?.trim() || null,
    max_participants: isBattle ? 2 : (payload.max_participants ?? null),
    group_size: isBattle ? 2 : Math.max(2, Math.min(50, payload.group_size ?? 6)),
    registration_start: isBattle ? null : (payload.registration_start ?? now),
    registration_end: isBattle ? null : (payload.registration_end ?? null),
    voting_start: payload.voting_start ?? (isBattle ? now : null),
    voting_end: payload.voting_end ?? null,
    created_by: user.uid,
    is_featured: payload.is_featured ?? true,
    created_at: now,
    updated_at: now,
  };

  try {
    await setDoc(doc(db, 'contests', contestId), contestDoc);
    return { data: enrichContestCategory(contestDoc), error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contests/${contestId}`);
  }
}

export async function updateContestStatus(
  id: string,
  status: ContestStatus
): Promise<{ error: string | null }> {
  try {
    await updateDoc(doc(db, 'contests', id), {
      status,
      updated_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contests/${id}`);
  }
}

export async function updateContest(
  id: string,
  updates: Partial<Contest>
): Promise<{ data: Contest | null; error: string | null }> {
  const cleanUpdates: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  delete cleanUpdates.categories;
  delete cleanUpdates.id;
  delete cleanUpdates.created_at;

  try {
    await updateDoc(doc(db, 'contests', id), cleanUpdates);
    return getContestById(id);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contests/${id}`);
  }
}

export async function deleteContest(id: string): Promise<{ error: string | null }> {
  try {
    const partsSnap = await getDocs(
      query(collection(db, 'participants'), where('contest_id', '==', id))
    );
    await Promise.all(partsSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'contests', id));
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `contests/${id}`);
  }
}

export async function toggleFreezeContest(
  id: string,
  currentlyFrozen: boolean,
  previousStatus: ContestStatus = 'active'
): Promise<{ error: string | null; newStatus: ContestStatus }> {
  const newStatus: ContestStatus = currentlyFrozen
    ? previousStatus === 'paused'
      ? 'active'
      : previousStatus
    : 'paused';
  const { error } = await updateContestStatus(id, newStatus);
  return { error, newStatus };
}

export async function toggleHideContest(
  id: string,
  currentlyHidden: boolean
): Promise<{ error: string | null; newVisibility: 'public' | 'private' }> {
  const newVisibility = currentlyHidden ? 'public' : 'private';
  try {
    await updateDoc(doc(db, 'contests', id), {
      visibility: newVisibility,
      updated_at: new Date().toISOString(),
    });
    return { error: null, newVisibility };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contests/${id}`);
  }
}

export async function extendContestDeadline(
  id: string,
  daysToAdd: number
): Promise<{ error: string | null; newEnd: string }> {
  const { data: contest } = await getContestById(id);
  const currentEnd = contest?.voting_end ? new Date(contest.voting_end) : new Date();
  currentEnd.setDate(currentEnd.getDate() + daysToAdd);
  const newEndIso = currentEnd.toISOString();

  try {
    await updateDoc(doc(db, 'contests', id), {
      voting_end: newEndIso,
      updated_at: new Date().toISOString(),
    });
    return { error: null, newEnd: newEndIso };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contests/${id}`);
  }
}

function subscriptionDocId(userId: string, contestId: string): string {
  const safeContest = contestId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const raw = `${userId}_${safeContest}`;
  return raw.slice(0, 128);
}

export async function subscribeToContest(
  contestId: string
): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: 'Authentication required' };

  const subId = subscriptionDocId(user.uid, contestId);
  try {
    await setDoc(doc(db, 'contest_subscriptions', subId), {
      id: subId,
      user_id: user.uid,
      contest_id: contestId,
      created_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `contest_subscriptions/${subId}`);
  }
}

export async function unsubscribeFromContest(
  contestId: string
): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { error: 'Authentication required' };

  const subId = subscriptionDocId(user.uid, contestId);
  try {
    await deleteDoc(doc(db, 'contest_subscriptions', subId));
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `contest_subscriptions/${subId}`);
  }
}

export async function getMySubscriptions(): Promise<{
  data: string[];
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: [], error: null };

  try {
    const snap = await getDocs(
      query(collection(db, 'contest_subscriptions'), where('user_id', '==', user.uid))
    );
    return {
      data: snap.docs.map((d) => (d.data() as { contest_id: string }).contest_id),
      error: null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'contest_subscriptions');
  }
}

export async function getCategories(): Promise<{
  data: { id: string; name: string; slug: string; icon_url: string | null }[];
  error: string | null;
}> {
  try {
    const snap = await getDocs(
      query(collection(db, 'categories'), where('sort_order', '>=', 0))
    );
    if (!snap.empty) {
      const list = snap.docs
        .map((d) => d.data() as { id: string; name: string; slug: string; icon_url: string | null; sort_order: number })
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return { data: list, error: null };
    }
  } catch (err) {
    console.warn('Categories fetch fallback to seed:', err);
  }

  return { data: SEED_CATEGORIES, error: null };
}
