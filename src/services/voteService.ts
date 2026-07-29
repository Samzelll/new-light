import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────
export interface CastVotePayload {
  contestId: string;
  stageId: string;
  groupId: string;
  participantId: string;
  trustWeight: number; // Snapshot from user_trust.score at time of vote
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
}

export interface StageResult {
  id: string;
  stage_id: string;
  group_id: string;
  participant_id: string;
  vote_percentage: number; // Always percentage, never raw count
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

// ── castVote ──────────────────────────────────────────────────────
// Cast a vote in a standard/battle/race contest.
export async function castVote(
  payload: CastVotePayload
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required. Please sign in to vote.' };

  // Try server-side Edge Function if available
  try {
    const { error: fnError } = await supabase.functions.invoke('cast-vote', {
      body: {
        contestId: payload.contestId,
        stageId: payload.stageId,
        groupId: payload.groupId,
        participantId: payload.participantId,
        trustWeight: payload.trustWeight,
      },
    });

    if (!fnError) return { error: null };
  } catch (_err) {
    // Edge function not deployed, fallback to direct insert
  }

  // Fallback: Direct insert into 'votes' table
  const { error: dbError } = await supabase.from('votes').insert({
    contest_id: payload.contestId,
    stage_id: payload.stageId || payload.contestId,
    group_id: payload.groupId || payload.contestId,
    voter_id: user.id,
    participant_id: payload.participantId,
    trust_weight: payload.trustWeight || 1.0,
  });

  if (dbError) {
    if (
      dbError.code === '23505' ||
      dbError.message?.toLowerCase().includes('duplicate') ||
      dbError.message?.toLowerCase().includes('unique')
    ) {
      return { error: 'You have already voted in this match/group.' };
    }
    return { error: dbError.message };
  }

  return { error: null };
}

// ── castEternalVote ───────────────────────────────────────────────
// Cast or update a vote in an eternal contest.
export async function castEternalVote(
  contestId: string,
  participantId: string,
  trustWeight: number
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required' };

  const { error } = await supabase.from('eternal_votes').upsert(
    {
      contest_id: contestId,
      voter_id: user.id,
      participant_id: participantId,
      trust_weight: trustWeight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'contest_id,voter_id' }
  );

  return { error: error?.message ?? null };
}

// ── getMyVoteForGroup ─────────────────────────────────────────────
// Check if the current user already voted in a specific group/stage.
export async function getMyVoteForGroup(
  stageId: string,
  groupId: string
): Promise<{ participantId: string | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { participantId: null, error: null };

  const { data, error } = await supabase
    .from('votes')
    .select('participant_id')
    .eq('stage_id', stageId)
    .eq('group_id', groupId)
    .eq('voter_id', user.id)
    .single();

  return {
    participantId: (data as { participant_id: string } | null)?.participant_id ?? null,
    error: error && error.code !== 'PGRST116' ? error.message : null,
    // PGRST116 = row not found → means user hasn't voted yet, not an error
  };
}

// ── getStageResults ───────────────────────────────────────────────
// Returns results for a completed stage — percentages only.
export async function getStageResults(
  stageId: string
): Promise<{ data: StageResult[]; error: string | null }> {
  const { data, error } = await supabase
    .from('stage_results')
    .select('*')
    .eq('stage_id', stageId)
    .order('rank_in_group');

  return { data: (data as StageResult[]) ?? [], error: error?.message ?? null };
}

// ── getMyVoteHistory ──────────────────────────────────────────────
export async function getMyVoteHistory(): Promise<{
  data: Vote[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('votes')
    .select('*, contests(id, title), participants(id, submission_data)')
    .eq('voter_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return { data: (data as Vote[]) ?? [], error: error?.message ?? null };
}

// ── getMyEternalVotes ─────────────────────────────────────────────
export async function getMyEternalVotes(): Promise<{
  data: EternalVote[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('eternal_votes')
    .select('*, contests(id, title), participants(id, submission_data)')
    .eq('voter_id', user.id)
    .order('updated_at', { ascending: false });

  return { data: (data as EternalVote[]) ?? [], error: error?.message ?? null };
}

// ── logVoteActivity (internal) ────────────────────────────────────
async function logVoteActivity(
  userId: string,
  _contestId: string,
  _participantId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await supabase.from('user_daily_log').upsert(
    {
      user_id: userId,
      log_date: today,
      votes_cast: 1,
    },
    {
      onConflict: 'user_id,log_date',
      // Increment votes_cast — Supabase supports this via RPC or we handle in Edge Function
      ignoreDuplicates: false,
    }
  );
}
