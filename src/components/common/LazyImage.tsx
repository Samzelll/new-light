"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ImageOff, Camera } from 'lucide-react';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';

export interface LazyImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  /** Mark above-the-fold images as priority so they are eagerly fetched */
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  quality?: number;
  fallbackText?: string;
  onClick?: () => void;
  onLoad?: () => void;
}

/**
 * LazyImage — production-grade image component.
 *
 * Features:
 * 1. Native IntersectionObserver: image only starts loading when it enters
 *    the viewport (true lazy-loading, not just the browser default).
 * 2. Smooth progressive reveal: shimmer → image cross-fade, no layout shift.
 * 3. Graceful error fallback placeholder if image fails to load.
 * 4. Next.js Image optimisation (WebP/AVIF, right-sized per device via `sizes`).
 * 5. `referrerPolicy="no-referrer"` for reliable CDN cross-origin loading.
 * 6. `priority` prop bypasses lazy loading for LCP images.
 */
export function LazyImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className = '',
  containerClassName = '',
  priority = false,
  unoptimized,
  sizes,
  quality = 82,
  fallbackText,
  onClick,
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Start loading immediately for priority images; wait for viewport otherwise
  const [shouldLoad, setShouldLoad] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    if (!priority) setShouldLoad(false);
  }, [src, priority]);

  // IntersectionObserver — trigger load when ~200px away from viewport
  useEffect(() => {
    if (priority || shouldLoad) return; // already loading

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // pre-load 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
  }, []);

  // Safely resolve image URL from storage path or external URL
  const resolvedSrc = src ? resolveImageUrl(src, 'submissions') : '';
  const hasValidSrc = Boolean(
    resolvedSrc &&
    typeof resolvedSrc === 'string' &&
    resolvedSrc.trim().length > 0 &&
    (resolvedSrc.startsWith('http://') ||
     resolvedSrc.startsWith('https://') ||
     resolvedSrc.startsWith('data:') ||
     resolvedSrc.startsWith('/'))
  );

  // Determine container class
  const baseContainerStyle = fill
    ? `relative w-full h-full overflow-hidden ${containerClassName}`
    : `relative inline-block overflow-hidden ${containerClassName}`;

  // ── Fallback: no src or load error ──────────────────────────────────
  if (!hasValidSrc || hasError) {
    return (
      <div
        ref={containerRef}
        className={`${baseContainerStyle} bg-gradient-to-br from-neutral-900 via-[#18181b] to-neutral-950 flex flex-col items-center justify-center p-3 text-neutral-500`}
        onClick={onClick}
      >
        <div className="w-9 h-9 rounded-full bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
          {hasError ? <ImageOff size={16} /> : <Camera size={16} />}
        </div>
        {(fallbackText || alt) && (
          <span className="text-[11px] text-center font-medium text-neutral-400 line-clamp-2 px-2">
            {fallbackText ?? alt}
          </span>
        )}
      </div>
    );
  }

  // Compute a good default `sizes` value that avoids over-fetching.
  // Consumers can always override by passing their own `sizes` prop.
  const defaultSizes = fill
    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
    : undefined;

  return (
    <div ref={containerRef} className={baseContainerStyle} onClick={onClick}>
      {/* ── Progressive Shimmer Placeholder ── */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden" aria-hidden>
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-neutral-800/80 to-neutral-900 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer bg-[length:200%_100%]" />
        </div>
      )}

      {/* ── Next.js Image: only rendered once in viewport ── */}
      {shouldLoad && hasValidSrc && (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill={fill}
          width={!fill ? width ?? 400 : undefined}
          height={!fill ? height ?? 400 : undefined}
          priority={priority}
          unoptimized={unoptimized ?? shouldBeUnoptimized(resolvedSrc)}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes ?? defaultSizes}
          quality={quality}
          referrerPolicy="no-referrer"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-500 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

export default LazyImage;
