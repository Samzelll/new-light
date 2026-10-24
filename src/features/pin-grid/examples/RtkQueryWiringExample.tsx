// src/features/pin-grid/examples/RtkQueryWiringExample.tsx
'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RTK QUERY WIRING EXAMPLE FOR PINGRID
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Demonstrates how a paginated RTK Query endpoint with cursor-based pagination,
 * append-only cache merge, and isFetching feeds into PinGrid without layout shift.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { PinGrid } from '../components/PinGrid';
import type { PinItem } from '../model/types';

interface PinsPage {
  items: PinItem[];
  nextCursor: string | null;
}

// 1. RTK Query API definition
export const pinsApi = createApi({
  reducerPath: 'pinsApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (build) => ({
    getPinsPage: build.query<PinsPage, { cursor: string | null; limit?: number }>({
      async queryFn({ cursor, limit = 10 }) {
        // Simulated network fetch
        const start = cursor ? parseInt(cursor, 10) : 0;
        const items: PinItem[] = Array.from({ length: limit }, (_, i) => {
          const idx = start + i + 1;
          const widths = [600, 600, 600, 600];
          const heights = [750, 620, 800, 560];
          const w = widths[idx % widths.length];
          const h = heights[idx % heights.length];
          return {
            id: `pin-${idx}`,
            photo: `https://images.unsplash.com/photo-${1500000000000 + (idx * 1234567) % 500000000}?w=600`,
            title: `Contest Spotlight #${idx}`,
            subtitle: `Round ${(idx % 4) + 1} · Photography`,
            width: w,
            height: h,
            badge: idx % 2 === 0 ? 'Battle' : 'Race',
            isLive: idx % 3 === 0,
            dominantColor: '#17171c',
            href: `/contest/c-${idx}`,
          };
        });

        const nextCursor = start + limit < 50 ? String(start + limit) : null;
        return { data: { items, nextCursor } };
      },
      // Keep one cache entry for the whole feed
      serializeQueryArgs: ({ endpointName }) => endpointName,
      // Append only, deduplicate by ID, never reassign
      merge: (cache, incoming, { arg }) => {
        if (!arg.cursor) {
          cache.items = incoming.items;
        } else {
          const seen = new Set(cache.items.map((p) => p.id));
          for (const item of incoming.items) {
            if (!seen.has(item.id)) cache.items.push(item);
          }
        }
        cache.nextCursor = incoming.nextCursor;
      },
      // Never refetch page one on remount
      forceRefetch: ({ currentArg, previousArg }) =>
        !!currentArg?.cursor && currentArg.cursor !== previousArg?.cursor,
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetPinsPageQuery } = pinsApi;

// 2. Container component wired to RTK Query
export function RtkQueryPinGridContainer() {
  const [cursor, setCursor] = useState<string | null>(null);

  // CRITICAL: use isFetching for pagination, isLoading ONLY for empty initial load
  const { data, isLoading, isFetching } = useGetPinsPageQuery({ cursor });

  const pins = useMemo(() => data?.items || [], [data?.items]);
  const hasMore = Boolean(data?.nextCursor);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && data?.nextCursor) {
      setCursor(data.nextCursor);
    }
  }, [isFetching, data?.nextCursor]);

  if (isLoading && pins.length === 0) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6a2b] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-2 py-4">
      <PinGrid
        pins={pins}
        columns={2}
        batchSize={10}
        hasMore={hasMore}
        isLoadingMore={isFetching}
        onLoadMore={handleLoadMore}
        onFail="placeholder"
      />
    </div>
  );
}
