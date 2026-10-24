// src/features/battle-feed/model/applyLocalVote.ts
import type { BattleItem, Corner } from './types';

/** Mutates an Immer draft or mutable battle item. previous choice -1, new choice +1. Server totals replace this a moment later. */
export function applyLocalVote(b: BattleItem, next: Corner | null): void {
  const prev = b.myVote;
  if (prev === next) return;
  if (prev && b[prev]) b[prev].votes = Math.max(0, (b[prev].votes ?? 0) - 1);
  if (next && b[next]) b[next].votes = (b[next].votes ?? 0) + 1;
  b.myVote = next;
}
