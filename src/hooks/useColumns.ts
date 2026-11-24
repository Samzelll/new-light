'use client';

import { useSyncExternalStore } from 'react';

const QUERIES = [
  '(min-width: 640px)',
  '(min-width: 1024px)',
  '(min-width: 1440px)',
];

function subscribe(cb: () => void) {
  const list = QUERIES.map((q) => window.matchMedia(q));
  list.forEach((m) => m.addEventListener('change', cb));
  return () => list.forEach((m) => m.removeEventListener('change', cb));
}

const getSnapshot = () =>
  2 + QUERIES.filter((q) => window.matchMedia(q).matches).length;

export const useColumns = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => 2);
