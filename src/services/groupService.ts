import { supabase } from './supabase';

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

/**
 * Fetches all groups for a given contest stage.
 */
export async function getGroups(stageId: string): Promise<{ data: ContestGroup[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contest_groups')
    .select('*')
    .eq('stage_id', stageId)
    .order('group_number', { ascending: true });

  return { data, error: error?.message ?? null };
}

/**
 * Fetches members/participants in a specific group.
 */
export async function getGroupMembers(groupId: string): Promise<{ data: any[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      id,
      group_id,
      stage_id,
      participant_id,
      participants (
        id,
        user_id,
        submission_data,
        status,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('group_id', groupId);

  return { data, error: error?.message ?? null };
}

/**
 * Saves generated groups and their members to the database.
 * This runs inside a transaction or sequential inserts.
 */
export async function saveStageGroupsAndMembers(
  contestId: string,
  stageId: string,
  groupedParticipants: string[][] // Array of participant IDs grouped together
): Promise<{ error: string | null }> {
  try {
    for (let i = 0; i < groupedParticipants.length; i++) {
      const participantIds = groupedParticipants[i];
      const groupNumber = i + 1;

      // 1. Create the contest group
      const { data: groupData, error: groupError } = await supabase
        .from('contest_groups')
        .insert({
          contest_id: contestId,
          stage_id: stageId,
          group_number: groupNumber,
          status: 'pending',
        })
        .select()
        .single();

      if (groupError || !groupData) {
        throw new Error(groupError?.message || 'Failed to create contest group');
      }

      // 2. Prepare group member records
      const membersToInsert = participantIds.map((participantId) => ({
        group_id: groupData.id,
        stage_id: stageId,
        contest_id: contestId,
        participant_id: participantId,
      }));

      // 3. Bulk insert group members
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersToInsert);

      if (membersError) {
        throw new Error(membersError.message);
      }
    }

    return { error: null };
  } catch (err: any) {
    return { error: err.message || 'Failed to save groups' };
  }
}
