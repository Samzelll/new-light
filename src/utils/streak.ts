/**
 * Streak utilities — calculates the user's consecutive daily voting streak
 * from their vote history timestamps.
 * 
 * All logic is pure/client-side — no extra DB columns needed.
 * Streak is stored in localStorage for instant display, then verified server-side.
 */

export interface StreakInfo {
  current: number;   // consecutive days including today
  longest: number;   // all-time longest streak
  lastVoteDate: string | null; // ISO date string YYYY-MM-DD
  votedToday: boolean;
  votedYesterday: boolean;
  milestones: number[]; // days at which user hit a milestone
}

const MILESTONES = [3, 7, 14, 30, 60, 100];

function toDateStr(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * Calculate streak from an array of vote timestamps (ISO strings).
 */
export function calculateStreak(voteDates: string[]): StreakInfo {
  if (!voteDates.length) {
    return { current: 0, longest: 0, lastVoteDate: null, votedToday: false, votedYesterday: false, milestones: [] };
  }

  const today = toDateStr(new Date().toISOString());
  const yesterday = toDateStr(new Date(Date.now() - 86_400_000).toISOString());

  // Get unique days, sorted ascending
  const uniqueDays = [...new Set(voteDates.map(toDateStr))].sort();
  const lastVoteDate = uniqueDays[uniqueDays.length - 1];

  const votedToday = lastVoteDate === today;
  const votedYesterday = lastVoteDate === yesterday;

  // Can't be on a streak if last vote was more than 1 day ago
  const activeStreak = votedToday || votedYesterday;

  // Calculate current streak (walk back from most recent day)
  let current = 0;
  if (activeStreak) {
    current = 1;
    for (let i = uniqueDays.length - 2; i >= 0; i--) {
      const diff = daysDiff(uniqueDays[i], uniqueDays[i + 1]);
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak (scan entire history)
  let longest = 0;
  let runLength = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = daysDiff(uniqueDays[i - 1], uniqueDays[i]);
    if (diff === 1) {
      runLength++;
    } else {
      longest = Math.max(longest, runLength);
      runLength = 1;
    }
  }
  longest = Math.max(longest, runLength, current);

  const milestones = MILESTONES.filter((m) => current >= m);

  return { current, longest, lastVoteDate, votedToday, votedYesterday, milestones };
}

/**
 * Get emoji + title for a streak count.
 */
export function getStreakLabel(days: number): { emoji: string; label: string; color: string } {
  if (days >= 100) return { emoji: '🔥', label: 'Legendary',   color: '#ff3b3b' };
  if (days >= 60)  return { emoji: '⚡', label: 'Elite',       color: '#a855f7' };
  if (days >= 30)  return { emoji: '🏆', label: 'Champion',    color: '#ffc857' };
  if (days >= 14)  return { emoji: '💎', label: 'Dedicated',   color: '#00e5a0' };
  if (days >= 7)   return { emoji: '🌟', label: 'Consistent',  color: '#5c87ff' };
  if (days >= 3)   return { emoji: '✨', label: 'On a Roll',   color: '#5c87ff' };
  if (days >= 1)   return { emoji: '🔥', label: 'Warming Up',  color: 'rgb(156,163,175)' };
  return               { emoji: '💤', label: 'Not started',  color: 'rgb(107,114,128)' };
}
