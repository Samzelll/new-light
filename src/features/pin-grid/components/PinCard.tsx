// src/features/pin-grid/components/PinCard.tsx
import React, { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { photoLoader } from '@/perf/imageUrls';
import { AlertCircle, RotateCcw, ImageOff, Star } from 'lucide-react';
import type { PinItem, PinStatus } from '../model/types';

export interface PinCardProps {
  pin: PinItem;
  status: PinStatus;
  isRevealed: boolean;
  isStraggler?: boolean;
  onRetry?: (pinId: string) => void;
  onFail?: 'placeholder' | 'hide';
  onClick?: (pin: PinItem) => void;
}

export const PinCard = memo(function PinCard({
  pin,
  status,
  isRevealed,
  isStraggler,
  onRetry,
  onFail = 'placeholder',
  onClick,
}: PinCardProps) {
  // If failed and hide requested, hide card completely
  if (status === 'failed' && onFail === 'hide') {
    return null;
  }

  // Exact aspect ratio from stored metadata or 4/5 fallback
  const hasDimensions = pin.width && pin.height && pin.width > 0 && pin.height > 0;
  const aspectRatio = hasDimensions ? `${pin.width} / ${pin.height}` : '4 / 5';

  const isFailed = status === 'failed';
  const isShimmering = !isRevealed && !isFailed;

  // Transition durations: 180ms for stragglers, 240ms for synchronized batch
  const transitionDurationClass = isStraggler ? 'duration-[180ms]' : 'duration-[240ms]';

  const cardContent = (
    <article
      data-pin-id={pin.id}
      aria-hidden={!isRevealed}
      className={`group relative w-full rounded-lg overflow-hidden border border-line bg-surface select-none [content-visibility:auto] [contain-intrinsic-size:auto_320px] transition-all ${
        isRevealed ? 'hover:border-accent/60 active:scale-[0.99]' : ''
      }`}
      style={{
        backgroundColor: pin.dominantColor || '#1c1917',
      }}
      onClick={() => {
        if (isRevealed && onClick) {
          onClick(pin);
        }
      }}
    >
      {/* ── Frame Layer (Aspect Ratio Reserved Container) ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio }}
      >
        {/* Shimmer overlay while pending */}
        {isShimmering && (
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 -translate-x-full pin-shimmer-beam bg-gradient-to-r from-transparent via-line/40 to-transparent" />
          </div>
        )}

        {/* ── Failure Placeholder State ── */}
        {isFailed && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-surface/90 backdrop-blur-xs">
            <ImageOff size={22} className="text-muted mb-1.5" />
            <span className="text-[11px] font-semibold text-muted mb-2">
              Failed to load
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onRetry(pin.id);
                }}
                className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-line text-ink font-bold text-[10px] flex items-center gap-1.5 border border-line transition-colors active:scale-95 cursor-pointer"
              >
                <RotateCcw size={11} className="text-accent" />
                <span>Tap to retry</span>
              </button>
            )}
          </div>
        )}

        {/* ── Synchronized Revealed Content Layer ── */}
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity ${transitionDurationClass} ease-out ${
            isRevealed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Main Photo with smooth subtle scale effect */}
          {pin.photo && (
            <Image
              src={pin.photo}
              alt={pin.title}
              fill
              loader={photoLoader}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              placeholder={pin.blurDataURL ? 'blur' : 'empty'}
              blurDataURL={pin.blurDataURL}
              referrerPolicy="no-referrer"
              className={`object-cover object-center transition-transform ${transitionDurationClass} ease-out ${
                isRevealed ? 'scale-100' : 'scale-[1.015]'
              } group-hover:scale-105`}
            />
          )}

          {/* Top Badges (Live, Tag, Category, Following Star Icon) */}
          <div className="relative top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1">
              {pin.isLive ? (
                <span className="bg-accent/25 text-accent-soft px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 border border-accent/35 shadow-xs backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Live
                </span>
              ) : pin.badge ? (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-scrim text-accent-soft border border-line shadow-xs">
                  {pin.badge}
                </span>
              ) : null}
            </div>

            {/* Right Badge: Star icon for following / saved, or compact text tag */}
            {pin.isSubscribed || pin.tag?.toLowerCase().includes('follow') ? (
              <span
                className="w-6 h-6 rounded-full bg-scrim/90 border border-line flex items-center justify-center text-accent shadow-xs backdrop-blur-xs shrink-0"
                title="Подписка оформлена"
                aria-label="Подписка"
              >
                <Star size={11} className="fill-accent text-accent" />
              </span>
            ) : pin.tag ? (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-scrim text-muted border border-line shrink-0">
                {pin.tag}
              </span>
            ) : null}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom Card Caption Strip (Compact, tight padding, smaller font, strict ellipsis) */}
          <div className="relative z-10 bg-scrim/95 px-2.5 py-1.5 sm:py-2 border-t border-line pointer-events-none">
            <h3
              className="font-display text-[13px] sm:text-[14px] font-bold text-ink leading-snug truncate"
              title={pin.title}
            >
              {pin.title}
            </h3>
            {pin.subtitle && (
              <p className="text-[11px] text-muted truncate mt-0.5">
                {pin.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );

  // If pin has an href and no custom onClick, wrap in Link
  if (pin.href && !onClick) {
    return (
      <Link href={pin.href} className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});
