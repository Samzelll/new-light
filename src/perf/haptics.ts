// src/perf/haptics.ts
export const HAPTIC: Record<'vote' | 'unvote' | 'endOfFeed', number | number[]> = {
  vote: 12,
  unvote: [8, 30, 8],
  endOfFeed: 25,
};

export function haptic(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silent fail if vibration disabled by user agent/policy
  }
}
