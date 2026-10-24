// src/features/pin-grid/components/PinGrid.tsx
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { assign } from '../model/masonry';
import { useBatchGate } from '../hooks/useBatchGate';
import { PinCard } from './PinCard';
import { Loader2 } from 'lucide-react';
import type { PinItem, ColumnAssignment } from '../model/types';

export interface PinGridProps {
  pins: PinItem[];
  columns?: number;
  batchSize?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onFail?: 'placeholder' | 'hide';
  onPinClick?: (pin: PinItem) => void;
  className?: string;
}

export function PinGrid({
  pins,
  columns = 2,
  batchSize = 10,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onFail = 'placeholder',
  onPinClick,
  className = '',
}: PinGridProps) {
  // 1. Synchronized batch gate hook
  const {
    pinStatus,
    revealedPins,
    stragglerPins,
    isBatchLoading,
    retry,
  } = useBatchGate(pins, { batchSize, onFail });

  // 2. Stable masonry assignment (cached across renders, never shifting existing pins)
  const assignmentRef = useRef<ColumnAssignment | null>(null);

  const columnAssignment = useMemo(() => {
    const updated = assign(pins, columns, assignmentRef.current);
    assignmentRef.current = updated;
    return updated;
  }, [pins, columns]);

  // 3. Early start sentinel (rootMargin 150% below grid bottom)
  const sentinelRef = useRef<HTMLDivElement>(null);
  const midBatchSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isBatchLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '0px 0px 150% 0px', threshold: 0 }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isBatchLoading, isLoadingMore]);

  // 4. Mid-batch sentinel (~50% of the current batch)
  const midPinId = useMemo(() => {
    if (pins.length <= 4) return null;
    const midIndex = Math.max(0, pins.length - Math.floor(batchSize / 2));
    return pins[midIndex]?.id || null;
  }, [pins, batchSize]);

  useEffect(() => {
    if (!onLoadMore || !hasMore || !midPinId) return;

    const el = document.querySelector(`[data-pin-id="${midPinId}"]`);
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isBatchLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '0px 0px 50% 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [midPinId, onLoadMore, hasMore, isBatchLoading, isLoadingMore]);

  return (
    <div
      role="region"
      aria-label="Masonry Pins Grid"
      aria-busy={isBatchLoading}
      className={`w-full flex flex-col ${className}`}
    >
      {/* ── Flex Columns Layout ── */}
      <div className="w-full flex gap-2 sm:gap-2.5 items-start">
        {columnAssignment.columns.map((columnPins, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className="flex-1 flex flex-col gap-2 sm:gap-2.5 min-w-0"
          >
            {columnPins.map((pin) => (
              <PinCard
                key={pin.id}
                pin={pin}
                status={pinStatus[pin.id] || 'pending'}
                isRevealed={revealedPins.has(pin.id)}
                isStraggler={stragglerPins.has(pin.id)}
                onRetry={retry}
                onFail={onFail}
                onClick={onPinClick}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── Single Centered Loading Spinner While Batch Is Pending ── */}
      {isBatchLoading && (
        <div
          role="status"
          aria-live="polite"
          className="w-full py-6 flex items-center justify-center animate-fade-in"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 text-neutral-300 text-xs font-semibold shadow-lg">
            <Loader2 size={13} className="animate-spin text-[#ff6a2b]" />
            <span>Loading batch...</span>
          </div>
        </div>
      )}

      {/* ── Infinite Scroll Early-Start Sentinel ── */}
      <div
        ref={sentinelRef}
        className="w-full h-4 pointer-events-none opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}
