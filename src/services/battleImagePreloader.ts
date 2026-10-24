"use client";

import { useEffect, useState, useCallback } from 'react';
import { schedulePhoto, arePhotosDecoded, withTimeout, CANCELLED } from '@/perf/imageScheduler';
import { FEED_SIZES, photoLoader } from '@/perf/imageUrls';
import { calcPercents } from '@/features/battle-feed/model/calcPercents';
import type { BattleItem, PhotosState, VoteTotals } from '@/types/battle';

export { FEED_SIZES, photoLoader, calcPercents, withTimeout };

/**
 * Preloads and hardware-decodes a photo using the priority image scheduler
 */
export function preloadPhoto(src: string, sizes = FEED_SIZES): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();
  return schedulePhoto(src, { priority: 1, sizes });
}

/**
 * Hook to ensure both photos in a battle are downloaded and decoded before voting is unlocked
 */
export function useBattleReady(battle: BattleItem) {
  const redPhoto = battle.red?.photo;
  const greenPhoto = battle.green?.photo;

  const [state, setState] = useState<PhotosState>(() =>
    arePhotosDecoded([redPhoto, greenPhoto].filter(Boolean) as string[]) ? 'ready' : 'loading',
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const urls = [redPhoto, greenPhoto].filter(Boolean) as string[];

    if (!urls.length) {
      setState('ready');
      return;
    }

    if (!arePhotosDecoded(urls)) {
      setState('loading');
    }

    withTimeout(Promise.all(urls.map((u) => schedulePhoto(u, { priority: 1 }))), 8000)
      .then(() => {
        if (isMounted) setState('ready');
      })
      .catch((e: Error) => {
        if (isMounted && e?.message !== CANCELLED) {
          setState('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [battle.id, redPhoto, greenPhoto, attempt]);

  const retry = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  return { state, retry };
}
