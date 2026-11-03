"use client";

import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface LazyScrollTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  rootMargin?: string;
  threshold?: number;
  className?: string;
  showButtonFallback?: boolean;
}

/**
 * LazyScrollTrigger attaches an IntersectionObserver to detect when user reaches the end of list,
 * smoothly requesting next items with an animated indicator.
 */
export function LazyScrollTrigger({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '300px',
  threshold = 0.1,
  className = '',
  showButtonFallback = true,
}: LazyScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const target = triggerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore, rootMargin, threshold]);

  if (!hasMore) {
    return (
      <div className={`py-6 flex items-center justify-center gap-2 text-xs font-semibold text-faint ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />
        <span>You’ve viewed all contests</span>
        <span className="w-1.5 h-1.5 rounded-full bg-line-strong" />
      </div>
    );
  }

  return (
    <div ref={triggerRef} className={`py-4 flex flex-col items-center justify-center gap-2 ${className}`}>
      {isLoading ? (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface border border-line text-xs font-bold text-muted shadow-sm animate-fade-in">
          <Loader2 size={15} className="animate-spin text-accent" />
          <span>Loading more contests…</span>
        </div>
      ) : showButtonFallback ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="px-5 py-2 rounded-full text-xs font-bold bg-surface hover:bg-surface-2 text-ink border border-line transition-colors shadow-sm active:scale-95"
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}

export default LazyScrollTrigger;
