import { supabase } from './supabase';

export interface UserTrust {
  user_id: string;
  score: number;
  days_active: number;
  contests_voted: number;
  vote_diversity: number;
  last_updated: string;
  level: 'new' | 'regular' | 'trusted' | 'senior';
}

/**
 * Fetches the trust score record for a specific user.
 */
export async function getTrustData(userId: string): Promise<{ data: UserTrust | null; error: string | null }> {
  const { data, error } = await supabase
    .from('user_trust')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error: error?.message ?? null };
}

/**
 * Fetches the trust score record for the currently logged-in user.
 */
export async function getMyTrust(): Promise<{ data: UserTrust | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User is not authenticated' };

    return getTrustData(user.id);
  } catch (err: any) {
    return { data: null, error: err.message || 'An error occurred fetching trust info' };
  }
}
