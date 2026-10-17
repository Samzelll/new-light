"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Camera,
  Send,
  Share2,
  Globe,
  Award,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photos?: string[];
  title: string;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
  category?: string;
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    twitter?: string;
    portfolio?: string;
  };
  isSelected?: boolean;
  onVote?: () => void;
}

export function PhotoLightbox({
  isOpen,
  onClose,
  photoUrl,
  photos,
  title,
  author,
  authorAvatar,
  authorBio,
  category,
  sponsorName,
  sponsorTier,
  prizePool,
  socialLinks,
  isSelected,
  onVote,
}: PhotoLightboxProps) {
  // Normalize photos list
  const allPhotos = useMemo(() => {
    if (photos && photos.length > 0) return photos;
    if (photoUrl) return [photoUrl];
    return [];
  }, [photos, photoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2.5>(1);

  const touchStartXRef = useRef<number | null>(null);
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);

  // Reset active photo when new photos load
  useEffect(() => {
    if (photoUrl && allPhotos.length > 0) {
      const initialIdx = allPhotos.indexOf(photoUrl);
      setActiveIndex(initialIdx >= 0 ? initialIdx : 0);
    } else {
      setActiveIndex(0);
    }
    setZoomLevel(1);
  }, [photoUrl, allPhotos]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isFullscreenModal) {
          setIsFullscreenModal(false);
          setZoomLevel(1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreenModal, onClose, allPhotos.length]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailScrollRef.current) return;
    const activeThumb = thumbnailScrollRef.current.children[activeIndex] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
  }, [allPhotos.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
  }, [allPhotos.length]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (deltaX > 45) {
      goToNext();
    } else if (deltaX < -45) {
      goToPrev();
    }
  };

  if (!isOpen || allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[activeIndex] || photoUrl;

  // Resolved social links
  const resolvedSocials = {
    instagram: socialLinks?.instagram || (author ? `https://instagram.com/${author.replace('@', '')}` : undefined),
    telegram: socialLinks?.telegram || (author ? `https://t.me/${author.replace('@', '')}` : undefined),
    twitter: socialLinks?.twitter || (author ? `https://x.com/${author.replace('@', '')}` : undefined),
    portfolio: socialLinks?.portfolio || (author ? `https://${author.replace('@', '')}.design` : undefined),
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Submission details: ${title}`}
        className="fixed inset-0 z-50 bg-[#0c0c10]/95 backdrop-blur-2xl flex flex-col overflow-y-auto animate-fade-in select-none text-white"
      >
        {/* ── Ultra-Clean Pro Header Bar ── */}
        <header className="sticky top-0 z-30 w-full bg-[#0c0c10]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            {category && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-white/10 text-[10px] font-bold uppercase tracking-wider shrink-0">
                {category}
              </span>
            )}
            <h2 className="text-sm sm:text-base font-bold text-white truncate drop-shadow">
              {title}
            </h2>
            {author && (
              <span className="text-xs text-neutral-400 hidden sm:inline truncate">
                by {author}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Minimal Fullscreen / Zoom Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreenModal(true);
                setZoomLevel(1);
              }}
              title="View fullscreen"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Maximize2 size={15} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* ── Main Layout: Dynamic Photo Stage + Clean Creator Column ── */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-5 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
            
            {/* ══════════════════════════════════════════════════════════ */}
            {/* PHOTO STAGE: immersive crop with no wasted frame space     */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center">
              
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                  setIsFullscreenModal(true);
                  setZoomLevel(1);
                }}
                className="relative w-full h-[58vh] sm:h-[68vh] lg:h-[76vh] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#121216] border border-white/5 shadow-2xl group cursor-zoom-in"
              >
                <Image
                  key={currentPhoto}
                  src={currentPhoto}
                  alt={title}
                  fill
                  priority
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 1024px) 100vw, 850px"
                  className={`object-cover object-center transition-transform duration-500 ${
                    isSelected ? 'scale-[1.02] origin-center' : 'group-hover:scale-[1.02]'
                  }`}
                />

                {/* 3. Subtle Voted Badge (only shown if selected) */}
                {isSelected && (
                  <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-emerald-400/40 animate-fade-in pointer-events-none">
                    <Check size={13} strokeWidth={3} />
                    <span>Выбрано</span>
                  </div>
                )}

                {/* 4. Photo index indicator (minimal pill, only for multiple photos) */}
                {allPhotos.length > 1 && (
                  <div className="absolute top-3 right-3 z-20 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-neutral-300 font-semibold text-[11px] tabular-nums border border-white/10 pointer-events-none">
                    {activeIndex + 1} / {allPhotos.length}
                  </div>
                )}

                {/* 5. Minimal sleek carousel arrows (subtle, visible on hover) */}
                {allPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrev();
                      }}
                      aria-label="Previous photo"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95"
                    >
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNext();
                      }}
                      aria-label="Next photo"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95"
                    >
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </div>

              {/* Minimal Thumbnail strip for multiple photos */}
              {allPhotos.length > 1 && (
                <div
                  ref={thumbnailScrollRef}
                  className="flex items-center gap-2 overflow-x-auto mt-3 py-1 no-scrollbar max-w-full"
                >
                  {allPhotos.map((photo, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={photo + idx}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`relative shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all duration-200 border ${
                          isActive
                            ? 'border-[#ff6a2b] ring-2 ring-[#ff6a2b]/30 scale-105 opacity-100'
                            : 'border-white/10 opacity-50 hover:opacity-90'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* RIGHT COLUMN: Creator, Bio, Socials & Voting Action        */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-4 flex flex-col space-y-3.5">
              
              {/* Creator Card */}
              {author && (
                <div className="bg-[#141418] border border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
                    {authorAvatar ? (
                      <Image
                        src={authorAvatar}
                        alt={author}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white bg-neutral-700">
                        {author.replace('@', '')[0]?.toUpperCase() || 'A'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white truncate">
                        {author.replace('@', '')}
                      </span>
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-neutral-400 truncate">
                      {author}
                    </p>
                  </div>
                </div>
              )}

              {/* Description & Work Details */}
              <div className="bg-[#141418] border border-white/5 rounded-2xl p-4 space-y-2.5 shadow-lg">
                <h3 className="text-base font-bold text-white leading-tight">
                  {title}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  {authorBio ||
                    `Конкурсная работа, представленная в данном раунде. Оцените композицию, освещение и технику исполнения.`}
                </p>

                {/* Compact Social Channels */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                  {resolvedSocials.instagram && (
                    <a
                      href={resolvedSocials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
                    >
                      <Camera size={12} className="text-pink-400" />
                      <span>Instagram</span>
                    </a>
                  )}

                  {resolvedSocials.telegram && (
                    <a
                      href={resolvedSocials.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
                    >
                      <Send size={12} className="text-sky-400" />
                      <span>Telegram</span>
                    </a>
                  )}

                  {resolvedSocials.twitter && (
                    <a
                      href={resolvedSocials.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
                    >
                      <Share2 size={12} className="text-blue-400" />
                      <span>X</span>
                    </a>
                  )}

                  {resolvedSocials.portfolio && (
                    <a
                      href={resolvedSocials.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
                    >
                      <Globe size={12} className="text-emerald-400" />
                      <span>Портфолио</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Sponsor Row (Minimal & Neat) */}
              {(sponsorName || prizePool) && (
                <div className="bg-[#141418] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-lg text-xs text-neutral-300">
                  <Award size={16} className="text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-white truncate block">
                      {sponsorName || 'Спонсор конкурса'}
                    </span>
                    {prizePool && (
                      <span className="text-[11px] text-amber-300/90 block">
                        Призовой фонд: {prizePool}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action: Vote Button */}
              {onVote && (
                <button
                  type="button"
                  onClick={() => {
                    onVote();
                    onClose();
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                      : 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white shadow-[#ff6a2b]/30'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>Выбранная работа</span>
                    </>
                  ) : (
                    <span>Проголосовать за эту работу</span>
                  )}
                </button>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* ── Immersive Fullscreen Zoom Mode ── */}
      {isFullscreenModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/98 flex flex-col justify-between animate-fade-in select-none text-white overflow-hidden"
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <span className="text-xs font-semibold text-neutral-300 truncate max-w-[60vw]">
              {title} {allPhotos.length > 1 && `(${activeIndex + 1} / ${allPhotos.length})`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1))}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                {zoomLevel === 1 ? <ZoomIn size={13} /> : <ZoomOut size={13} />}
                <span>{zoomLevel}x</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFullscreenModal(false);
                  setZoomLevel(1);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-90"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Fullscreen Stage with click-to-zoom */}
          <div
            className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-2 cursor-zoom-out"
            onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1))}
          >
            <div
              className="relative w-full h-full max-w-7xl max-h-screen transition-transform duration-200 flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <Image
                src={currentPhoto}
                alt={title}
                fill
                priority
                referrerPolicy="no-referrer"
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default PhotoLightbox;
