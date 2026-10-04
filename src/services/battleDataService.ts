/**
 * Battle Data Service
 * 
 * Modular data layer for 1v1 Battle contests.
 * Provides getBattle, castVote, and getNextBattle so the backend
 * can be swapped out easily without modifying UI components.
 */

import { supabase } from '@/services/supabase';
import { getContests, getContestById } from '@/services/contestService';
import { getParticipants } from '@/services/participantService';
import { castVote as castVoteService } from '@/services/voteService';

export interface BattleCompetitor {
  id: string;
  name: string;
  photoUrl: string;
  votes: number;
  percentage: number;
  corner: 'red' | 'blue';
  isUserPick?: boolean;
}

export interface BattleContest {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  rules: string;
  status: string;
  totalVotes: number;
  competitors: [BattleCompetitor, BattleCompetitor];
  userVotedId: string | null;
}

// Fallback competitor sets if a contest has fewer than 2 competitors
const FALLBACK_PAIRS: Record<string, [Partial<BattleCompetitor>, Partial<BattleCompetitor>]> = {
  default: [
    {
      name: 'Manhattan sunset',
      photoUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1080&q=80',
    },
    {
      name: 'Neon Shinjuku',
      photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    },
  ],
  'contest-stars': [
    {
      name: 'Golden Glow Horizon',
      photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
    },
    {
      name: 'Cosmic Neon Eclipse',
      photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80',
    },
  ],
};

/**
 * Fetch a single battle contest and its 1v1 competitors with vote stats.
 */
export async function getBattle(contestId?: string): Promise<BattleContest | null> {
  try {
    let targetId = contestId;

    // If no ID provided, pick the first battle contest
    if (!targetId) {
      const { data: allContests } = await getContests({ includePausedOrBlocked: false });
      const firstBattle = allContests?.find((c) => c.type === 'battle');
      if (firstBattle) targetId = firstBattle.id;
    }

    if (!targetId) targetId = 'contest-battle-01';

    const { data: contest } = await getContestById(targetId);
    if (!contest) return null;

    // Fetch participants
    const { data: participantsData } = await getParticipants(targetId, 'all');
    const participants = participantsData || [];

    // Fetch votes
    const { data: votesData } = await supabase
      .from('votes')
      .select('id, participant_id, voter_id')
      .eq('contest_id', targetId);

    const votes = votesData || [];
    const totalVotes = votes.length;

    // Check current user session for existing vote
    let userVotedId: string | null = null;
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (currentUserId) {
      const myVote = votes.find((v: any) => v.voter_id === currentUserId);
      if (myVote) userVotedId = myVote.participant_id;
    }

    // Determine competitors
    const fallbackPair = FALLBACK_PAIRS[targetId] || FALLBACK_PAIRS.default;

    // Participant 1 (Red corner)
    const p1 = participants[0];
    const p1Id = p1?.id || 'part-red-corner';
    const p1Name = p1?.submission_data?.name || fallbackPair[0].name || 'Red Corner Item';
    const p1Photo = p1?.submission_data?.photos?.[0] || fallbackPair[0].photoUrl || '';
    const p1Votes = votes.filter((v: any) => v.participant_id === p1Id).length;

    // Participant 2 (Blue corner)
    const p2 = participants[1];
    const p2Id = p2?.id || 'part-blue-corner';
    const p2Name = p2?.submission_data?.name || fallbackPair[1].name || 'Blue Corner Item';
    const p2Photo = p2?.submission_data?.photos?.[0] || fallbackPair[1].photoUrl || '';
    const p2Votes = votes.filter((v: any) => v.participant_id === p2Id).length;

    // Calculate percentages
    let p1Percent = 50;
    let p2Percent = 50;
    const effectiveTotal = p1Votes + p2Votes;
    if (effectiveTotal > 0) {
      p1Percent = Number(((p1Votes / effectiveTotal) * 100).toFixed(1));
      p2Percent = Number((100 - p1Percent).toFixed(1));
    }

    const competitor1: BattleCompetitor = {
      id: p1Id,
      name: p1Name,
      photoUrl: p1Photo,
      votes: p1Votes,
      percentage: p1Percent,
      corner: 'red',
      isUserPick: userVotedId === p1Id,
    };

    const competitor2: BattleCompetitor = {
      id: p2Id,
      name: p2Name,
      photoUrl: p2Photo,
      votes: p2Votes,
      percentage: p2Percent,
      corner: 'blue',
      isUserPick: userVotedId === p2Id,
    };

    return {
      id: contest.id,
      title: contest.title?.toUpperCase() || 'BATTLE ARENA',
      description: contest.description || 'Duel of two strongest works. Vote for the most atmospheric shot.',
      category: contest.categories?.name || 'Street photo',
      format: '1 vs 1 battle',
      rules: contest.rules || 'One vote per user. Tapping your choice casts an immutable vote. Trust-weighted ranking.',
      status: contest.status,
      totalVotes: effectiveTotal || totalVotes,
      competitors: [competitor1, competitor2],
      userVotedId,
    };
  } catch (err) {
    console.error('Error fetching battle contest:', err);
    return null;
  }
}

/**
 * Cast a vote for a competitor in a battle contest.
 */
export async function castVote(
  contestId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await castVoteService({
      contestId,
      stageId: contestId,
      groupId: contestId,
      participantId,
      trustWeight: 1.0,
    });

    if (error) {
      return { success: false, error };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error casting battle vote:', err);
    return { success: false, error: err?.message || 'Failed to cast vote' };
  }
}

/**
 * Get the next battle in the feed to enable endless exploring.
 */
export async function getNextBattle(currentContestId: string): Promise<BattleContest | null> {
  try {
    const { data: allContests } = await getContests({ includePausedOrBlocked: false });
    const battles = (allContests || []).filter((c) => c.type === 'battle');

    if (battles.length === 0) return null;

    const currentIndex = battles.findIndex((b) => b.id === currentContestId);
    const nextIndex = (currentIndex + 1) % battles.length;
    const nextContest = battles[nextIndex];

    if (!nextContest) return null;
    return await getBattle(nextContest.id);
  } catch (err) {
    console.error('Error fetching next battle:', err);
    return null;
  }
}
