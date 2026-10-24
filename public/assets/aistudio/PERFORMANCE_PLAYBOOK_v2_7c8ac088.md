# Opinion Net — Performance Playbook v2

> Upgrade of `optimization_and_performance_guide.md`.
> Goal: feed screens that feel instant on a mid-range phone, and a repo layout where the fast path is the default path.
> Every module in §7 is complete code you can drop in.

**Assumptions** (if one is wrong, the rest of the plan still holds):
- Next.js ≥ 14.1 (`getImageProps`), React 18, Tailwind.
- RTK Query is the data layer. Mock DB now, Supabase later, switched through the repository layer from `docs/DATA_LAYER.md`.
- Photos live in a public Supabase Storage bucket named `photos`.
- New dependencies: `web-vitals` (runtime), `@lhci/cli` (dev; useful once the repo has CI).

---

## 0. What changed vs v1

1. **Measure first.** v1 states results ("60 FPS", "CLS = 0", "0 ms"). v2 defines budgets and the one metric that matters most for this app: **time-to-votable** (§3).
2. **Fix causes, not symptoms.**
   - The 400 KB vs 1.5 MB photo gap is fixed at upload (fixed-size variants + blur placeholder). The dual-barrier stays only as a safety net.
   - The "feed jumps to the first battle" bug class is fixed in the data layer (RTK Query `isLoading` vs `isFetching`), not with per-screen flags.
3. **A real preloader.** "Load 3 slides ahead" becomes a priority queue with a concurrency cap, cancellation of stale work and a byte-budget LRU (§7.3).
4. **Simple before clever.** `content-visibility: auto` before JS windowing. Fixed image variants before Network-API tricks.
5. **Corrections** to v1 claims that are wrong on iOS or unproven (§2).
6. **A build order** with estimates and acceptance checks (§6), plus guard rails that keep the structure from rotting (§7.11).

### Status of v1 work

| v1 item | Verdict | What happens in v2 |
| :--- | :---: | :--- |
| CSS scroll-snap feeds | Keep | Drop `-webkit-overflow-scrolling`, add `content-visibility` (§7.6) |
| Scroll anchoring (`activeBattleId` + `useLayoutEffect`) | Keep | Second line of defence. First line: no remount on refetch (§7.8) |
| `battleImagePreloader.ts` + `useBattleReady` | Replace | Scheduler (§7.3) + hook (§7.5) |
| Lookahead +1/+2/+3 | Replace | Priorities, cancellation, depth by device profile (§7.6) |
| `LazyImage.tsx`, `LazyScrollTrigger.tsx` | Keep | Route all URLs through `photoLoader`, add blur placeholder (§7.2) |
| Local votes, `calcPercents`, unvote | Keep | Moves into an RTK cache patch + one server RPC returning totals (§7.8, §7.9) |
| Haptics, network-adaptive quality, Blurhash worker, offline, realtime | Reworked | §2 and §9 |

---

## 1. Principles (the whole plan in six lines)

1. Position is an **id**, never an index.
2. Refetch is **not** loading. A skeleton is shown only when there is no data at all.
3. Every image goes through **one door**: `photoLoader` for URLs, `imageScheduler` for fetching.
4. Photos are **normalized at upload** (480 / 750 / 1080 px, immutable cache headers, blur placeholder, stored dimensions).
5. The server is **authoritative** for votes and returns fresh totals in the same round trip.
6. Anything performance-critical **emits a metric**; anything with a budget **fails CI** when it regresses.

---

## 2. Corrections to v1 claims

| # | v1 claim | Reality | v2 action |
| :-: | :--- | :--- | :--- |
| 1 | "60 FPS", "CLS = 0", "0 ms", "100% protection" | Nothing is measured, so none of it can be verified or defended | Budgets (§3), `reportTTV`, Lighthouse CI |
| 2 | `-webkit-overflow-scrolling: touch` is part of the fast scroll | Ignored by iOS 13+ (momentum scrolling is the default) | Remove it |
| 3 | `decode()` puts the image "in VRAM"; the pinned `Map` prevents GC | `decode()` produces a decoded bitmap in memory, not guaranteed on the GPU. Browsers may drop decoded data of off-screen images. Pinning keeps the element alive, not the bitmap | Treat as best-effort. Rely on HTTP cache + a small mounted window + byte-budget LRU |
| 4 | `MAX_PINNED = 16`, FIFO eviction | A decoded 1080×1350 image is about 5.6 MB, so 16 ≈ 90 MB. FIFO can evict the active slide's photos | Byte budget per device profile, LRU, window is protected (§7.3) |
| 5 | Lookahead loop fires all requests at once | 6+ parallel requests compete with the active slide. Fast swipes leave stale requests running | Priority queue, concurrency cap, cancel un-started jobs (§7.3) |
| 6 | Dual-barrier solves "400 KB vs 1.5 MB" | It hides the asymmetry. The cause is the file-size spread | Normalize at upload (§7.7). Keep the barrier as a safety net |
| 7 | Skeleton remount fixed with `isInitial = false` | A patch on a custom event bus (`mockdb:updated` → refetch). It will come back on the next screen | RTK Query: `isLoading` vs `isFetching`, vote patches one item in cache, no refetch (§7.8) |
| 8 | Haptics via `navigator.vibrate` on "Android/iOS" | iOS Safari does not implement the Vibration API | Feature-detect, Android only (§7.6). iOS needs a native wrapper |
| 9 | Adaptive quality via `navigator.connection` | Chromium-only, `effectiveType` is coarse | Progressive enhancement only: default profile is `high` when the API is missing. Real fix is small variants |
| 10 | Blurhash computed in a Web Worker | A 16 px placeholder is trivial to decode. A worker adds complexity for nothing | Compute once at upload, store a ~300–600 B WebP data URL, use `placeholder="blur"` |
| 11 | Offline voting with Background Sync | Background Sync is not in Safari/iOS. Votes also depend on server rules (daily cycle, trust weights) | Drop offline voting. Optional image cache only (§9) |
| 12 | Manual 5-slide DOM windowing is P1 | Most of the benefit comes from a one-line CSS change | `content-visibility: auto` first. JS windowing only if DOM/memory metrics fail |
| 13 | `quality = 85` at 1080 px for everyone | 75–78 WebP is visually near-identical and noticeably lighter | 78 at 1080, 75 at 750/480 (§7.7) |

---

## 3. Performance budgets

Starting targets. Calibrate them after Phase 0 on real devices, then keep them in `docs/performance/BUDGETS.md`.

| Metric | Target | How it is measured |
| :--- | :--- | :--- |
| LCP, first feed screen (p75) | ≤ 2.5 s | `web-vitals` field data + Lighthouse |
| INP (p75) | ≤ 200 ms | `web-vitals` |
| CLS | ≤ 0.1 (aim for 0) | `web-vitals` |
| **Time-to-votable (TTV)**, slides after the first (p75) | ≤ 300 ms, hit-rate ≥ 90% | `reportTTV` (§7.5). Hit = both photos were already decoded when the slide became active |
| TTV, first slide on Fast 4G | ≤ 1.5 s | `reportTTV` |
| Vote tap → visible feedback | ≤ 100 ms | Optimistic cache patch |
| Vote RPC latency (p95) | ≤ 500 ms | `reportVoteLatency` |
| Scroll smoothness | No frame > 50 ms during a 60 s scripted scroll at 4× CPU throttle | Chrome Performance panel |
| Initial JS of the feed route (transfer) | ≤ 200 KB | Lighthouse CI |
| Photo weight | 1080 ≤ 250 KB, 750 ≤ 150 KB, 480 ≤ 70 KB. Pair ratio ≤ 2× | Upload pipeline check (§7.7) |
| Decoded-image memory | ≤ 96 / 64 / 32 MB (high / mid / low profile) | Scheduler budget |
| DOM nodes after 100 slides | ≤ 1,500 | DevTools: `document.querySelectorAll('*').length` |

---

## 4. Target architecture

```
┌──────────────────────────── UI ────────────────────────────┐
│  BattleFeed · BattleSlide · PhotoCard · Lightbox            │
│  render + gestures only, no fetching, no Supabase           │
└───────────────┬──────────────────────────┬─────────────────┘
                │ RTK Query hooks          │ perf hooks
┌───────────────▼──────────────┐  ┌────────▼──────────────────┐
│ Data layer  (src/data)       │  │ Perf layer  (src/perf)    │
│ cache keyed by id            │  │ imageScheduler (queue,    │
│ isLoading ≠ isFetching       │  │   LRU, cancel)            │
│ optimistic patch of 1 item   │  │ imageUrls (photoLoader)   │
│ repositories (interfaces)    │  │ netProfile · metrics      │
└───────────────┬──────────────┘  └────────┬──────────────────┘
                │                          │ HTTP, immutable cache
┌───────────────▼──────────────┐  ┌────────▼──────────────────┐
│ mock (with latency)          │  │ Storage: 480 / 750 / 1080 │
│ or Supabase (tables + RPC)   │  │ + blur + dimensions       │
└──────────────────────────────┘  └───────────────────────────┘
```

**Rules** (enforced by §7.11):
1. UI never imports `mockDb`, repositories or `@supabase/*`. It only uses RTK Query hooks.
2. Nobody calls `new Image()` or builds image URLs by hand. Use `photoLoader` and `schedulePhoto`.
3. List keys and scroll position are ids.
4. A vote patches one item in the cache. It never refetches the feed.
5. Every new feed/screen declares its budget and emits its metric before it is merged.
6. Mock repositories simulate latency and failures, so performance bugs show up before Supabase does.

---

## 5. Repo structure

```
src/
  app/
    api/perf/route.ts                 # metrics beacon endpoint (validated, size-capped)
    layout.tsx                        # <PerfInit />, preconnect to the image host
    (routes)/…                        # thin pages: compose features only
  features/
    battle-feed/
      components/   BattleFeedContainer.tsx  BattleFeed.tsx  BattleSlide.tsx  PhotoCard.tsx
      hooks/        useFeedWindow.ts  useBattleReady.ts  useTimeToVotable.ts  useVote.ts  useActiveSlide.ts
      model/        types.ts  applyLocalVote.ts  calcPercents.ts
    group-feed/                       # same shape, 4 photos per slide
    contest-catalog/                  # LazyImage, LazyScrollTrigger
    lightbox/       PhotoLightbox.tsx  LightboxImage.tsx
  data/                               # the ONLY place that knows mock vs Supabase
    api/            battlesApi.ts                      # RTK Query endpoints
    repositories/   types.ts  battles.ts  votes.ts  contests.ts   # interfaces + env switch
    mock/           mockDb.ts  latency.ts
    supabase/       client.ts  battlesRepo.ts  votesRepo.ts  uploadPhoto.ts
  perf/
    netProfile.ts  imageUrls.ts  imageScheduler.ts  photoPipeline.ts  metrics.ts  haptics.ts  PerfInit.tsx
supabase/migrations/                  # photo columns, vote RPC, totals view
docs/performance/                     # BASELINE.md, BUDGETS.md
lighthouserc.json                     # when CI exists
```

`useActiveSlide.ts` is your existing IntersectionObserver + `activeId` + `useLayoutEffect` anchoring from v1. Move it, do not rewrite it.

---

## 6. Build order

Estimates are for one developer.

| Phase | Work | Days | Acceptance check |
| :---: | :--- | :-: | :--- |
| **0** | **Baseline.** Add `PerfInit`, `initWebVitals`, `useTimeToVotable` (§7.4, §7.5). Record LCP / INP / TTV on 2 devices × (Fast 4G, Slow 4G) into `docs/performance/BASELINE.md` | 0.5–1 | Baseline table committed. Budgets in §3 calibrated against it |
| **1** | **Quick wins.** `preconnect` to the image host. `fetchpriority` (done inside the scheduler). Remove `-webkit-overflow-scrolling`. `content-visibility` on slides. Lightbox with a reserved frame (§7.6). Haptics feature-detect | 1 | Lightbox never shows a tiny photo in an empty frame. No layout shift when it opens |
| **2** | **Scheduler.** Replace `preloadPhoto` and the lookahead effect with `imageScheduler` + `useFeedWindow` + new `useBattleReady`. Group feed uses the same scheduler for 4 photos | 1.5–2 | Scripted 30-slide scroll on Fast 4G: TTV hit-rate ≥ 90%. Each image URL requested once. The active slide's images start first in the Network waterfall |
| **3** | **Photo pipeline.** Variants + blur + dimensions at upload (`photoPipeline.ts`), `photoLoader`, migration, backfill of existing photos. Legacy URLs pass through unchanged | 3–3.5 | 1080 variant ≤ 250 KB. Pair ratio ≤ 2×. Blur visible before the photo. CLS 0 on feed and lightbox |
| **4** | **Data layer.** `battlesApi` (merge + forceRefetch), optimistic `setBattleVote` + RPC, remove `mockdb:updated` listeners and `setLoadingBattles(true)` on refetch, add `simulateNetwork` to mocks | 2–3 | With mock latency 1500 ms and `chaos=1`: vote keeps the position, exactly one request per vote, tab switch returns to the same battle |
| **5** | **Reach.** Prefetch on contest page, profile, admin queue, search (§8). Group feed uses 480 / 750 variants with `GRID_SIZES` | 1–2 | Each screen in §8 opens with its first photos already decoded |
| **6** | **Only if metrics demand it.** JS windowing, throttled realtime counters, image SWR cache (§9) | — | Triggered by a failed budget, not by taste |

### Priorities vs v1

| Initiative | v1 | v2 | Why |
| :--- | :-: | :-: | :--- |
| Baseline + metrics | — | **P0** | Without numbers every other priority is a guess |
| Lightbox fix | P0 | **P0** | Cheap, and visible in the screenshot of the lightbox (tiny photo in a large empty frame) |
| Scheduler + LRU | — | **P0** | Replaces the weakest part of v1 |
| Photo pipeline + blur | P3 | **P1** | It is the root cause of the TTV asymmetry. Blur moves from P3 to P1 because it is cheap once the pipeline exists |
| Data layer (RTK Query + RPC) | — | **P1** | Removes the whole "feed resets" class of bugs |
| Contest page / profile / admin / search prefetch | P1 | P2 | Needs the scheduler first |
| Haptics | P1 | P2 | One hour, Android only |
| JS DOM windowing | P1 | P3 | `content-visibility` first |
| Network-adaptive quality | P2 | Folded in | Becomes `netProfile` inside the scheduler |
| PWA offline / Background Sync | P2 | **Dropped** | See §2 #11 |
| Realtime counters | — | P3 | §9 |

---

## 7. Code

All paths follow §5. Install once: `npm i web-vitals`.

### 7.1 `src/perf/netProfile.ts` — device/network profile

`navigator.connection` and `navigator.deviceMemory` exist only in Chromium. Missing API means `high`, so Safari behaves as before and Android gets the savings.

```ts
// src/perf/netProfile.ts
export type Profile = 'high' | 'mid' | 'low';

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
```

### 7.2 `src/perf/imageUrls.ts` — the one door for image URLs

Our uploads are stored as `.../<id>/1080.webp` (or `.jpg`). The loader swaps the number for the right variant and caps it by device profile. Legacy and unknown URLs pass through unchanged (Next.js prints a dev-only warning for pass-through URLs: ignore it).

The feed renders client-side from RTK Query, so the profile-dependent `srcset` causes no hydration mismatch. If you ever server-render a photo grid, pin the profile to `high` on the server.

```ts
// src/perf/imageUrls.ts
import { PROFILE_LIMITS, getProfile } from './netProfile';

export const VARIANT_WIDTHS = [480, 750, 1080] as const;

export const FEED_SIZES = '(max-width: 640px) 100vw, 480px'; // 1v1 battle card
export const GRID_SIZES = '(max-width: 640px) 50vw, 240px'; // 2x2 group cells, catalog tiles

const OWN_VARIANT = /^(.*\/)(?:480|750|1080)(\.[a-z0-9]+)$/i;

function pickVariant(width: number): number {
  const capped = Math.min(width, PROFILE_LIMITS[getProfile()].maxWidth);
  return VARIANT_WIDTHS.find((w) => w >= capped) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}

// Use as <Image loader={photoLoader} … /> and inside getImageProps(). Client code only.
export function photoLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const w = pickVariant(width);

  // 1) Our own uploads: .../<id>/1080.webp -> .../<id>/<w>.webp
  const own = src.match(OWN_VARIANT);
  if (own) return `${own[1]}${w}${own[2]}`;

  // 2) Mock data on Unsplash: the CDN resizes for us
  if (src.includes('images.unsplash.com')) {
    const url = new URL(src);
    url.searchParams.set('w', String(w));
    url.searchParams.set('q', '75');
    url.searchParams.set('fm', 'webp');
    return url.toString();
  }

  // 3) Anything else: as is
  return src;
}
```

Every `<Image>` that shows a participant photo uses the same two props, so the preloader and the real element request the same URL:

```tsx
<Image src={photo} alt={name} fill loader={photoLoader} sizes={FEED_SIZES}
       placeholder={blurDataURL ? 'blur' : 'empty'} blurDataURL={blurDataURL} />
```

With a custom loader Next.js no longer runs its own optimizer for these images, so remove `shouldBeUnoptimized` / `unoptimized` from them.

### 7.3 `src/perf/imageScheduler.ts` — priority queue + byte-budget LRU

What it does:
- One request per URL (shared promise). A later call with a higher priority upgrades the queued job.
- Priority 0 (the active slide) never waits. Everything else respects the concurrency cap of the device profile.
- `setPhotoWindow(scope, keys)` cancels queued jobs of that scope that are no longer needed (fast swipes) and protects the window from eviction.
- Eviction is LRU by decoded bytes (`naturalWidth × naturalHeight × 4`) against the profile budget.
- Sets `fetchpriority` on the preload element.

```ts
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
  for (const url of urls) schedulePhoto(url, opts).catch(() => {});
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
  return urls.every((u) => (entries.get(photoKey(u, sizes))?.bytes ?? 0) > 0);
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
        entry.bytes = img.naturalWidth * img.naturalHeight * 4;
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
```

### 7.4 Metrics: `src/perf/metrics.ts`, `PerfInit.tsx`, `app/api/perf/route.ts`

Logs to the console in development (that is your Phase 0 baseline) and samples 20% of sessions in production. The endpoint accepts only whitelisted names and tiny bodies, which matches the bot-attack concern. Add IP rate limiting before storing anything.

```ts
// src/perf/metrics.ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { getProfile } from './netProfile';

const SAMPLE_RATE = 0.2;
const sampled = typeof window !== 'undefined' && Math.random() < SAMPLE_RATE;

type Extra = Record<string, string | number | boolean>;

function send(name: string, value: number, extra: Extra = {}): void {
  if (typeof window === 'undefined') return;
  const payload = { name, value: Math.round(value * 100) / 100, profile: getProfile(), path: location.pathname, ...extra };

  if (process.env.NODE_ENV !== 'production') console.debug('[perf]', payload);
  if (!sampled || process.env.NODE_ENV !== 'production') return;

  const body = JSON.stringify(payload);
  const ok = navigator.sendBeacon?.('/api/perf', new Blob([body], { type: 'application/json' }));
  if (!ok) {
    fetch('/api/perf', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
  }
}

export function initWebVitals(): void {
  const report = (m: Metric) => send(m.name, m.value, { rating: m.rating });
  onLCP(report);
  onINP(report);
  onCLS(report);
}

/** Time from "slide became active" to "both photos decoded and voting enabled". */
export const reportTTV = (ms: number, hit: boolean) => send('TTV', ms, { hit });

/** Round trip of the vote request. */
export const reportVoteLatency = (ms: number, ok: boolean) => send('VOTE_LATENCY', ms, { ok });
```

```tsx
// src/perf/PerfInit.tsx
'use client';

import { useEffect } from 'react';
import { initWebVitals } from './metrics';

export function PerfInit() {
  useEffect(() => {
    initWebVitals();
  }, []);
  return null;
}
```

```ts
// src/app/api/perf/route.ts
import { NextResponse } from 'next/server';

const ALLOWED = new Set(['LCP', 'INP', 'CLS', 'TTV', 'VOTE_LATENCY']);

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 1024) return new NextResponse(null, { status: 413 });

  let m: { name?: unknown; value?: unknown };
  try {
    m = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof m.name !== 'string' || !ALLOWED.has(m.name) || typeof m.value !== 'number' || !Number.isFinite(m.value)) {
    return new NextResponse(null, { status: 400 });
  }

  // TODO: rate-limit by IP here, then log or batch-insert (e.g. a `perf_events` table via the service role).
  return new NextResponse(null, { status: 204 });
}
```

### 7.5 Hooks: `useBattleReady.ts`, `useTimeToVotable.ts`

The slide is votable only when **both** photos are decoded. A `cancelled` rejection (stale work dropped by the scheduler) never shows an error state.

```ts
// src/features/battle-feed/hooks/useBattleReady.ts
import { useCallback, useEffect, useState } from 'react';
import { CANCELLED, arePhotosDecoded, schedulePhoto, withTimeout } from '@/perf/imageScheduler';
import type { BattleItem } from '../model/types';

export type PhotosState = 'loading' | 'ready' | 'error';

const READY_TIMEOUT_MS = 8000;

export function useBattleReady(battle: BattleItem) {
  const redPhoto = battle.red.photo;
  const greenPhoto = battle.green.photo;

  const [state, setState] = useState<PhotosState>(() =>
    arePhotosDecoded([redPhoto, greenPhoto]) ? 'ready' : 'loading',
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    const urls = [redPhoto, greenPhoto];

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
```

```ts
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
```

### 7.6 Feed window, slide markup, lightbox, haptics, layout

**`useFeedWindow.ts`** decides what is mounted and what is preloaded, from one place. Mounted slides are always a subset of the protected window, so a mounted slide can never lose its photos to cancellation.

```ts
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
    const jobs: Array<{ src: string; priority: Priority }> = [];
    const add = (b: BattleItem | undefined, priority: Priority) => {
      if (!b) return;
      jobs.push({ src: b.red.photo, priority }, { src: b.green.photo, priority });
    };

    add(battles[activeIndex], 0);
    add(battles[activeIndex + 1], 1);
    add(battles[activeIndex - 1], 2);
    for (let i = 2; i <= ahead; i += 1) add(battles[activeIndex + i], i === 2 ? 2 : 3);

    setPhotoWindow(SCOPE, jobs.map((j) => photoKey(j.src))); // protect these, cancel stale queued work
    for (const j of jobs) schedulePhoto(j.src, { priority: j.priority, scope: SCOPE }).catch(() => {});
  }, [battles, activeIndex, ahead]);

  useEffect(() => () => clearPhotoWindow(SCOPE), []);

  return {
    activeIndex,
    first: Math.max(0, activeIndex - BEHIND),
    last: Math.min(battles.length - 1, activeIndex + ahead),
  };
}
```

**Slide markup** (inside `BattleFeed.tsx`). `content-visibility: auto` lets the browser skip layout and paint for off-screen slides. Sections stay in the DOM with fixed height, so scroll-snap, `data-battle-id` anchoring and the IntersectionObserver keep working.

```tsx
const { first, last } = useFeedWindow(battles, activeId);

<div
  ref={scrollerRef}
  className="h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain
             [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
>
  {battles.map((battle, i) => (
    <section
      key={battle.id}
      data-battle-id={battle.id}
      className="h-full w-full shrink-0 snap-start snap-always
                 [content-visibility:auto] [contain-intrinsic-size:auto_100dvh]"
    >
      {i >= first && i <= last && (
        <BattleSlide battle={battle} isActive={battle.id === activeId} onVote={onVote} />
      )}
    </section>
  ))}
</div>
```

Wrap `BattleSlide` in `memo`. RTK Query keeps references of untouched items, so a vote re-renders one slide:

```tsx
export const BattleSlide = memo(
  function BattleSlide({ battle, isActive, onVote }: Props) {
    const { state, retry } = useBattleReady(battle);
    useTimeToVotable(isActive, state);
    const canVote = isActive && state === 'ready';
    // …render cards; onTap = canVote ? () => onVote(battle, corner) : undefined
  },
  (a, b) => a.battle === b.battle && a.isActive === b.isActive && a.onVote === b.onVote,
);
```

**Lightbox image.** The frame gets its size from stored `width` / `height` before the image arrives, so nothing jumps and no tiny photo floats in an empty area. It uses the same loader and `sizes` as the feed, so the photo is usually already in cache.

```tsx
// src/features/lightbox/LightboxImage.tsx
import Image from 'next/image';
import { FEED_SIZES, photoLoader } from '@/perf/imageUrls';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
}

export function LightboxImage({ src, alt, width, height, blurDataURL }: Props) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-neutral-900"
      style={{ aspectRatio: `${width} / ${height}`, maxHeight: '75dvh' }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        loader={photoLoader}
        sizes={FEED_SIZES}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL}
        priority
        className="object-contain"
      />
    </div>
  );
}
```

Zoom beyond the 1080 px variant would look soft. If pinch-zoom sharpness matters later, add a 1600 variant and a `ZOOM_SIZES` constant (§9).

**Haptics**: Android Chrome only. iOS Safari has no Vibration API, so this is a silent no-op there.

```ts
// src/perf/haptics.ts
export const HAPTIC: Record<'vote' | 'unvote' | 'endOfFeed', number | number[]> = {
  vote: 12,
  unvote: [8, 30, 8],
  endOfFeed: 25,
};

export function haptic(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}
```

**Layout**: preconnect to the image host and mount the metrics initializer.

```tsx
// src/app/layout.tsx (fragment)
<head>
  <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
  {/* only while mocks use Unsplash: */}
  <link rel="preconnect" href="https://images.unsplash.com" />
</head>
<body>
  <PerfInit />
  {children}
</body>
```

### 7.7 Photo pipeline: `src/perf/photoPipeline.ts` + `src/data/supabase/uploadPhoto.ts`

This is the root-cause fix for "one photo 400 KB, the other 1.5 MB". At upload time every photo becomes three variants within a byte budget, plus a tiny blur placeholder, a dominant color and stored dimensions.

- WebP when the browser can encode it. Safari's canvas silently falls back to PNG for `image/webp`, so the format is probed once and JPEG is used for all variants when WebP is not available.
- Only derivatives are stored. What moderators see is what users get.
- Paths are unique per upload, so files are immutable and get a one-year cache header.

```ts
// src/perf/photoPipeline.ts  (pure browser code, no Supabase)
import { VARIANT_WIDTHS } from './imageUrls';

type Format = { ext: 'webp' | 'jpg'; mime: 'image/webp' | 'image/jpeg' };

export interface ProcessedPhoto extends Format {
  width: number; // after EXIF rotation
  height: number;
  variants: Record<number, Blob>; // 480 / 750 / 1080
  blurDataURL: string;
  dominantColor: string;
}

const BUDGET_BYTES: Record<number, number> = { 480: 70_000, 750: 150_000, 1080: 250_000 };

function canvasOf(bitmap: ImageBitmap, targetWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, targetWidth / bitmap.width); // never upscale
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, quality),
  );
}

let formatPromise: Promise<Format> | null = null;
function pickFormat(): Promise<Format> {
  formatPromise ??= (async (): Promise<Format> => {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const blob = await toBlob(probe, 'image/webp', 0.8);
    return blob.type === 'image/webp'
      ? { ext: 'webp', mime: 'image/webp' }
      : { ext: 'jpg', mime: 'image/jpeg' };
  })();
  return formatPromise;
}

async function encode(canvas: HTMLCanvasElement, mime: string, width: number): Promise<Blob> {
  let quality = width >= 1080 ? 0.78 : 0.75;
  let blob = await toBlob(canvas, mime, quality);
  while (blob.size > BUDGET_BYTES[width] && quality > 0.5) {
    quality -= 0.07; // squeeze until the variant fits its budget
    blob = await toBlob(canvas, mime, quality);
  }
  return blob;
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const [format, bitmap] = await Promise.all([
    pickFormat(),
    createImageBitmap(file, { imageOrientation: 'from-image' }),
  ]);

  try {
    const variants: Record<number, Blob> = {};
    for (const w of VARIANT_WIDTHS) variants[w] = await encode(canvasOf(bitmap, w), format.mime, w);

    const blurDataURL = canvasOf(bitmap, 16).toDataURL(format.mime, 0.5);

    const px = document.createElement('canvas');
    px.width = 1;
    px.height = 1;
    const pctx = px.getContext('2d');
    if (!pctx) throw new Error('2D canvas is not available');
    pctx.drawImage(bitmap, 0, 0, 1, 1);
    const [r, g, b] = pctx.getImageData(0, 0, 1, 1).data;
    const hex = (v: number) => v.toString(16).padStart(2, '0');

    return {
      ...format,
      width: bitmap.width,
      height: bitmap.height,
      variants,
      blurDataURL,
      dominantColor: `#${hex(r)}${hex(g)}${hex(b)}`,
    };
  } finally {
    bitmap.close();
  }
}
```

```ts
// src/data/supabase/uploadPhoto.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { VARIANT_WIDTHS } from '@/perf/imageUrls';
import type { ProcessedPhoto } from '@/perf/photoPipeline';

export interface UploadedPhoto {
  url: string; // public URL of the 1080 variant: this is what goes into `photo`
  width: number;
  height: number;
  blurDataURL: string;
  dominantColor: string;
}

export async function uploadProcessedPhoto(
  supabase: SupabaseClient,
  ownerId: string,
  photo: ProcessedPhoto,
): Promise<UploadedPhoto> {
  const base = `${ownerId}/${crypto.randomUUID()}`; // bucket policy: first path segment = auth.uid()
  const bucket = supabase.storage.from('photos');
  const paths = VARIANT_WIDTHS.map((w) => `${base}/${w}.${photo.ext}`);

  const results = await Promise.all(
    VARIANT_WIDTHS.map((w, i) =>
      bucket.upload(paths[i], photo.variants[w], {
        contentType: photo.mime,
        cacheControl: '31536000', // 1 year: unique path per upload = immutable content
        upsert: false,
      }),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    await bucket.remove(paths); // best-effort cleanup of partial uploads
    throw failed.error;
  }

  const { data } = bucket.getPublicUrl(paths[paths.length - 1]); // 1080 variant
  return {
    url: data.publicUrl,
    width: photo.width,
    height: photo.height,
    blurDataURL: photo.blurDataURL,
    dominantColor: photo.dominantColor,
  };
}
```

**Backfill of existing photos** (one-off, Node, `sharp`): download each current photo, produce the same three variants (WebP q78/75/75), upload to `photos/<owner>/<uuid>/{480,750,1080}.webp`, write `photo`, `photo_width`, `photo_height`, `photo_blur`, `photo_color`. Until a photo is backfilled, its old URL keeps working through the loader's pass-through branch.

### 7.8 Data layer: RTK Query feed, optimistic vote, container

This is what ends the "feed jumps to the first battle" class of bugs:
- One cache entry for the whole feed. Pages are merged in, deduplicated by id, only appended.
- `isLoading` is true only while there is **no data**. Background work is `isFetching` and never shows a skeleton.
- A vote patches **one item** of the cache. Untouched items keep their object identity, so only one slide re-renders.
- The feed is never refetched because of a vote.

Align names with `docs/DATA_LAYER.md`. If the contract there differs, change the repository types, not the feature code.

```ts
// src/features/battle-feed/model/types.ts   (extend with bio, sponsor, prize, etc.)
export type Corner = 'red' | 'green';

export interface Competitor {
  id: string; // participant id
  name: string;
  handle: string;
  photo: string; // URL of the 1080 variant (or a legacy URL)
  width: number;
  height: number;
  blurDataURL?: string;
  dominantColor?: string;
  votes: number; // weighted votes, from the server
}

export interface BattleItem {
  id: string;
  contestId: string;
  red: Competitor;
  green: Competitor;
  myVote: Corner | null;
}

export interface FeedPage {
  items: BattleItem[];
  nextCursor: string | null;
}

export type VoteTotals = Record<string, number>; // participantId -> weighted votes
```

```ts
// src/features/battle-feed/model/applyLocalVote.ts
import type { BattleItem, Corner } from './types';

/** Mutates an Immer draft. previous choice -1, new choice +1. Server totals replace this a moment later. */
export function applyLocalVote(b: BattleItem, next: Corner | null): void {
  const prev = b.myVote;
  if (prev === next) return;
  if (prev) b[prev].votes = Math.max(0, b[prev].votes - 1);
  if (next) b[next].votes += 1;
  b.myVote = next;
}
```

```ts
// src/features/battle-feed/model/calcPercents.ts
export function calcPercents(red: number, green: number) {
  const total = red + green;
  if (total <= 0) return { red: 50, green: 50 };
  const r = Math.round((red / total) * 100);
  return { red: r, green: 100 - r };
}
```

```ts
// src/data/repositories/types.ts
import type { FeedPage, VoteTotals } from '@/features/battle-feed/model/types';

export interface BattlesRepo {
  /** Must return myVote and weighted totals from an aggregate (battle_vote_totals), never raw vote rows. */
  getPage(args: { cursor: string | null; limit: number }): Promise<FeedPage>;
}

export interface VotesRepo {
  /** participantId = null removes the vote. Resolves with fresh weighted totals of the contest. */
  setVote(contestId: string, participantId: string | null): Promise<VoteTotals>;
}
```

```ts
// src/data/repositories/battles.ts
import { mockBattlesRepo } from '@/data/mock/mockDb';
import { supabaseBattlesRepo } from '@/data/supabase/battlesRepo';
import type { BattlesRepo } from './types';

export const battlesRepo: BattlesRepo =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' ? supabaseBattlesRepo : mockBattlesRepo;
```

```ts
// src/data/repositories/votes.ts
import { mockVotesRepo } from '@/data/mock/mockDb';
import { supabaseVotesRepo } from '@/data/supabase/votesRepo';
import type { VotesRepo } from './types';

export const votesRepo: VotesRepo =
  process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' ? supabaseVotesRepo : mockVotesRepo;
```

```ts
// src/data/supabase/votesRepo.ts   (assumes ./client exports your existing `supabase` client)
import { supabase } from './client';
import type { VotesRepo } from '../repositories/types';

export const supabaseVotesRepo: VotesRepo = {
  async setVote(contestId, participantId) {
    const { data, error } = await supabase.rpc('set_battle_vote', {
      p_contest_id: contestId,
      p_participant_id: participantId,
    });
    if (error) throw error;

    const totals: Record<string, number> = {};
    for (const row of data ?? []) totals[row.out_participant_id] = Number(row.out_votes);
    return totals;
  },
};
```

```ts
// src/data/api/battlesApi.ts   (register reducer + middleware in your store as usual)
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { battlesRepo } from '@/data/repositories/battles';
import { votesRepo } from '@/data/repositories/votes';
import { reportVoteLatency } from '@/perf/metrics';
import type { FeedPage, VoteTotals } from '@/features/battle-feed/model/types';

const PAGE_SIZE = 10;

export const battlesApi = createApi({
  reducerPath: 'battlesApi',
  baseQuery: fakeBaseQuery<string>(),
  endpoints: (build) => ({
    // One cache entry for the whole feed; pages are merged into it.
    getBattlePage: build.query<FeedPage, { cursor: string | null }>({
      async queryFn({ cursor }) {
        try {
          return { data: await battlesRepo.getPage({ cursor, limit: PAGE_SIZE }) };
        } catch (e) {
          return { error: String(e) };
        }
      },
      // Add the active filter/tab here when feeds get filters.
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (cache, incoming, { arg }) => {
        if (!arg.cursor) {
          cache.items = incoming.items;
        } else {
          const seen = new Set(cache.items.map((b) => b.id));
          for (const b of incoming.items) if (!seen.has(b.id)) cache.items.push(b); // append only, no duplicates
        }
        cache.nextCursor = incoming.nextCursor;
      },
      // Only "load more" fetches. Remounting with cursor = null must NOT refetch page one.
      forceRefetch: ({ currentArg, previousArg }) =>
        !!currentArg?.cursor && currentArg.cursor !== previousArg?.cursor,
      keepUnusedDataFor: 300,
    }),

    setBattleVote: build.mutation<VoteTotals, { contestId: string; participantId: string | null }>({
      async queryFn({ contestId, participantId }) {
        const t0 = performance.now();
        try {
          const data = await votesRepo.setVote(contestId, participantId);
          reportVoteLatency(performance.now() - t0, true);
          return { data };
        } catch (e) {
          reportVoteLatency(performance.now() - t0, false);
          return { error: String(e) };
        }
      },
      // No invalidatesTags on purpose: a vote must never refetch the feed.
    }),
  }),
});

export const { useGetBattlePageQuery, useSetBattleVoteMutation } = battlesApi;
```

```ts
// src/features/battle-feed/hooks/useVote.ts
'use client';

import { useCallback, useRef } from 'react';
import { battlesApi, useSetBattleVoteMutation } from '@/data/api/battlesApi';
import { useAppDispatch } from '@/store/hooks'; // your typed useDispatch (RTK convention)
import { HAPTIC, haptic } from '@/perf/haptics';
import { applyLocalVote } from '../model/applyLocalVote';
import type { BattleItem, Corner } from '../model/types';

export function useVote() {
  const dispatch = useAppDispatch();
  const [setBattleVote] = useSetBattleVoteMutation();
  const pending = useRef(new Set<string>());

  return useCallback(
    async (battle: BattleItem, corner: Corner) => {
      if (pending.current.has(battle.id)) return; // one request per battle at a time: no races, no duplicates
      pending.current.add(battle.id);

      const next: Corner | null = battle.myVote === corner ? null : corner; // second tap = unvote
      haptic(next ? HAPTIC.vote : HAPTIC.unvote);

      // 1) instant UI: patch only this battle in the cache
      const patch = dispatch(
        battlesApi.util.updateQueryData('getBattlePage', { cursor: null }, (draft) => {
          const item = draft.items.find((b) => b.id === battle.id);
          if (item) applyLocalVote(item, next);
        }),
      );

      try {
        // 2) server is authoritative and returns fresh totals in the same round trip
        const totals = await setBattleVote({
          contestId: battle.contestId,
          participantId: next ? battle[next].id : null,
        }).unwrap();

        dispatch(
          battlesApi.util.updateQueryData('getBattlePage', { cursor: null }, (draft) => {
            const item = draft.items.find((b) => b.id === battle.id);
            if (!item) return;
            item.red.votes = totals[item.red.id] ?? 0;
            item.green.votes = totals[item.green.id] ?? 0;
          }),
        );
      } catch {
        patch.undo(); // roll back the optimistic change
        // show your toast here: "Could not save your vote"
      } finally {
        pending.current.delete(battle.id);
      }
    },
    [dispatch, setBattleVote],
  );
}
```

```tsx
// src/features/battle-feed/components/BattleFeedContainer.tsx
'use client';

import { useCallback, useState } from 'react';
import { useGetBattlePageQuery } from '@/data/api/battlesApi';
import { BattleFeed } from './BattleFeed';
import { useVote } from '../hooks/useVote';
// FeedSkeleton and FeedError are your existing components

export function BattleFeedContainer() {
  const [cursor, setCursor] = useState<string | null>(null);
  const { data, isLoading, isFetching, isError, refetch } = useGetBattlePageQuery({ cursor });
  const onVote = useVote();

  const onLoadMore = useCallback(() => {
    if (!isFetching && data?.nextCursor) setCursor(data.nextCursor);
  }, [isFetching, data?.nextCursor]);

  if (isLoading) return <FeedSkeleton />; // ONLY while there is no data at all
  if (!data) return isError ? <FeedError onRetry={refetch} /> : <FeedSkeleton />;

  return <BattleFeed battles={data.items} onVote={onVote} onLoadMore={onLoadMore} />;
}
```

In `BattleFeed`, call `onLoadMore` from an effect that depends on `activeIndex` and `battles.length` (`if (activeIndex >= battles.length - 3) onLoadMore()`), or keep your `LazyScrollTrigger`. When the feed ends, render a final slide ("You have seen all duels" + a "Back to start" button that scrolls to top) instead of wrapping around.

### 7.9 Supabase migration

Adjust names to your merged schema (`contests / participants / votes`). Two points matter: the vote RPC is the only write path for live-battle votes, and it returns totals in the same round trip, so the feed never needs a second request.

```sql
-- supabase/migrations/20261101000000_photo_variants_and_vote_rpc.sql

-- 1) Photo metadata on participants (placeholder + stable dimensions for CLS = 0)
alter table participants
  add column if not exists photo_width  int,
  add column if not exists photo_height int,
  add column if not exists photo_blur   text,   -- data:image/...;base64, ~300-600 bytes
  add column if not exists photo_color  text;   -- dominant color, e.g. '#3a2f2a'

-- 2) Storage bucket: public read, owner-only write into their own folder
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "photos public read" on storage.objects;
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "photos owner upload" on storage.objects;
create policy "photos owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Totals as an aggregate: the client never downloads raw vote rows.
--    (Runs with the view owner's rights on purpose: only sums are exposed, raw votes stay behind RLS.)
create or replace view battle_vote_totals as
select contest_id,
       participant_id,
       sum(case when trust_weight > 0 then trust_weight else 1 end) as weighted_votes
from votes
group by contest_id, participant_id;

-- 4) One RPC for vote / change vote / unvote. Returns fresh totals.
create or replace function set_battle_vote(p_contest_id uuid, p_participant_id uuid)
returns table (out_participant_id uuid, out_votes numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if p_participant_id is not null and not exists (
    select 1 from participants p
    where p.id = p_participant_id and p.contest_id = p_contest_id
  ) then
    raise exception 'participant does not belong to this contest';
  end if;

  -- TODO your rules: contest is live, voter is not the participant, rate limit per user.

  -- serialize concurrent taps of the same user in the same contest
  perform pg_advisory_xact_lock(hashtextextended(p_contest_id::text || v_uid::text, 0));

  delete from votes where contest_id = p_contest_id and voter_id = v_uid;
  if p_participant_id is not null then
    insert into votes (contest_id, participant_id, voter_id)
    values (p_contest_id, p_participant_id, v_uid);
  end if;

  return query
    select v.participant_id,
           sum(case when v.trust_weight > 0 then v.trust_weight else 1 end)::numeric
    from votes v
    where v.contest_id = p_contest_id
    group by v.participant_id;
end;
$$;

revoke all on function set_battle_vote(uuid, uuid) from public, anon;
grant execute on function set_battle_vote(uuid, uuid) to authenticated;
```

Group voting (2–4 entries per group, daily cycle) has different rules. Give it its own RPC keyed by `group_id`; do not reuse this one.

### 7.10 Mock repositories that behave like a network

While the app runs on the mock DB, instant answers hide exactly the bugs that appear later (skeleton flicker, lost position, double votes). Make the mock slow and occasionally wrong. Use `?latency=1500&chaos=1` in the URL for stress runs.

```ts
// src/data/mock/latency.ts
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const BASE_MS = Number(params?.get('latency') ?? 250);
const CHAOS = params?.get('chaos') === '1';

export async function simulateNetwork<T>(fn: () => T | Promise<T>): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, BASE_MS * (0.5 + Math.random())));
  if (CHAOS && Math.random() < 0.1) throw new Error('mock network error'); // 10% failures
  return fn();
}
```

```ts
// src/data/mock/mockDb.ts  (fragment: how the mock plugs into the repository contract)
import { simulateNetwork } from './latency';
import type { BattlesRepo, VotesRepo } from '../repositories/types';

export const mockBattlesRepo: BattlesRepo = {
  getPage: ({ cursor, limit }) => simulateNetwork(() => db.battlePage(cursor, limit)),
};

export const mockVotesRepo: VotesRepo = {
  // must return totals shaped like the RPC: { [participantId]: weightedVotes }
  setVote: (contestId, participantId) => simulateNetwork(() => db.setVote(contestId, participantId)),
};
```

Delete every UI subscriber of `mockdb:updated` (the one in `page.tsx` that called `loadBattlesData()`). The RTK cache is the single source of truth now. The mock may keep emitting the event for debugging, but no screen should react to it.

### 7.11 Guard rails

ESLint stops the old mistakes from coming back. Lighthouse CI enforces the budgets once the repo has CI.

```js
// eslint.config.mjs (fragment)
export default [
  // …your existing config…
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/data/mock/*', '@/data/repositories/*', '@/data/supabase/*'], message: 'UI uses RTK Query hooks only.' },
          { group: ['@supabase/*'], message: 'Supabase is imported only inside src/data/.' },
        ],
      }],
      'no-restricted-syntax': ['error',
        {
          selector: "NewExpression[callee.object.name='window'][callee.property.name='Image']",
          message: 'Preload through schedulePhoto() from @/perf/imageScheduler.',
        },
        {
          selector: "NewExpression[callee.name='Image']",
          message: 'Preload through schedulePhoto() from @/perf/imageScheduler.',
        },
      ],
    },
  },
  { files: ['src/perf/**'], rules: { 'no-restricted-syntax': 'off' } },
  // upload code may import Supabase types/clients
  { files: ['src/data/**'], rules: { 'no-restricted-imports': 'off' } },
];
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 204800 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

---

## 8. Where else to prefetch (all through the scheduler)

| Screen | What to warm | Call |
| :--- | :--- | :--- |
| Lightbox | Nothing extra. It shows the same URL and `sizes` as the feed card, already decoded | — |
| `/contest/[id]` | First 4 participants of the active round | `prefetchPhotos(urls, { priority: 2, sizes: GRID_SIZES, scope: 'contest' })` on mount |
| `/profile`, "My votes" | First 6 thumbnails of `voteHistory`, when the browser is idle | `requestIdleCallback(() => prefetchPhotos(urls, { priority: 3, sizes: GRID_SIZES }))` |
| `/admin`, moderation queue | The next 5 entries, so Approve/Reject never waits | `prefetchPhotos(urls, { priority: 1, scope: 'admin' })`, then `setPhotoWindow('admin', keys)` as the moderator advances |
| `/search` | First 3 suggestion thumbnails, debounced 200 ms | `prefetchPhotos(urls, { priority: 1, sizes: GRID_SIZES, scope: 'search' })` + `setPhotoWindow('search', keys)` so stale queries are cancelled |
| 2×2 group feed | All 4 photos of the active group (priority 0), then next group (1) | Same pattern as `useFeedWindow`, scope `'groups'`, `sizes: GRID_SIZES`, readiness = all 4 decoded |

---

## 9. Deferred or dropped

| Item | Decision | Revisit when |
| :--- | :--- | :--- |
| Offline voting + Background Sync | **Dropped.** Not available on iOS Safari, and votes depend on server rules | Never in this form |
| Service-worker image cache (cache-first) | Deferred, P3. Safe because image URLs are immutable | Repeat-visit LCP fails the budget |
| Realtime counters | Deferred, P3. Subscribe only to the active battle and apply updates at most every 2–3 s (or poll `battle_vote_totals` every 5 s). Check Supabase Realtime connection and message limits for your plan first | Product wants live counters |
| JS windowing beyond `content-visibility` | Deferred | DOM nodes > 1,500 or memory budget fails after 100 slides |
| 1600 px zoom variant (`ZOOM_SIZES`) | Deferred | Pinch-zoom looks soft in the lightbox |
| AVIF | Deferred. Browsers cannot encode it from canvas, so it needs a server-side pipeline | Image bytes are still the bottleneck after Phase 3 |
| Haptics on iOS | Not possible in Safari without a native wrapper | If you ship a Capacitor/native shell |

---

## 10. Verification

### Test matrix

Devices: one real low-end Android (≤ 4 GB RAM), one iPhone (Safari), desktop Chrome with 4× CPU throttle and Slow 4G.

| # | Scenario | Expected |
| :-: | :--- | :--- |
| 1 | 30 quick swipes down and up on Fast 4G | No skipped slide. TTV hit-rate ≥ 90% |
| 2 | Same on Slow 4G | Skeleton and disabled cards until both photos are ready. The active slide's images start first in the waterfall |
| 3 | Vote, then swipe away immediately | The vote lands on the original battle. Totals update there |
| 4 | Double-tap, then tap both cards quickly | One request in flight per battle. Final state equals the server state |
| 5 | Mock `?latency=1500&chaos=1` | Position never jumps. A failed vote rolls back |
| 6 | Load-more or background refetch while on slide N | Scroll position unchanged, no skeleton |
| 7 | Switch tab and come back | Same battle is active |
| 8 | Scroll through 100+ slides | DOM ≤ 1,500 nodes. `getSchedulerStats().decodedMB` stays under the profile budget |
| 9 | Open lightbox on Slow 4G | Frame has the right size immediately. Blur, then photo. No layout shift |
| 10 | Block one photo URL | After 8 s: error state with Retry. Retry works |
| 11 | Upload a 12 MP portrait photo | Three variants within budget, correct EXIF rotation, blur and color stored |
| 12 | Network tab on a 20-slide session | Each image URL requested once |

### Definition of done for the performance work

- All metrics in §3 meet their targets on the baseline devices, recorded in `docs/performance/BASELINE.md`.
- ESLint guard rails pass. No UI file imports `mockDb`, repositories or `@supabase/*`.
- Every feed or screen with photos uses `photoLoader` and the scheduler.
- No screen reacts to `mockdb:updated`.

### PR checklist

- [ ] Position and list keys are ids.
- [ ] No skeleton on refetch (`isLoading` only).
- [ ] Images go through `photoLoader` and `schedulePhoto` / `prefetchPhotos`.
- [ ] New screen has a budget in `BUDGETS.md` and emits a metric.
- [ ] Tested with mock `latency=1500&chaos=1`.
- [ ] Tested on Slow 4G with 4× CPU throttle.
- [ ] No new dependency without a bundle-size check.

---

*Playbook v2. Replaces `optimization_and_performance_guide.md`; keep v1 for history.*
