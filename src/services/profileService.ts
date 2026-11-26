import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '@/lib/firebase';
import type { UserRole } from '@/constants/permissions';
import { resolveImageUrl } from './storageService';
import { SEED_PROFILES } from './seedData';

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  show_participations: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserTrust {
  user_id: string;
  score: number;
  level: 'new' | 'regular' | 'trusted' | 'senior';
  days_active: number;
  contests_voted: number;
  vote_diversity: number;
  last_updated: string;
}

export async function getProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  if (!userId) return { data: null, error: 'User ID is required' };

  try {
    const snap = await getDoc(doc(db, 'profiles', userId));
    if (snap.exists()) {
      const profile = snap.data() as Profile;
      if (profile.avatar_url) {
        profile.avatar_url = resolveImageUrl(profile.avatar_url, 'avatars');
      }
      return { data: profile, error: null };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `profiles/${userId}`);
  }

  const seed = SEED_PROFILES.find((p) => p.id === userId);
  return { data: seed ?? null, error: null };
}

export async function getMyProfile(): Promise<{
  data: Profile | null;
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Not authenticated' };
  return getProfile(user.uid);
}

export async function updateProfile(
  updates: Partial<
    Pick<Profile, 'username' | 'display_name' | 'bio' | 'show_participations' | 'avatar_url'>
  >
): Promise<{ data: Profile | null; error: string | null }> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: 'Authentication required' };

  const sanitizedUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.username !== undefined && updates.username !== null) {
    sanitizedUpdates.username = updates.username.trim().slice(0, 64);
  }
  if (updates.display_name !== undefined) {
    sanitizedUpdates.display_name = updates.display_name?.trim().slice(0, 100) ?? null;
  }
  if (updates.bio !== undefined) {
    sanitizedUpdates.bio = updates.bio?.trim().slice(0, 500) ?? null;
  }
  if (updates.show_participations !== undefined) {
    sanitizedUpdates.show_participations = Boolean(updates.show_participations);
  }
  if (updates.avatar_url !== undefined) {
    sanitizedUpdates.avatar_url = updates.avatar_url
      ? resolveImageUrl(updates.avatar_url, 'avatars')
      : null;
  }

  try {
    await updateDoc(doc(db, 'profiles', user.uid), sanitizedUpdates);
    return getProfile(user.uid);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
  }
}

export async function getMyTrust(): Promise<{
  data: UserTrust | null;
  error: string | null;
}> {
  const user = auth.currentUser;
  if (!user) return { data: null, error: null };

  try {
    const snap = await getDoc(doc(db, 'user_trust', user.uid));
    if (snap.exists()) {
      return { data: snap.data() as UserTrust, error: null };
    }
    return {
      data: {
        user_id: user.uid,
        score: 1.0,
        level: 'new',
        days_active: 1,
        contests_voted: 0,
        vote_diversity: 0,
        last_updated: new Date().toISOString(),
      },
      error: null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `user_trust/${user.uid}`);
  }
}

const inflightProfileSyncs = new Map<string, Promise<Profile>>();

export function ensureProfileExists(
  userId: string,
  email: string,
  displayName?: string | null,
  avatarUrl?: string | null
): Promise<Profile> {
  const existingPromise = inflightProfileSyncs.get(userId);
  if (existingPromise) {
    return existingPromise;
  }

  const run = (async (): Promise<Profile> => {
    const now = new Date().toISOString();
    const isBootstrapAdmin = email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL;
    const rawPrefix = email.split('@')[0]?.trim() || '';
    const fallbackUsername = (rawPrefix || `user_${userId.slice(0, 6)}`).slice(0, 64);

    let existingProfile: Profile | null = null;
    try {
      const profileRef = doc(db, 'profiles', userId);
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        existingProfile = snap.data() as Profile;
        if (isBootstrapAdmin && existingProfile.role !== 'admin') {
          await updateDoc(profileRef, {
            role: 'admin',
            updated_at: now,
          });
          existingProfile = { ...existingProfile, role: 'admin', updated_at: now };
        }
      } else {
        const newProfile: Profile = {
          id: userId,
          username: fallbackUsername,
          display_name: displayName?.trim().slice(0, 100) || fallbackUsername,
          avatar_url: avatarUrl ? avatarUrl.slice(0, 250000) : null,
          bio: null,
          role: isBootstrapAdmin ? 'admin' : 'user',
          show_participations: true,
          created_at: now,
          updated_at: now,
        };
        await setDoc(profileRef, newProfile);
        existingProfile = newProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${userId}`);
    }

    // Ensure owner-only PII record in users_private/{userId}
    if (email) {
      try {
        const privRef = doc(db, 'users_private', userId);
        const privSnap = await getDoc(privRef);
        if (!privSnap.exists()) {
          await setDoc(privRef, {
            uid: userId,
            email: email.slice(0, 254),
            created_at: now,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users_private/${userId}`);
      }
    }

    // Ensure user_trust/{userId} exists
    try {
      const trustRef = doc(db, 'user_trust', userId);
      const trustSnap = await getDoc(trustRef);
      if (!trustSnap.exists()) {
        await setDoc(trustRef, {
          user_id: userId,
          score: isBootstrapAdmin ? 950 : 1.0,
          level: isBootstrapAdmin ? 'senior' : 'new',
          days_active: 1,
          contests_voted: 0,
          vote_diversity: 0,
          last_updated: now,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_trust/${userId}`);
    }

    return existingProfile;
  })();

  inflightProfileSyncs.set(userId, run);
  return run.finally(() => {
    inflightProfileSyncs.delete(userId);
  });
}

export async function setUserRole(
  targetUserId: string,
  role: UserRole
): Promise<{ error: string | null }> {
  try {
    await updateDoc(doc(db, 'profiles', targetUserId), {
      role,
      updated_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `profiles/${targetUserId}`);
  }
}

export async function getAllProfilesForAdmin(): Promise<{
  data: Profile[];
  error: string | null;
}> {
  try {
    const snap = await getDocs(query(collection(db, 'profiles'), limit(100)));
    return {
      data: snap.docs.map((d) => d.data() as Profile),
      error: null,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'profiles');
  }
}
