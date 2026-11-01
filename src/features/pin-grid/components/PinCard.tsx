// src/features/pin-grid/components/PinCard.tsx
import React, { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { photoLoader } from '@/perf/imageUrls';
import { AlertCircle, RotateCcw, ImageOff } from 'lucide-react';
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
      className={`group relative w-full rounded-2xl overflow-hidden border border-white/[0.08] select-none [content-visibility:auto] [contain-intrinsic-size:auto_320px] transition-all ${
        isRevealed ? 'hover:border-[#ff6a2b]/60 hover:shadow-[0_10px_30px_-6px_rgba(255,106,43,0.25)] active:scale-[0.98]' : ''
      }`}
      style={{
        backgroundColor: pin.dominantColor || '#141418',
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
            <div className="absolute inset-0 -translate-x-full pin-shimmer-beam bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>
        )}

        {/* ── Failure Placeholder State ── */}
        {isFailed && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 text-center bg-neutral-900/90 backdrop-blur-xs">
            <ImageOff size={22} className="text-neutral-500 mb-1.5" />
            <span className="text-[11px] font-semibold text-neutral-300 mb-2">
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
                className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] flex items-center gap-1.5 border border-neutral-700 transition-colors active:scale-95 cursor-pointer"
              >
                <RotateCcw size={11} className="text-[#ff6a2b]" />
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

          {/* Vignette gradients for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0d] via-black/25 to-black/50 pointer-events-none" />

          {/* Top Badges (Live, Tag, Category) */}
          <div className="relative top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5">
              {pin.isLive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 backdrop-blur-xs text-emerald-400 border border-emerald-500/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              ) : pin.badge ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-xs text-[#ff6a2b] border border-[#ff6a2b]/30 shadow-xs">
                  {pin.badge}
                </span>
              ) : null}
            </div>

            {pin.tag && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-xs text-neutral-300 border border-white/10">
                {pin.tag}
              </span>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="relative bottom-2.5 left-2.5 right-2.5 z-10 pointer-events-none">
            <h3 className="text-xs sm:text-sm font-black tracking-tight text-white line-clamp-2 leading-tight drop-shadow-md">
              {pin.title}
            </h3>
            {pin.subtitle && (
              <p className="text-[11px] text-neutral-300 font-medium truncate mt-1 drop-shadow-xs">
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
      <Link href={pin.href} className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] rounded-2xl">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
});
