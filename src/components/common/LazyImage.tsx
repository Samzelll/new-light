"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageOff, Camera } from 'lucide-react';

export interface LazyImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  fallbackText?: string;
  onClick?: () => void;
  onLoad?: () => void;
}

/**
 * LazyImage provides:
 * 1. Smooth progressive reveal (blur / shimmer placeholder -> smooth opacity crossfade)
 * 2. Cumulative Layout Shift (CLS) prevention
 * 3. Graceful error fallback placeholder if image fails to load
 * 4. Lazy loading with Next.js Image optimization
 * 5. referrerPolicy="no-referrer" for reliable CDN cross-origin loading
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
  sizes,
  quality = 85,
  fallbackText,
  onClick,
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const hasValidSrc = Boolean(src && typeof src === 'string' && src.trim().length > 0);

  // Container styling
  const baseContainerStyle = fill
    ? `relative w-full h-full overflow-hidden ${containerClassName}`
    : `relative inline-block overflow-hidden ${containerClassName}`;

  if (!hasValidSrc || hasError) {
    return (
      <div
        className={`${baseContainerStyle} bg-gradient-to-br from-neutral-900 via-[#18181b] to-neutral-950 flex flex-col items-center justify-center p-3 text-neutral-500`}
        onClick={onClick}
      >
        <div className="w-9 h-9 rounded-full bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-neutral-400 mb-1.5 shadow-inner">
          {hasError ? <ImageOff size={16} /> : <Camera size={16} />}
        </div>
        {fallbackText ? (
          <span className="text-[11px] text-center font-medium text-neutral-400 line-clamp-1 px-2">
            {fallbackText}
          </span>
        ) : (
          <span className="text-[10px] text-center font-medium text-neutral-500">
            {alt || 'Photo'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={baseContainerStyle} onClick={onClick}>
      {/* ── Progressive Shimmer Skeleton Placeholder ── */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 bg-neutral-900/90 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-neutral-800/80 to-neutral-900 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer bg-[length:200%_100%]" />
        </div>
      )}

      {/* ── Next.js Image with Smooth Reveal ── */}
      <Image
        src={src!}
        alt={alt}
        fill={fill}
        width={!fill ? width || 400 : undefined}
        height={!fill ? height || 400 : undefined}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        sizes={sizes || (fill ? '(max-width: 768px) 100vw, 50vw' : undefined)}
        quality={quality}
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-all duration-500 ease-out ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02] filter blur-[2px]'
        }`}
      />
    </div>
  );
}
export default LazyImage;
