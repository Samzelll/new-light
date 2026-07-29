export interface UserStats {
  activeDays: number;
  contestsVoted: number;
  voteDiversity: number; // uniqueParticipants / totalVotes
}

/**
 * Calculates raw trust score components based on the nightly Edge Function formula.
 * Used client-side for debugging or display previews.
 *
 * Days component (30% weight): activeDays/30 capped at 6.0
 * Contests component (40% weight): contestsVoted/20 capped at 8.0
 * Diversity component (30% weight): voteDiversity (0 to 1) multiplied by 6.0
 */
export function calculateRawTrustScore(
  stats: UserStats,
  currentScore: number = 1.0
): number {
  const daysComponent = Math.min(stats.activeDays / 30, 1) * 6;
  const contestsComponent = Math.min(stats.contestsVoted / 20, 1) * 8;
  const diversityComponent = stats.voteDiversity * 6;

  const rawScore = daysComponent + contestsComponent + diversityComponent;

  // Cap daily growth: max +2 per day
  const maxDailyGrowth = 2.0;
  const newScore = Math.min(rawScore, currentScore + maxDailyGrowth);

  // Score must be between 1.0 and 20.0
  return Math.max(1.0, Math.min(20.0, newScore));
}

/**
 * Resolves trust level metadata based on numerical score.
 */
export function getTrustLevel(score: number): {
  key: 'new' | 'regular' | 'trusted' | 'senior';
  label: string;
  voteWeight: number;
  colorClass: string;
} {
  if (score >= 11.0) {
    return {
      key: 'senior',
      label: 'Senior Member',
      voteWeight: Math.floor(score),
      colorClass: 'badge-purple',
    };
  } else if (score >= 6.0) {
    return {
      key: 'trusted',
      label: 'Trusted Member',
      voteWeight: Math.floor(score),
      colorClass: 'badge-green',
    };
  } else if (score >= 2.0) {
    return {
      key: 'regular',
      label: 'Regular Member',
      voteWeight: Math.floor(score),
      colorClass: 'badge-blue',
    };
  } else {
    return {
      key: 'new',
      label: 'New Member',
      voteWeight: 1,
      colorClass: 'badge-muted',
    };
  }
}
