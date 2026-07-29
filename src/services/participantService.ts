import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────
export interface Participant {
  id: string;
  contest_id: string;
  user_id: string;
  submission_data: {
    name?: string;
    photos?: string[];
    description?: string;
    social_links?: { instagram?: string; tiktok?: string; website?: string };
    sponsor?: { name: string; url: string; product_name?: string; buy_link?: string };
    tags?: string[];
  };
  status: 'pending' | 'approved' | 'rejected' | 'eliminated';
  admin_note: string | null;
  submitted_at: string;
  // Joined
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null };
}

export interface SubmitApplicationPayload {
  contestId: string;
  photos: string[];        // Already-uploaded public URLs from storageService
  description: string;
  socialLinks?: { instagram?: string; tiktok?: string; website?: string };
  sponsor?: { name: string; url: string; product_name?: string; buy_link?: string };
  tags?: string[];
}

// ── getParticipants ───────────────────────────────────────────────
export async function getParticipants(
  contestId: string,
  status: Participant['status'] | 'all' = 'approved'
): Promise<{ data: Participant[]; error: string | null }> {
  let query = supabase
    .from('participants')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('contest_id', contestId)
    .order('submitted_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  return { data: (data as Participant[]) ?? [], error: error?.message ?? null };
}

// ── getParticipantById ────────────────────────────────────────────
export async function getParticipantById(
  id: string
): Promise<{ data: Participant | null; error: string | null }> {
  const { data, error } = await supabase
    .from('participants')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('id', id)
    .single();

  return { data: (data as Participant) ?? null, error: error?.message ?? null };
}

// ── addBattleParticipant ──────────────────────────────────────────
export interface AddBattleParticipantPayload {
  contestId: string;
  name: string;
  photoUrl: string;
  description?: string;
}

export async function addBattleParticipant(
  payload: AddBattleParticipantPayload
): Promise<{ data: Participant | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  const uniqueUserId = crypto.randomUUID();

  let { data, error } = await supabase
    .from('participants')
    .insert({
      contest_id: payload.contestId,
      user_id: uniqueUserId,
      submission_data: {
        name: payload.name.trim(),
        photos: [payload.photoUrl.trim()],
        description: payload.description?.trim() || '',
      },
      status: 'approved',
    })
    .select('*, profiles(username, display_name, avatar_url)')
    .single();

  if (error && (error.message.includes('foreign key') || error.message.includes('violates foreign key constraint'))) {
    const { data: retryData, error: retryErr } = await supabase
      .from('participants')
      .insert({
        contest_id: payload.contestId,
        user_id: user.id,
        submission_data: {
          name: payload.name.trim(),
          photos: [payload.photoUrl.trim()],
          description: payload.description?.trim() || '',
        },
        status: 'approved',
      })
      .select('*, profiles(username, display_name, avatar_url)')
      .single();

    return { data: (retryData as Participant) ?? null, error: retryErr?.message ?? null };
  }

  return { data: (data as Participant) ?? null, error: error?.message ?? null };
}

export async function addBattleParticipants(
  contestId: string,
  competitors: Array<{ name: string; photoUrl: string; description?: string }>
): Promise<{ data: Participant[] | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Authentication required.' };

  const validCompetitors = competitors.filter(c => c.name.trim() || c.photoUrl.trim());
  if (validCompetitors.length === 0) return { data: [], error: null };

  const rowsToInsert = validCompetitors.map((comp, idx) => ({
    contest_id: contestId,
    user_id: idx === 0 ? user.id : crypto.randomUUID(),
    submission_data: {
      name: comp.name.trim() || `Competitor ${idx + 1}`,
      photos: [comp.photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'],
      description: comp.description?.trim() || '',
    },
    status: 'approved',
  }));

  const { data, error } = await supabase
    .from('participants')
    .insert(rowsToInsert)
    .select('*, profiles(username, display_name, avatar_url)');

  if (error && error.message.includes('foreign key')) {
    const fallbackRows = validCompetitors.map((comp) => ({
      contest_id: contestId,
      user_id: user.id,
      submission_data: {
        name: comp.name.trim() || 'Competitor',
        photos: [comp.photoUrl.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'],
        description: comp.description?.trim() || '',
      },
      status: 'approved',
    }));
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('participants')
      .insert(fallbackRows)
      .select('*, profiles(username, display_name, avatar_url)');
    return { data: (fallbackData as Participant[]) ?? null, error: fallbackErr?.message ?? null };
  }

  return { data: (data as Participant[]) ?? null, error: error?.message ?? null };
}

export async function deleteParticipant(
  participantId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participantId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

// ── submitApplication ─────────────────────────────────────────────
export async function submitApplication(
  payload: SubmitApplicationPayload
): Promise<{ data: Participant | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Authentication required. Please sign in.' };

  // Check if user already submitted for this contest
  const { data: existing } = await supabase
    .from('participants')
    .select('id, status')
    .eq('contest_id', payload.contestId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return { data: null, error: 'You have already registered for this contest.' };
  }

  const { data, error } = await supabase
    .from('participants')
    .insert({
      contest_id: payload.contestId,
      user_id: user.id,
      submission_data: {
        photos: payload.photos,
        description: payload.description,
        social_links: payload.socialLinks ?? {},
        sponsor: payload.sponsor ?? null,
        tags: payload.tags ?? [],
      },
      status: 'approved', // Auto-approve so submission immediately appears in contest
    })
    .select('*, profiles(username, display_name, avatar_url)')
    .single();

  return { data: (data as Participant) ?? null, error: error?.message ?? null };
}

// ── updateParticipantStatus ───────────────────────────────────────
// Used by admin/moderator to approve or reject applications.
export async function updateParticipantStatus(
  participantId: string,
  status: Participant['status'],
  adminNote?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('participants')
    .update({ status, admin_note: adminNote ?? null })
    .eq('id', participantId);

  return { error: error?.message ?? null };
}

// ── getMyApplications ─────────────────────────────────────────────
export async function getMyApplications(): Promise<{
  data: Participant[];
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from('participants')
    .select('*, contests(id, title, status, type)')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false });

  return { data: (data as Participant[]) ?? [], error: error?.message ?? null };
}
