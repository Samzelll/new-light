// src/features/battle-feed/hooks/useBattleReady.ts
import { useCallback, useEffect, useState } from 'react';
import { CANCELLED, arePhotosDecoded, schedulePhoto, withTimeout } from '@/perf/imageScheduler';
import type { BattleItem } from '../model/types';

export type PhotosState = 'loading' | 'ready' | 'error';

const READY_TIMEOUT_MS = 8000;

export function useBattleReady(battle: BattleItem) {
  const redPhoto = battle.red?.photo;
  const greenPhoto = battle.green?.photo;

  const [state, setState] = useState<PhotosState>(() =>
    arePhotosDecoded([redPhoto, greenPhoto].filter(Boolean) as string[]) ? 'ready' : 'loading',
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const urls = [redPhoto, greenPhoto].filter(Boolean) as string[];

    if (!urls.length) {
      setState('ready');
      return;
    }

    if (!arePhotosDecoded(urls)) setState('loading'); // no flicker when everything is already decoded

    withTimeout(Promise.all(urls.map((u) => schedulePhoto(u, { priority: 1 }))), READY_TIMEOUT_MS)
      .then(() => {
        if (alive) setState('ready');
      })
      .catch((e: Error) => {
        if (alive && e.message !== CANCELLED) setState('error');
      });

    return () => {
      alive = false;
    };
  }, [battle.id, redPhoto, greenPhoto, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
