# Live Battle Feed Overhaul: TikTok/Reels Scroll-Snap & Robust Voting Architecture

A comprehensive upgrade to transform the 1v1 Live Battle experience into a true TikTok/Instagram Reels vertical scroll feed with native physics, zero position resets, proactive image cache alignment, and bulletproof atomic voting.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core product and technical architectural decisions were confirmed during the planning consultation:

- **Feed Scrolling Architecture**: **Native CSS Scroll-Snap Container** (`snap-y snap-mandatory`, `overflow-y-scroll`). Replaces fragile manual touch/wheel/framer-drag listeners and the 280ms mutex with the browser's hardware-accelerated gesture physics, natural momentum, and trackpad/mobile fling.
- **Positioning & Navigation Stability**: Track position by unique battle ID (`activeId`) via `IntersectionObserver` (threshold `0.6`) instead of numerical index (`currentIndex`). Zero jumps or resets to battle #0 upon voting, re-filtering, or data updates.
- **End-of-Feed Completion Experience**: Dedicated completion card displayed at the conclusion of the battle stream with a smooth "Back to top" button and filter exploration controls.
- **Visual Feedback & Voting State Machine**: Instant emerald glow ring + scaling on tap, single vote locking per battle (`pending` -> `confirmed` / `failed`), and verified mathematical percentage recalculation from real weighted vote counts (`battle.red.votes`, `battle.green.votes`) with automatic rollback on network failure.
- **Dual Photo Readiness & Decode Barrier**: Cards render responsive skeleton loaders and lock voting until **both** competitor photos are downloaded and decoded via Next.js `getImageProps` matching srcset cache. Includes 8s timeout with manual "Retry" action.

---

## 1. Overview & Core Concept

### What It Delivers
The Live Battle Feed is the core entertainment and discovery engine of Opinion Net, pitting two creative works head-to-head in full-viewport 1v1 duels. This overhaul replaces the previous single-screen slider with a continuous vertical viewport stream that allows users to seamlessly fling through matchups with zero jitter, instant visual responsiveness, and trustworthy vote accounting.

### Target Audience & Persona
- **Mobile-First Voters**: Everyday community members seeking instant, friction-free visual comparison and one-tap decision-making.
- **Contest Creators & Photographers**: Participants who require accurate, tamper-proof vote metrics and pristine, uncompressed full-screen previews of their submissions.

### Key Value
- **Butter-Smooth Feed Physics (60 FPS)**: Native mobile inertia without synthetic drag constraints or debounce lag.
- **Rock-Solid Feed Memory**: Never lose your place in the stream when casting a vote or when the server updates underlying contest tallies.
- **Trust-Weighted Integrity**: Fair, verified percentage shifts reflecting real community weight rather than arbitrary cosmetic offsets.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Browsing Matches**:
   - The user opens the "Battles" tab.
   - The feed renders full-height 1v1 battle slides. Only a tight 3-slide window (`-1`, `0`, `+1`) mounts heavy media DOM nodes, keeping memory consumption low.
   - Swiping up flings to the next battle with native snap-to-center feel.
   - Ahead by 2 battles, images are proactively downloaded and decoded in the background.

2. **Photo Readiness & Skeleton State**:
   - If network conditions are slow, both cards display clean shimmer skeletons with subtle photo glyphs.
   - Voting hitboxes are temporarily inert (`aria-disabled="true"`).
   - Once both photos finish hardware decoding, the imagery fades in smoothly (`opacity-100 transition-opacity duration-300`) and the cards become interactive.

3. **Voting & Instant Feedback**:
   - The user taps either the Red (top) or Green (bottom) challenger.
   - The selected card instantly scales to `scale-[0.88]` with an emerald neon border (`ring-2 ring-emerald-500`) and shadow glow (`shadow-[0_0_30px_rgba(16,185,129,0.35)]`).
   - The opposing card dims (`opacity-70 brightness-[0.7]`).
   - The vote badge ("Выбрано" / "Selected") appears with a crisp checkmark.
   - A verified `+1` percentage breakdown smoothly slides in at the bottom right.
   - If the network request fails, the state gracefully rolls back, a subtle toast alerts the user, and the cards unlock for a retry.

4. **Deep-Dive Inspection (Lightbox & Rules)**:
   - Tapping the `Maximize2` icon opens the non-blocking embedded lightbox modal with multi-photo carousel, 1x/1.5x/2.5x pinch zoom, and full creator profile.
   - Tapping the contest title in the header navigates to the dedicated tournament hub.

5. **Feed Completion**:
   - Reaching the final battle in the queue reveals a stylish completion card: "You've voted on all active duels in this category" with a one-tap smooth scroll back to the top.

### Visual Identity & Theme
- **Color Discipline (60-30-10)**:
  - `60% Neutral Canvas`: Deep OLED black (`#0b0b0d` / `#121215`) maximizing photograph contrast.
  - `30% Structural Surfaces`: Hairline graphite borders (`border-neutral-800/80`), subtle blurred backdrops (`backdrop-blur-md`).
  - `10% High-Intent Accents`: Vivid electric orange (`#ff6a2b`) for brand anchors and VS badge; emerald green (`#10b981`) exclusively for confirmed voting states.
- **Typography**:
  - Display Headers: Unbounded / System Bold for punchy titles and competitor tags (`font-black tracking-wide`).
  - Data Numerals: Strict tabular figures (`font-mono tabular-nums`) for vote percentages.
  - Zero-Pill Metadata: Creator names, tags, and categories rendered as clean unboxed typography with typographic separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Native CSS Scroll-Snap vs. Framer Motion Drag Swiper
- **Chosen Approach**: CSS `scroll-snap-type: y mandatory` on an overflow container combined with `IntersectionObserver`.
- **Why**: Framer Motion drag on full-screen containers requires manual touch coordinate tracking, velocity thresholds, wheel debouncing, and custom transition mutexes that often drop frames on Android and iOS Safari. Native CSS scroll-snap runs on the browser's compositor thread, yielding instant 120Hz gesture response and flawless momentum scrolling.
- **Trade-off**: Requires strict container height coordination (`100%` within parent viewport) and virtualized DOM sliding (`inWindow` filter) to prevent excessive memory usage.

### Decision 2: Feed Position Identified by `activeId` vs. `currentIndex`
- **Chosen Approach**: State stores `activeId: string | null`. Active index is derived dynamically via `battles.findIndex(b => b.id === activeId)`.
- **Why**: Storing numerical index causes fatal feed jumps. When parent components re-sort battles, re-filter, or update voting records, an array reallocation causes `currentIndex` to point to a different battle or triggers `setCurrentIndex(0)`. Unique string IDs ensure absolute stability.

### Decision 3: Next.js Matching srcset Preload vs. Vanilla `new Image()`
- **Chosen Approach**: Proactive preloader using Next.js `getImageProps({ src, sizes: FEED_SIZES, ... })` and `img.decode()`.
- **Why**: Standard `new Image().src = rawUrl` downloads the full-resolution unoptimized source file, whereas Next.js `<Image sizes="(max-width: 640px) 100vw, 480px" />` requests a resized WebP/AVIF file via `/_next/image?url=...`. Because the cache keys differed, the browser re-downloaded every image when the slide appeared. Using `getImageProps` matches the exact URL and srcset queried by Next.js.

### Decision 4: Honest Weighted Vote Calculations vs. Cosmetic `±2%`
- **Chosen Approach**: Mathematical percentage computation `Math.round((redVotes / (redVotes + greenVotes)) * 100)` with optimistic `+1` weight before server confirmation.
- **Why**: Hardcoded arbitrary offsets ("+2%") look glitchy when the real server totals load or when a duel has heavy vote volume. Real count adjustments maintain credibility and match the tournament engine backend.

---

## 4. Technical Architecture & Data Strategy

### System Component & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HomePage (src/app/page.tsx)                     │
│  - allBattles: BattleItem[]                                            │
│  - serverVotes: Record<battleId, 'red' | 'green'>                      │
│  - loadMoreBattles(): cursor pagination                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           LiveBattleFeedContainer (CSS Scroll-Snap Engine)             │
│  - scrollerRef: HTMLDivElement (snap-y snap-mandatory)                 │
│  - activeId: string (IntersectionObserver threshold 0.6)               │
│  - preloadAhead(activeIndex + 1 ... + 3)                               │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ BattleSlide (inWindow: -1..+2)│        │   EndOfFeedSlide (Final Card) │
│ - useBattleReady(both photos) │        │   - Completion celebration    │
│ - Skeleton loading state      │        │   - "Scroll to top" button    │
│ - useBattleVotes(lock, status)│        │   - Category filter reset     │
│ - Top (Red) & Bottom (Green)  │        └───────────────────────────────┘
│ - EmbeddedLightbox trigger    │
└───────────────────────────────┘
```

### Module Responsibilities & Key Files

1. **`src/types/battle.ts`**:
   - Single canonical source of truth for battle types, eliminating discrepancies between `red | blue` and `red | green`.
   - Defines `Corner = 'red' | 'green'`, `CompetitorDetails`, `BattleItem`, `VoteState`, and `BattleVoteTotals`.

2. **`src/services/battleImagePreloader.ts`**:
   - `preloadPhoto(src, sizes)` using `getImageProps` and `img.decode()`.
   - LRU memory pinning map preventing GC disposal during active scrolling.
   - `useBattleReady(battle)` hook with 8-second timeout and retry trigger.

3. **`src/components/contest/LiveBattleFeedComplete.tsx`**:
   - Full CSS Scroll-Snap container with zero-lag fling physics.
   - `IntersectionObserver` observing slides for active battle detection.
   - Keyboard listener for arrow key navigation.
   - Optimized `BattleSlide` component rendering cards, Skeleton pulse, dynamic percentages, and lightbox.
   - `EndOfFeedSlide` offering graceful closure and instant scroll-to-top.

4. **`src/services/battleDataService.ts` & `src/app/page.tsx`**:
   - Updated `getAllBattleItems` supplying numerical `votes` counts for authentic percentages.
   - Cursor-based non-duplicating pagination (`loadMoreBattles`) ensuring unique IDs across the entire infinite stream.
   - Optimistic voting handler with server error rollback.

---

## 5. Implementation Steps & Verification Plan

### Phase 1: Core Types & Image Preloader
1. Create `src/types/battle.ts` with unified `BattleItem`, `CompetitorDetails`, and `VoteState` definitions.
2. Create `src/services/battleImagePreloader.ts` implementing `getImageProps` matching cache and `useBattleReady` hook.

### Phase 2: Native Scroll-Snap Feed Engine
1. Refactor `LiveBattleFeedComplete.tsx` to use native vertical scroll-snap with windowed rendering (`inWindow = i >= activeIndex - 1 && i <= activeIndex + 2`).
2. Implement `IntersectionObserver` tracking `activeId` by DOM attribute.
3. Remove synthetic drag handlers, mouse wheel debounces, and transition mutexes.
4. Add `EndOfFeedSlide` at the bottom of the feed.

### Phase 3: Robust Voting State Machine
1. Implement `useBattleVotes` with duplicate prevention lock, pending state, and rollback on error.
2. Wire honest mathematical percentage calculations based on actual competitor vote sums.
3. Connect `BattleSlide` to disable clicks until both photos report `ready`.

### Phase 4: Verification & Acceptance Testing
1. **Swipe Performance Test**: Perform 20 rapid flings to verify 0 dropped snaps, zero blank flash states, and natural inertia.
2. **Slow Network Test**: Simulate network throttling to verify that Skeleton loaders show and voting is locked until both photos finish decoding.
3. **Vote Lock Test**: Double-tap cards rapidly to ensure exactly one vote is processed and no duplicate offsets occur.
4. **End-of-Stream Test**: Scroll to the end of battles to verify the completion card and smooth scroll-to-top behavior.
5. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to confirm zero TypeScript or build errors.
