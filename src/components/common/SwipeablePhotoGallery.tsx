"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  Scan,
} from 'lucide-react';
import { shouldBeUnoptimized } from '@/services/storageService';
import { HAPTIC, haptic } from '@/perf/haptics';

export interface SwipeablePhotoGalleryProps {
  photos: string[];
  title: string;
  author?: string;
  onOpenFullscreen?: (index: number) => void;
  className?: string;
  cornerAccent?: 'red' | 'blue' | 'emerald' | 'none';
  initialIndex?: number;
}

export function SwipeablePhotoGallery({
  photos,
  title,
  author,
  onOpenFullscreen,
  className = '',
  cornerAccent = 'none',
  initialIndex = 0,
}: SwipeablePhotoGalleryProps) {
  const normalizedPhotos = photos && photos.length > 0 ? photos : ['/placeholder.jpg'];
  const hasMultiple = normalizedPhotos.length > 1;

  // Gallery state
  const [activeIndex, setActiveIndex] = useState(
    initialIndex >= 0 && initialIndex < normalizedPhotos.length ? initialIndex : 0
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hasAttemptedSwipe, setHasAttemptedSwipe] = useState(false);

  // Fullscreen original viewer state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2.5>(1);
  const [fsDragOffset, setFsDragOffset] = useState(0);
  const [isFsDragging, setIsFsDragging] = useState(false);

  // Touch tracking refs for standard view
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch tracking refs for fullscreen
  const fsTouchStartXRef = useRef<number | null>(null);
  const fsTouchStartYRef = useRef<number | null>(null);
  const fsIsHorizontalRef = useRef<boolean | null>(null);

  // Reset when photos change
  useEffect(() => {
    setActiveIndex(0);
    setDragOffset(0);
    setIsDragging(false);
    setHasAttemptedSwipe(false);
    setIsFullscreen(false);
    setZoomLevel(1);
  }, [photos]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => {
      const nextIdx = prev > 0 ? prev - 1 : normalizedPhotos.length - 1;
      haptic(HAPTIC.vote);
      return nextIdx;
    });
  }, [normalizedPhotos.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => {
      const nextIdx = prev < normalizedPhotos.length - 1 ? prev + 1 : 0;
      haptic(HAPTIC.vote);
      return nextIdx;
    });
  }, [normalizedPhotos.length]);

  const handleOpenFullscreen = useCallback(() => {
    if (onOpenFullscreen) {
      onOpenFullscreen(activeIndex);
    }
    setIsFullscreen(true);
    setZoomLevel(1);
  }, [activeIndex, onOpenFullscreen]);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setZoomLevel(1);
    setFsDragOffset(0);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          handleCloseFullscreen();
        }
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        goToPrev();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        goToNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, hasMultiple, goToPrev, goToNext, handleCloseFullscreen]);

  // Touch handlers for normal cropped view
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiple) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
    setHasAttemptedSwipe(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasMultiple || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      const dampedDiff = diffX * 0.45;
      setDragOffset(dampedDiff);
      setHasAttemptedSwipe(true);
    }
  };

  const handleTouchEnd = () => {
    if (!hasMultiple) return;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current && Math.abs(dragOffset) > 35) {
      if (dragOffset > 35) {
        goToPrev();
      } else if (dragOffset < -35) {
        goToNext();
      }
    }

    setDragOffset(0);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;

    if (autoHideTimeoutRef.current) clearTimeout(autoHideTimeoutRef.current);
    autoHideTimeoutRef.current = setTimeout(() => {
      setHasAttemptedSwipe(false);
    }, 2200);
  };

  // Fullscreen touch handlers
  const handleFsTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiple || zoomLevel > 1) return;
    fsTouchStartXRef.current = e.touches[0].clientX;
    fsTouchStartYRef.current = e.touches[0].clientY;
    fsIsHorizontalRef.current = null;
    setIsFsDragging(true);
  };

  const handleFsTouchMove = (e: React.TouchEvent) => {
    if (!hasMultiple || zoomLevel > 1 || fsTouchStartXRef.current === null || fsTouchStartYRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - fsTouchStartXRef.current;
    const diffY = currentY - fsTouchStartYRef.current;

    if (fsIsHorizontalRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        fsIsHorizontalRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (fsIsHorizontalRef.current) {
      setFsDragOffset(diffX * 0.4);
    }
  };

  const handleFsTouchEnd = () => {
    if (!hasMultiple || zoomLevel > 1) return;
    setIsFsDragging(false);

    if (fsIsHorizontalRef.current && Math.abs(fsDragOffset) > 40) {
      if (fsDragOffset > 40) {
        goToPrev();
      } else if (fsDragOffset < -40) {
        goToNext();
      }
    }

    setFsDragOffset(0);
    fsTouchStartXRef.current = null;
    fsTouchStartYRef.current = null;
    fsIsHorizontalRef.current = null;
  };

  const currentPhoto = normalizedPhotos[activeIndex] || normalizedPhotos[0];

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. STANDART CROPPED VIEW: Instagram Standard 4:5 Mobile Ratio       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`relative w-full max-w-[520px] mx-auto aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0c0c10] border border-white/10 shadow-2xl select-none group cursor-pointer ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleOpenFullscreen}
      >
        {/* Photo Stage: Edge-to-edge 4:5 crop with object-cover (NO BLACK BARS) */}
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)',
          }}
        >
          <Image
            key={currentPhoto}
            src={currentPhoto}
            alt={title}
            fill
            priority
            unoptimized={shouldBeUnoptimized(currentPhoto)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 540px"
            className="object-cover object-center w-full h-full transition-transform duration-300 group-hover:scale-[1.01]"
            referrerPolicy="no-referrer"
          />

          {/* Subtle bottom gradient scrim for badge & indicator legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* Minimal Enlarge Trigger (top-right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenFullscreen();
          }}
          title="Открыть оригинал без обрезки"
          aria-label="Открыть оригинал без обрезки"
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/65 hover:bg-black/90 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-95 shadow-lg"
        >
          <Maximize2 size={14} strokeWidth={2.4} />
        </button>

        {/* Desktop Arrow Controls (Visible only when multiple photos) */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Предыдущее фото"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/65 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95"
            >
              <ChevronLeft size={18} strokeWidth={2.6} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Следующее фото"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/65 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95"
            >
              <ChevronRight size={18} strokeWidth={2.6} />
            </button>
          </>
        )}

        {/* Sleek Bottom Photo Counter & Swipe Indicator (Only if multiple photos) */}
        {hasMultiple && (
          <div className="absolute bottom-3.5 inset-x-0 z-20 flex flex-col items-center justify-center gap-1.5 pointer-events-none px-4">
            {/* Reactive Pill: Active during swipe attempt, dragging, or hover */}
            <div
              className={`px-3 py-1 rounded-full backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 text-xs font-bold tabular-nums shadow-xl ${
                isDragging || hasAttemptedSwipe
                  ? 'bg-[#ff6a2b]/95 text-white scale-105 border border-white/40 ring-4 ring-[#ff6a2b]/25 shadow-[#ff6a2b]/40'
                  : 'bg-black/65 text-white/95 border border-white/20 opacity-85 group-hover:opacity-100'
              }`}
            >
              {isDragging || hasAttemptedSwipe ? (
                <>
                  <span className="text-[10px] tracking-wider uppercase opacity-90">Свайп</span>
                  <span>·</span>
                  <span>{activeIndex + 1} из {normalizedPhotos.length}</span>
                </>
              ) : (
                <span>{activeIndex + 1} / {normalizedPhotos.length}</span>
              )}
            </div>

            {/* Micro Dots */}
            <div className="flex items-center gap-1.5">
              {normalizedPhotos.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === activeIndex
                      ? 'w-5 bg-white shadow-sm'
                      : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. FULLSCREEN UNCROPPED ORIGINAL VIEWER (Only when enlarged)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр оригинала без обрезки"
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between animate-fade-in select-none text-white overflow-hidden"
          onClick={handleCloseFullscreen}
        >
          {/* Top Bar: Title, Original Aspect Badge, Zoom, Close */}
          <div
            className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-neutral-300 flex items-center gap-1.5 shrink-0">
                <Scan size={12} className="text-[#ff6a2b]" />
                <span>Исходный размер</span>
              </span>

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[45vw] sm:max-w-md">
                  {title}
                </p>
                {author && <p className="text-[10px] text-neutral-400 truncate">{author}</p>}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1))}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10"
                title="Масштаб"
              >
                {zoomLevel === 1 ? <ZoomIn size={13} /> : <ZoomOut size={13} />}
                <span>{zoomLevel}x</span>
              </button>

              <button
                type="button"
                onClick={handleCloseFullscreen}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Center Stage: Full Original Uncropped Material (object-contain) */}
          <div
            className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-2 sm:p-4 cursor-zoom-out relative"
            onTouchStart={handleFsTouchStart}
            onTouchMove={handleFsTouchMove}
            onTouchEnd={handleFsTouchEnd}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseFullscreen();
              } else {
                setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1));
              }
            }}
          >
            {/* Desktop Fullscreen Arrows */}
            {hasMultiple && zoomLevel === 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  aria-label="Предыдущее фото"
                  className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-transform active:scale-95"
                >
                  <ChevronLeft size={22} strokeWidth={2.6} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  aria-label="Следующее фото"
                  className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-transform active:scale-95"
                >
                  <ChevronRight size={22} strokeWidth={2.6} />
                </button>
              </>
            )}

            <div
              className="relative w-full h-full max-w-7xl max-h-[85vh] transition-transform duration-200 flex items-center justify-center"
              style={{
                transform: `translateX(${fsDragOffset}px) scale(${zoomLevel})`,
              }}
            >
              <Image
                key={currentPhoto}
                src={currentPhoto}
                alt={title}
                fill
                priority
                unoptimized={shouldBeUnoptimized(currentPhoto)}
                sizes="100vw"
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Fullscreen Bottom Footer: Multi-photo indicator if multiple */}
          {hasMultiple && (
            <div
              className="relative z-30 pb-4 pt-2 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-1 rounded-full bg-black/70 border border-white/20 backdrop-blur-md text-xs font-bold tabular-nums text-white/90">
                {activeIndex + 1} из {normalizedPhotos.length}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default SwipeablePhotoGallery;
