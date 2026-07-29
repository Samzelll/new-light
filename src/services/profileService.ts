import { supabase } from './supabase';
import type { UserRole } from '@/constants/permissions';

// ── Types ────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  show_participations: boolean;
  created_at: string;
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

// ── getProfile ────────────────────────────────────────────────────
export async function getProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data: (data as Profile) ?? null, error: error?.message ?? null };
}

// ── getMyProfile ──────────────────────────────────────────────────
export async function getMyProfile(): Promise<{
  data: Profile | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  return getProfile(user.id);
}

// ── updateProfile ─────────────────────────────────────────────────
export async function updateProfile(
  updates: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'show_participations' | 'avatar_url'>>
): Promise<{ data: Profile | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Authentication required' };

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  return { data: (data as Profile) ?? null, error: error?.message ?? null };
}

// ── getMyTrust ────────────────────────────────────────────────────
export async function getMyTrust(): Promise<{
  data: UserTrust | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: null };

  const { data, error } = await supabase
    .from('user_trust')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { data: (data as UserTrust) ?? null, error: error?.message ?? null };
}

// ── ensureProfileExists ───────────────────────────────────────────
// Called after first login to guarantee a profile row exists.
// The Supabase trigger (handle_new_user) should do this automatically,
// but this is a safe fallback.
export async function ensureProfileExists(
  userId: string,
  email: string
): Promise<void> {
  await supabase.from('profiles').upsert(
    {
      id: userId,
      username: email.split('@')[0],
      role: 'user',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  // Also ensure user_trust row exists
  await supabase.from('user_trust').upsert(
    {
      user_id: userId,
      score: 1.0,
      level: 'new',
    },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );
}

// ── setUserRole ───────────────────────────────────────────────────
// Admin only — update a user's role.
export async function setUserRole(
  targetUserId: string,
  role: UserRole
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', targetUserId);

  return { error: error?.message ?? null };
}
