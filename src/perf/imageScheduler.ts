// src/perf/imageScheduler.ts
import { getImageProps } from 'next/image';
import { PROFILE_LIMITS, getProfile } from './netProfile';
import { FEED_SIZES, photoLoader } from './imageUrls';

/** 0 = active slide · 1 = next · 2 = previous / +2 · 3 = background */
export type Priority = 0 | 1 | 2 | 3;

export interface ScheduleOpts {
  priority: Priority;
  sizes?: string;
  /** Jobs of one scope are cancelled together by setPhotoWindow(scope, keys). */
  scope?: string;
}

export const CANCELLED = 'cancelled';

interface Job {
  key: string;
  src: string;
  sizes: string;
  scope: string;
  priority: Priority;
  seq: number;
  promise: Promise<void>;
  resolve: () => void;
  reject: (e: Error) => void;
}

interface Entry {
  img: HTMLImageElement;
  promise: Promise<void>;
  bytes: number; // 0 until decoded
}

const entries = new Map<string, Entry>(); // insertion order = LRU order, oldest first
const pending: Job[] = [];
const keeps = new Map<string, Set<string>>(); // scope -> keys that must not be evicted or cancelled
let running = 0;
let seq = 0;

export const photoKey = (src: string, sizes: string = FEED_SIZES) => `${src}|${sizes}`;

const isProtected = (key: string) => {
  for (const set of keeps.values()) if (set.has(key)) return true;
  return false;
};

export function schedulePhoto(src: string, opts: ScheduleOpts): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();

  const { priority, sizes = FEED_SIZES, scope = 'feed' } = opts;
  const key = photoKey(src, sizes);

  const hit = entries.get(key);
  if (hit) {
    // already loading or ready: refresh LRU position
    entries.delete(key);
    entries.set(key, hit);
    return hit.promise;
  }

  const queued = pending.find((j) => j.key === key);
  if (queued) {
    // same photo requested again: upgrade priority, never duplicate
    if (priority < queued.priority) queued.priority = priority;
    pump();
    return queued.promise;
  }

  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  pending.push({ key, src, sizes, scope, priority, seq: (seq += 1), promise, resolve, reject });
  pump();
  return promise;
}

export function prefetchPhotos(urls: string[], opts: ScheduleOpts): void {
  for (const url of urls) {
    if (url) schedulePhoto(url, opts).catch(() => {});
  }
}

/** Declare which photos of a scope matter right now. Everything else queued in that scope is cancelled. */
export function setPhotoWindow(scope: string, keys: string[]): void {
  const wanted = new Set(keys);
  keeps.set(scope, wanted);
  for (let i = pending.length - 1; i >= 0; i -= 1) {
    const job = pending[i];
    if (job.scope === scope && !wanted.has(job.key)) {
      pending.splice(i, 1);
      job.reject(new Error(CANCELLED));
    }
  }
}

export function clearPhotoWindow(scope: string): void {
  keeps.delete(scope);
}

export function arePhotosDecoded(urls: string[], sizes: string = FEED_SIZES): boolean {
  if (typeof window === 'undefined') return false;
  return urls.every((u) => !u || (entries.get(photoKey(u, sizes))?.bytes ?? 0) > 0);
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** For DevTools checks: window.__photoStats = getSchedulerStats */
export function getSchedulerStats() {
  let bytes = 0;
  for (const e of entries.values()) bytes += e.bytes;
  return { running, pending: pending.length, entries: entries.size, decodedMB: Math.round(bytes / 1048576) };
}

if (typeof window !== 'undefined') {
  (window as unknown as { __photoStats?: typeof getSchedulerStats }).__photoStats = getSchedulerStats;
}

function pump(): void {
  pending.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  while (pending.length > 0) {
    const next = pending[0];
    const limit = PROFILE_LIMITS[getProfile()].concurrency;
    if (next.priority > 0 && running >= limit) break; // priority 0 never waits
    pending.shift();
    start(next);
  }
}

function start(job: Job): void {
  running += 1;

  let img: HTMLImageElement;
  try {
    // Exactly the srcset the real <Image> will ask for (same loader, same sizes)
    const { props } = getImageProps({ src: job.src, alt: '', fill: true, sizes: job.sizes, loader: photoLoader });
    img = new window.Image();
    img.referrerPolicy = 'no-referrer';
    img.setAttribute('fetchpriority', job.priority === 0 ? 'high' : job.priority >= 2 ? 'low' : 'auto');
    if (props.srcSet) img.srcset = props.srcSet;
    img.sizes = job.sizes;
    img.src = String(props.src);
  } catch (e) {
    running -= 1;
    job.reject(e instanceof Error ? e : new Error('preload failed'));
    return;
  }

  const entry: Entry = { img, promise: job.promise, bytes: 0 };
  entries.set(job.key, entry);

  img
    .decode()
    .then(
      () => {
        entry.bytes = (img.naturalWidth || 1) * (img.naturalHeight || 1) * 4;
        job.resolve();
      },
      (e) => {
        entries.delete(job.key); // allow a retry
        job.reject(e instanceof Error ? e : new Error('decode failed'));
      },
    )
    .finally(() => {
      running -= 1;
      evict();
      pump();
    });
}

function evict(): void {
  const limit = PROFILE_LIMITS[getProfile()].budgetMB * 1024 * 1024;
  let total = 0;
  for (const e of entries.values()) total += e.bytes;

  for (const [key, e] of entries) {
    if (total <= limit) break;
    if (e.bytes === 0 || isProtected(key)) continue; // still loading, or inside a protected window
    entries.delete(key);
    total -= e.bytes;
  }
}
