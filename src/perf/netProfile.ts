// src/perf/netProfile.ts
export type Profile = 'low' | 'mid' | 'high';

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
    addEventListener?: (type: 'change', cb: () => void) => void;
  };
};

function detect(): Profile {
  if (typeof navigator === 'undefined') return 'high';
  const n = navigator as NavigatorWithHints;
  const c = n.connection;
  const memory = n.deviceMemory ?? 8;
  const cores = n.hardwareConcurrency ?? 8;

  if (c?.saveData) return 'low';
  if (c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g') return 'low';
  if (memory <= 2) return 'low';
  if (c?.effectiveType === '3g') return 'mid';
  if (memory <= 4 || cores <= 4) return 'mid';
  return 'high';
}

let current: Profile = detect();

if (typeof navigator !== 'undefined') {
  (navigator as NavigatorWithHints).connection?.addEventListener?.('change', () => {
    current = detect();
  });
}

export const getProfile = (): Profile => current;

export const PROFILE_LIMITS: Record<
  Profile,
  { concurrency: number; budgetMB: number; lookahead: number; maxWidth: number }
> = {
  high: { concurrency: 4, budgetMB: 96, lookahead: 3, maxWidth: 1080 },
  mid: { concurrency: 3, budgetMB: 64, lookahead: 2, maxWidth: 750 },
  low: { concurrency: 2, budgetMB: 32, lookahead: 1, maxWidth: 480 },
};
