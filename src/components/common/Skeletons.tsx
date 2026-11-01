"use client";

import React from 'react';

/**
 * ContestCardSkeleton matches the 2-column masonry layout on Home page.
 */
export function ContestCardSkeleton({ heightClass = 'h-52' }: { heightClass?: string }) {
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-[#161619] border border-neutral-800/80 animate-pulse ${heightClass}`}
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-neutral-900/40 to-neutral-800/30" />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
        <div className="h-4 w-14 rounded-full bg-neutral-800" />
        <div className="h-4 w-8 rounded-full bg-neutral-800" />
      </div>

      {/* Bottom details */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-2">
        <div className="h-3.5 w-3/4 rounded-md bg-neutral-800" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded-md bg-neutral-800/70" />
          <div className="h-3 w-10 rounded-md bg-neutral-800/70" />
        </div>
      </div>
    </div>
  );
}

/**
 * ContestGridSkeleton renders 4 to 6 cards simulating the 2-column home masonry grid.
 */
export function ContestGridSkeleton({ count = 6 }: { count?: number }) {
  const col1 = [1, 2, 3].slice(0, Math.ceil(count / 2));
  const col2 = [4, 5, 6].slice(0, Math.floor(count / 2));

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {col1.map((id, idx) => (
          <ContestCardSkeleton
            key={`s-c1-${id}`}
            heightClass={idx % 2 === 0 ? 'h-52 sm:h-56' : 'h-64 sm:h-72'}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {col2.map((id, idx) => (
          <ContestCardSkeleton
            key={`s-c2-${id}`}
            heightClass={idx % 2 === 0 ? 'h-64 sm:h-72' : 'h-52 sm:h-56'}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * BattleArenaSkeleton renders the 1v1 split battle view skeleton for TikTok / Battle views.
 */
export function BattleArenaSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full animate-pulse gap-1.5 p-2">
      {/* Title skeleton */}
      <div className="h-5 w-48 bg-neutral-800 rounded-md mx-auto my-1" />

      {/* Top 50% card */}
      <div className="flex-1 h-1/2 min-h-0 w-full rounded-2xl bg-[#161619] border border-neutral-800/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <div className="absolute bottom-3 left-3 space-y-1.5">
          <div className="h-3 w-20 rounded bg-neutral-800" />
          <div className="h-4 w-32 rounded bg-neutral-700" />
        </div>
      </div>

      {/* Bottom 50% card */}
      <div className="flex-1 h-1/2 min-h-0 w-full rounded-2xl bg-[#161619] border border-neutral-800/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <div className="absolute bottom-3 left-3 space-y-1.5">
          <div className="h-3 w-20 rounded bg-neutral-800" />
          <div className="h-4 w-32 rounded bg-neutral-700" />
        </div>
      </div>
    </div>
  );
}

/**
 * FeedGroupSkeleton renders the 4-item photo grid skeleton.
 */
export function FeedGroupSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 space-y-3 animate-pulse">
      <div className="h-6 w-44 bg-neutral-800 rounded-md mx-auto" />
      <div className="grid grid-cols-2 gap-2.5 flex-1 h-[460px]">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-full h-full bg-[#161619] border border-neutral-800/80 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1">
              <div className="h-3.5 w-3/4 rounded bg-neutral-800" />
              <div className="h-2.5 w-1/2 rounded bg-neutral-800/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SearchResultsSkeleton for search page
 */
export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#141416] border border-neutral-800/80"
        >
          <div className="w-12 h-12 rounded-xl bg-neutral-800 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-14 rounded bg-neutral-800" />
              <div className="h-3 w-20 rounded bg-neutral-800/70" />
            </div>
            <div className="h-4 w-3/5 rounded bg-neutral-700" />
          </div>
          <div className="h-6 w-12 rounded-full bg-neutral-800 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * ProfilePageSkeleton for user profile view
 */
export function ProfilePageSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-pulse pt-4 px-4 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-neutral-800" />
        <div className="h-5 w-24 rounded bg-neutral-800" />
        <div className="w-9 h-9 rounded-xl bg-neutral-800" />
      </div>

      {/* Avatar & Info */}
      <div className="flex flex-col items-center space-y-2.5 text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-neutral-700/60" />
        <div className="h-5 w-36 rounded-md bg-neutral-800" />
        <div className="h-3.5 w-24 rounded-md bg-neutral-800/70" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#141416] border border-neutral-800/80">
        <div className="flex flex-col items-center gap-1">
          <div className="h-5 w-12 rounded bg-neutral-800" />
          <div className="h-3 w-14 rounded bg-neutral-800/70" />
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-neutral-800">
          <div className="h-5 w-12 rounded bg-neutral-800" />
          <div className="h-3 w-14 rounded bg-neutral-800/70" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="h-5 w-12 rounded bg-neutral-800" />
          <div className="h-3 w-14 rounded bg-neutral-800/70" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="h-11 w-full rounded-2xl bg-[#141416] border border-neutral-800/80" />

      {/* Content items */}
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl bg-[#141416] border border-neutral-800/80"
          >
            <div className="w-14 h-14 rounded-xl bg-neutral-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-neutral-800" />
              <div className="h-3 w-24 rounded bg-neutral-800/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ContestDetailSkeleton for /contest/[id] route loading state
 */
export function ContestDetailSkeleton() {
  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-pulse bg-[#000000]">
      {/* Top back button skeleton */}
      <div className="flex items-center justify-between pb-1">
        <div className="h-8 w-28 rounded-xl bg-neutral-900 border border-neutral-800" />
        <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800" />
      </div>

      {/* Hero header skeleton */}
      <div className="rounded-3xl bg-[#141418] border border-neutral-800/80 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-neutral-800" />
          <div className="h-5 w-24 rounded-full bg-neutral-800/70" />
        </div>
        <div className="h-9 w-3/4 rounded-xl bg-neutral-800" />
        <div className="h-4 w-5/6 rounded-lg bg-neutral-800/70" />
        <div className="flex gap-2 pt-2 border-t border-neutral-800/80">
          <div className="h-6 w-28 rounded-full bg-neutral-800" />
          <div className="h-6 w-32 rounded-full bg-neutral-800" />
        </div>
      </div>

      {/* Entries grid skeleton */}
      <div className="rounded-3xl bg-[#141418] border border-neutral-800/80 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="h-6 w-36 rounded-md bg-neutral-800" />
          <div className="h-4 w-24 rounded-md bg-neutral-800/70" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="aspect-square w-full rounded-xl bg-neutral-800" />
              <div className="h-4 w-32 rounded bg-neutral-700" />
              <div className="h-8 w-full rounded-xl bg-neutral-800/70" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

