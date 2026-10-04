import { supabase } from './supabase';
import type { ContestStatus, ContestType } from '@/constants/contestTypes';

export interface ContestRuleSection {
  title: string;
  body: string;
}

// ── Types ────────────────────────────────────────────────────────
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
  // Joined
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

// ── getContests ───────────────────────────────────────────────────
export async function getContests(
  filters: ContestFilters = {}
): Promise<{ data: Contest[]; error: string | null }> {
  let query = supabase
    .from('contests')
    .select('*, categories(name, slug, icon_url)')
    .neq('status', 'draft') // drafts are never public
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else if (!filters.includePausedOrBlocked) {
    query = query.not('status', 'in', '("paused","blocked")');
  }

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.featured) {
    query = query.eq('is_featured', true);
  }

  const { data, error } = await query;
  return { data: (data as Contest[]) ?? [], error: error?.message ?? null };
}

// ── getContestById ────────────────────────────────────────────────
export async function getContestById(
  id: string
): Promise<{ data: Contest | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contests')
    .select('*, categories(name, slug, icon_url)')
    .eq('id', id)
    .single();

  return { data: (data as Contest) ?? null, error: error?.message ?? null };
}

// ── createContest ─────────────────────────────────────────────────
export async function createContest(
  payload: CreateContestPayload
): Promise<{ data: Contest | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  const initialStatus = payload.status || 'registration';

  const { data, error } = await supabase
    .from('contests')
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      rules: payload.rules ?? null,
      type: payload.type,
      status: initialStatus,
      category_id: payload.category_id ?? null,
      cover_url: payload.cover_url ?? null,
      max_participants: payload.max_participants ?? null,
      group_size: payload.group_size ?? 6,
      registration_start: payload.registration_start ?? new Date().toISOString(),
      registration_end: payload.registration_end ?? null,
      voting_start: payload.voting_start ?? null,
      voting_end: payload.voting_end ?? null,
      created_by: user.id,
      is_featured: payload.is_featured ?? false,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data as Contest) ?? null, error: null };
}

// ── updateContestStatus ───────────────────────────────────────────
export async function updateContestStatus(
  id: string,
  status: ContestStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message ?? null };
}

// ── subscribeToContest ────────────────────────────────────────────
export async function subscribeToContest(
  contestId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required' };

  const { error } = await supabase
    .from('contest_subscriptions')
    .upsert({ user_id: user.id, contest_id: contestId });

  return { error: error?.message ?? null };
}

// ── unsubscribeFromContest ────────────────────────────────────────
export async function unsubscribeFromContest(
  contestId: string
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required' };

  const { error } = await supabase
    .from('contest_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('contest_id', contestId);

  return { error: error?.message ?? null };
}

// ── getMySubscriptions ────────────────────────────────────────────
export async function getMySubscriptions(): Promise<{
  data: string[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('contest_subscriptions')
    .select('contest_id')
    .eq('user_id', user.id);

  return {
    data: (data ?? []).map((r: { contest_id: string }) => r.contest_id),
    error: error?.message ?? null,
  };
}

// ── getCategories ─────────────────────────────────────────────────
export async function getCategories(): Promise<{
  data: { id: string; name: string; slug: string; icon_url: string | null }[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  return { data: data ?? [], error: error?.message ?? null };
}
