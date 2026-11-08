"use client";

import React from 'react';

/**
 * ContestCardSkeleton matches the 2-column masonry layout on Home page.
 */
export function ContestCardSkeleton({ heightClass = 'h-52' }: { heightClass?: string }) {
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-surface border border-line animate-pulse ${heightClass}`}
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-surface-2/40 to-line/30" />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
        <div className="h-4 w-14 rounded-full bg-surface-2" />
        <div className="h-4 w-8 rounded-full bg-surface-2" />
      </div>

      {/* Bottom details */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-2">
        <div className="h-3.5 w-3/4 rounded-md bg-surface-2" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded-md bg-line/70" />
          <div className="h-3 w-10 rounded-md bg-line/70" />
        </div>
      </div>
    </div>
  );
}

/**
 * ContestGridSkeleton renders 4 to 6 cards simulating the 2-column home masonry grid.
 */
export function ContestGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <ContestCardSkeleton
          key={`s-c-${idx}`}
          heightClass={idx % 3 === 0 ? 'h-64 sm:h-72' : idx % 2 === 0 ? 'h-52 sm:h-60' : 'h-56 sm:h-64'}
        />
      ))}
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
      <div className="h-5 w-48 bg-surface-2 rounded-md mx-auto my-1" />

      {/* Top 50% card */}
      <div className="flex-1 h-1/2 min-h-0 w-full rounded-2xl bg-surface border border-line relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-bg/20" />
        <div className="absolute bottom-3 left-3 space-y-1.5">
          <div className="h-3 w-20 rounded bg-surface-2" />
          <div className="h-4 w-32 rounded bg-line" />
        </div>
      </div>

      {/* Bottom 50% card */}
      <div className="flex-1 h-1/2 min-h-0 w-full rounded-2xl bg-surface border border-line relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-bg/20" />
        <div className="absolute bottom-3 left-3 space-y-1.5">
          <div className="h-3 w-20 rounded bg-surface-2" />
          <div className="h-4 w-32 rounded bg-line" />
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
      <div className="h-6 w-44 bg-surface-2 rounded-md mx-auto" />
      <div className="grid grid-cols-2 gap-2.5 flex-1 h-[460px]">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-full h-full bg-surface border border-line rounded-2xl relative overflow-hidden"
          >
            <div className="absolute bottom-2.5 left-2.5 right-2.5 space-y-1">
              <div className="h-3.5 w-3/4 rounded bg-surface-2" />
              <div className="h-2.5 w-1/2 rounded bg-line/70" />
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
          className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border border-line"
        >
          <div className="w-12 h-12 rounded-xl bg-surface-2 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-14 rounded bg-surface-2" />
              <div className="h-3 w-20 rounded bg-line/70" />
            </div>
            <div className="h-4 w-3/5 rounded bg-line" />
          </div>
          <div className="h-6 w-12 rounded-full bg-surface-2 shrink-0" />
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
        <div className="w-9 h-9 rounded-xl bg-surface-2" />
        <div className="h-5 w-24 rounded bg-surface-2" />
        <div className="w-9 h-9 rounded-xl bg-surface-2" />
      </div>

      {/* Avatar & Info */}
      <div className="flex flex-col items-center space-y-2.5 text-center pt-2">
        <div className="w-20 h-20 rounded-full bg-surface-2 border-2 border-line" />
        <div className="h-5 w-36 rounded-md bg-surface-2" />
        <div className="h-3.5 w-24 rounded-md bg-line/70" />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-surface border border-line">
        <div className="flex flex-col items-center gap-1">
          <div className="h-5 w-12 rounded bg-surface-2" />
          <div className="h-3 w-14 rounded bg-line/70" />
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-line">
          <div className="h-5 w-12 rounded bg-surface-2" />
          <div className="h-3 w-14 rounded bg-line/70" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="h-5 w-12 rounded bg-surface-2" />
          <div className="h-3 w-14 rounded bg-line/70" />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="h-11 w-full rounded-2xl bg-surface border border-line" />

      {/* Content items */}
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-line"
          >
            <div className="w-14 h-14 rounded-xl bg-surface-2 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-surface-2" />
              <div className="h-3 w-24 rounded bg-line/70" />
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
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-24 animate-pulse bg-bg">
      {/* Top back button skeleton */}
      <div className="flex items-center justify-between pb-1">
        <div className="h-8 w-28 rounded-xl bg-surface border border-line" />
        <div className="w-9 h-9 rounded-xl bg-surface border border-line" />
      </div>

      {/* Hero header skeleton */}
      <div className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-surface-2" />
          <div className="h-5 w-24 rounded-full bg-line/70" />
        </div>
        <div className="h-9 w-3/4 rounded-xl bg-surface-2" />
        <div className="h-4 w-5/6 rounded-lg bg-line/70" />
        <div className="flex gap-2 pt-2 border-t border-line">
          <div className="h-6 w-28 rounded-full bg-surface-2" />
          <div className="h-6 w-32 rounded-full bg-surface-2" />
        </div>
      </div>

      {/* Entries grid skeleton */}
      <div className="rounded-3xl bg-surface border border-line p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="h-6 w-36 rounded-md bg-surface-2" />
          <div className="h-4 w-24 rounded-md bg-line/70" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-2xl bg-surface-2 border border-line space-y-3">
              <div className="aspect-square w-full rounded-xl bg-surface" />
              <div className="h-4 w-32 rounded bg-line" />
              <div className="h-8 w-full rounded-xl bg-surface/70" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
