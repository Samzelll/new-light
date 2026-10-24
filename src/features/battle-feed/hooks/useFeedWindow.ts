// src/features/battle-feed/hooks/useFeedWindow.ts
import { useEffect } from 'react';
import { PROFILE_LIMITS, getProfile } from '@/perf/netProfile';
import { clearPhotoWindow, photoKey, schedulePhoto, setPhotoWindow, type Priority } from '@/perf/imageScheduler';
import type { BattleItem } from '../model/types';

const SCOPE = 'feed';
const BEHIND = 1;

export function useFeedWindow(battles: BattleItem[], activeId: string | null) {
  const found = battles.findIndex((b) => b.id === activeId);
  const activeIndex = found === -1 ? 0 : found;
  const ahead = PROFILE_LIMITS[getProfile()].lookahead;

  useEffect(() => {
    if (!battles.length) return;
    const jobs: Array<{ src: string; priority: Priority }> = [];
    const add = (b: BattleItem | undefined, priority: Priority) => {
      if (!b) return;
      if (b.red?.photo) jobs.push({ src: b.red.photo, priority });
      if (b.green?.photo) jobs.push({ src: b.green.photo, priority });
    };

    add(battles[activeIndex], 0);
    add(battles[activeIndex + 1], 1);
    add(battles[activeIndex - 1], 2);
    for (let i = 2; i <= ahead; i += 1) {
      add(battles[activeIndex + i], i === 2 ? 2 : 3);
    }

    setPhotoWindow(SCOPE, jobs.map((j) => photoKey(j.src))); // protect these, cancel stale queued work
    for (const j of jobs) {
      schedulePhoto(j.src, { priority: j.priority, scope: SCOPE }).catch(() => {});
    }
  }, [battles, activeIndex, ahead]);

  useEffect(() => () => clearPhotoWindow(SCOPE), []);

  return {
    activeIndex,
    first: Math.max(0, activeIndex - BEHIND),
    last: Math.min(battles.length - 1, activeIndex + ahead),
  };
}
