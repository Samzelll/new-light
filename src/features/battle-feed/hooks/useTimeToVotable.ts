// src/features/battle-feed/hooks/useTimeToVotable.ts
import { useEffect, useRef } from 'react';
import { reportTTV } from '@/perf/metrics';
import type { PhotosState } from './useBattleReady';

/** Reports TTV exactly once per activation of a slide. hit = it was already ready at that moment. */
export function useTimeToVotable(isActive: boolean, state: PhotosState): void {
  const startedAt = useRef<number | null>(null);
  const wasReady = useRef(false);

  useEffect(() => {
    if (!isActive) {
      startedAt.current = null;
      return;
    }
    startedAt.current = performance.now();
    wasReady.current = state === 'ready';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (isActive && state === 'ready' && startedAt.current !== null) {
      reportTTV(performance.now() - startedAt.current, wasReady.current);
      startedAt.current = null;
    }
  }, [isActive, state]);
}
