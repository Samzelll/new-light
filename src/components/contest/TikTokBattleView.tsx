"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronRight, ChevronUp, ChevronDown, Check, Maximize2, Sparkles } from 'lucide-react';
import { DescriptionSheet } from '../feed/DescriptionSheet';
import { PhotoLightbox } from '../common/PhotoLightbox';
import { PinchZoomImage } from '../common/PinchZoomImage';
import { preloadBattleImages } from '@/services/recommendationService';
import { useDeviceMode } from '@/hooks/useDeviceMode';
import { useUiPreferences } from '@/hooks/useUiPreferences';

export interface CompetitorDetails {
  id: string;
  name: string;
  author: string;
  photo: string;
  photos?: string[];
  percent: number;
  authorAvatar?: string;
  authorBio?: string;
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    twitter?: string;
    portfolio?: string;
  };
}

export interface BattleItem {
  id: string;
  contestId?: string;
  title: string;
  category: string;
  timeRemaining?: string;
  tags?: string[];
  isPopular?: boolean;
  sponsorName?: string;
  red: CompetitorDetails;
  green: CompetitorDetails;
}

export interface TikTokBattleViewProps {
  battles: BattleItem[];
  contestsMap: Record<string, any>;
  battleVotes: Record<string, 'red' | 'green'>;
  onVote: (battleId: string, corner: 'red' | 'green') => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
}

export function TikTokBattleView({
  battles,
  contestsMap,
  battleVotes,
  onVote,
  onResetFilters,
  onLoadMore,
}: TikTokBattleViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [showPinchNotice, setShowPinchNotice] = useState(false);

  const { isMobile, isDesktop } = useDeviceMode();
  const {
    cleanMode,
    toggleCleanMode,
    hasSeenPinchTip,
    markPinchTipSeen,
  } = useUiPreferences();

  const [lightboxData, setLightboxData] = useState<{
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
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  // Auto-hide pinch & clean tips on mobile after first encounter
  useEffect(() => {
    if (isMobile && !hasSeenPinchTip) {
      setShowPinchNotice(true);
      const timer = setTimeout(() => {
        setShowPinchNotice(false);
        markPinchTipSeen();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, hasSeenPinchTip, markPinchTipSeen]);

  // Keep index within bounds when filtered battles change
  useEffect(() => {
    if (currentIndex >= battles.length && battles.length > 0) {
      setCurrentIndex(0);
    }
  }, [battles.length, currentIndex]);

  // Proactive preloading of upcoming battle photos
  useEffect(() => {
    preloadBattleImages(battles, currentIndex);
  }, [currentIndex, battles]);

  // Infinite recommendation threshold: request more battles when near end
  useEffect(() => {
    if (battles.length > 0 && currentIndex >= battles.length - 2) {
      if (onLoadMore) {
        onLoadMore();
      }
    }
  }, [currentIndex, battles.length, onLoadMore]);

  const goToNext = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [battles.length]);

  const goToPrev = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + battles.length) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [battles.length]);

  // Native mobile touch swipe listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (deltaY > 45) {
      // Swiped UP -> Next battle
      goToNext();
    } else if (deltaY < -45) {
      // Swiped DOWN -> Previous battle
      goToPrev();
    }
  };

  // Keyboard navigation & quick voting for Desktop (PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDescriptionOpen || lightboxData) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const current = battles[currentIndex];
      if (!current) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === '1') {
        // Quick vote Top
        e.preventDefault();
        onVote(current.id, 'red');
      } else if (e.key === '2') {
        // Quick vote Bottom
        e.preventDefault();
        onVote(current.id, 'green');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isDescriptionOpen, lightboxData, battles, currentIndex, onVote]);

  // Framer-motion pan drag fallback for desktop dragging
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetThreshold = 35;
    const velocityThreshold = 140;

    if (info.offset.y < -offsetThreshold || info.velocity.y < -velocityThreshold) {
      goToNext();
    } else if (info.offset.y > offsetThreshold || info.velocity.y > velocityThreshold) {
      goToPrev();
    }
  };

  // Mouse wheel scroll handler (TikTok desktop feel with debounce)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelTimer: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      if (isDescriptionOpen || lightboxData) return;
      accumulatedDelta += e.deltaY;

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (accumulatedDelta > 35) {
          goToNext();
        } else if (accumulatedDelta < -35) {
          goToPrev();
        }
        accumulatedDelta = 0;
      }, 60);
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [goToNext, goToPrev, isDescriptionOpen, lightboxData]);

  if (battles.length === 0) {
    return (
      <div className="flex-1 px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl mb-4">
          ⚔️
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          No active battles match your current filters
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">
          Try resetting tags or changing your search query.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-full bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs shadow-lg shadow-[#ff6a2b]/20 transition-all active:scale-95"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  const currentBattle = battles[currentIndex];
  const currentContest = currentBattle.contestId
    ? contestsMap[currentBattle.contestId]
    : null;
  const userVote = battleVotes[currentBattle.id] || null;

  const targetContestId = currentBattle.contestId || currentBattle.id;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col relative select-none px-1 pt-0 pb-1 md:pb-16 lg:pb-0 overflow-hidden h-full w-full min-h-0"
    >
      {/* ── Top Bar: Contest Title ── */}
      <header className="flex items-center justify-between px-3 py-1.5 shrink-0 z-30 transition-all duration-300 w-full">
        <div className="w-8 shrink-0" />

        <Link
          href={`/contest/${targetContestId}`}
          className="group inline-flex items-center justify-center gap-1.5 max-w-[80%] text-center cursor-pointer transition-all active:scale-95"
          title="Open contest details & rules"
        >
          <span className="text-sm sm:text-base font-black tracking-wide text-white group-hover:text-[#ff6a2b] transition-colors truncate drop-shadow-md">
            {currentBattle.title}
          </span>
          <ChevronRight
            size={16}
            className="text-neutral-500 group-hover:text-[#ff6a2b] group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
          />
        </Link>

        {/* Balanced spacer */}
        <div className="w-8 shrink-0" />
      </header>

      {/* Mobile Pinch Tip (Shown once to mobile users, then auto-hidden) */}
      {showPinchNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-[#ff6a2b]/40 text-white text-[11px] font-bold flex items-center gap-2 shadow-2xl pointer-events-none animate-slide-down">
          <Sparkles size={13} className="text-[#ff6a2b] shrink-0" />
          <span>Pinch to zoom</span>
        </div>
      )}

      {/* ── Vertical 50/50 Split 1v1 Arena (Maximizing Touch Space & Smooth Pinch-to-zoom) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 w-full h-full pb-0.5">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentBattle.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                y: d > 0 ? 80 : -80,
                opacity: 0,
                scale: 0.98,
              }),
              center: {
                y: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  y: { type: 'spring', stiffness: 360, damping: 32 },
                  opacity: { duration: 0.18 },
                },
              },
              exit: (d: number) => ({
                y: d > 0 ? -80 : 80,
                opacity: 0,
                scale: 0.98,
                transition: { duration: 0.16 },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="flex-1 flex flex-col h-full min-h-0 relative bg-transparent border-none shadow-none cursor-grab active:cursor-grabbing gap-1.5"
          >
            {/* ══════════════════════════════════════════════════════════ */}
            {/* 1. TOP CARD (Takes Exactly 50% Height)                     */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              onClick={() => onVote(currentBattle.id, 'red')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
                userVote === 'red'
                  ? 'scale-[0.98] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : userVote
                  ? 'opacity-85 brightness-[0.8]'
                  : 'hover:brightness-105 active:scale-[0.99]'
              }`}
            >
              {/* Photo with Instagram-style pinch-to-zoom on mobile */}
              <PinchZoomImage
                src={currentBattle.red.photo}
                alt={currentBattle.red.name}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className={`object-cover object-center transition-transform duration-500 ${
                  userVote === 'red' ? '' : 'group-hover:scale-105'
                }`}
                priority
                referrerPolicy="no-referrer"
                containerClassName="w-full h-full"
              />

              {/* Scrim Gradients: smoothly fades out in clean mode */}
              <div
                className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Top Bar inside Card: Selection Badge + Enlarge Icon */}
              <div
                className={`absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  {userVote === 'red' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in">
                      <Check size={12} strokeWidth={3} />
                      <span>Selected</span>
                    </span>
                  )}
                </div>

                {/* Enlarge / Full Details Icon: subtle on mobile, visible on desktop hover or click */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxData({
                      photoUrl: currentBattle.red.photo,
                      photos: currentBattle.red.photos || [currentBattle.red.photo],
                      title: currentBattle.red.name,
                      author: currentBattle.red.author,
                      authorAvatar: currentBattle.red.authorAvatar,
                      authorBio: currentBattle.red.authorBio,
                      category: currentBattle.category,
                      sponsorName: currentBattle.red.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.red.sponsorTier,
                      prizePool: currentBattle.red.prizePool,
                      socialLinks: currentBattle.red.socialLinks,
                      isSelected: userVote === 'red',
                      onVote: () => onVote(currentBattle.id, 'red'),
                    });
                  }}
                  aria-label="Enlarge photo & view details"
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/85 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-90 border border-white/20 shadow-md ml-auto ${
                    isMobile ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>
              </div>

              {/* Bottom Info on Photo: Author Avatar + Name + Work Title */}
              <div
                className={`absolute bottom-2.5 left-3 right-20 z-10 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentBattle.red.author && currentBattle.red.authorAvatar && (
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                      <Image
                        src={currentBattle.red.authorAvatar}
                        alt={currentBattle.red.author}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {currentBattle.red.author && (
                      <span className="text-xs sm:text-sm font-black text-white drop-shadow-lg truncate block leading-tight">
                        {currentBattle.red.author}
                      </span>
                    )}
                    {currentBattle.red.name && (
                      <span
                        className={`${
                          currentBattle.red.author
                            ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5'
                            : 'text-sm sm:text-base font-black text-white'
                        } drop-shadow truncate block leading-tight`}
                      >
                        {currentBattle.red.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Percentage if voted */}
              {userVote && (
                <div
                  className={`absolute bottom-2.5 right-3 z-10 transition-opacity duration-300 ${
                    cleanMode ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                      userVote === 'red'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                        : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                    }`}
                  >
                    {currentBattle.red.percent}%
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* CENTER "VS" BADGE (Disappears in Clean Mode)               */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              aria-hidden="true"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#ff6a2b] to-[#e04500] border-2 border-[#0b0b0d] flex items-center justify-center font-black text-xs text-white shadow-2xl pointer-events-none ring-2 ring-white/20 transition-all duration-300 ${
                cleanMode ? 'opacity-0 scale-75' : 'opacity-100 scale-100 animate-pulse'
              }`}
            >
              VS
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 2. BOTTOM CARD (Takes Exactly 50% Height)                  */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              onClick={() => onVote(currentBattle.id, 'green')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
                userVote === 'green'
                  ? 'scale-[0.98] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : userVote
                  ? 'opacity-85 brightness-[0.8]'
                  : 'hover:brightness-105 active:scale-[0.99]'
              }`}
            >
              {/* Photo with Instagram-style pinch-to-zoom on mobile */}
              <PinchZoomImage
                src={currentBattle.green.photo}
                alt={currentBattle.green.name}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className={`object-cover object-center transition-transform duration-500 ${
                  userVote === 'green' ? '' : 'group-hover:scale-105'
                }`}
                priority
                referrerPolicy="no-referrer"
                containerClassName="w-full h-full"
              />

              {/* Scrim Gradients: smoothly fades out in clean mode */}
              <div
                className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Top Bar inside Bottom Card: Selection Badge + Enlarge Icon */}
              <div
                className={`absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  {userVote === 'green' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in">
                      <Check size={12} strokeWidth={3} />
                      <span>Selected</span>
                    </span>
                  )}
                </div>

                {/* Enlarge / Full Details Icon: subtle on mobile, visible on desktop hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxData({
                      photoUrl: currentBattle.green.photo,
                      photos: currentBattle.green.photos || [currentBattle.green.photo],
                      title: currentBattle.green.name,
                      author: currentBattle.green.author,
                      authorAvatar: currentBattle.green.authorAvatar,
                      authorBio: currentBattle.green.authorBio,
                      category: currentBattle.category,
                      sponsorName: currentBattle.green.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.green.sponsorTier,
                      prizePool: currentBattle.green.prizePool,
                      socialLinks: currentBattle.green.socialLinks,
                      isSelected: userVote === 'green',
                      onVote: () => onVote(currentBattle.id, 'green'),
                    });
                  }}
                  aria-label="Enlarge photo & view details"
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/85 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-xs transition-all active:scale-90 border border-white/20 shadow-md ml-auto ${
                    isMobile ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>
              </div>

              {/* Bottom Info on Photo: Author Avatar + Name + Work Title */}
              <div
                className={`absolute bottom-2.5 left-3 right-20 z-10 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {currentBattle.green.author && currentBattle.green.authorAvatar && (
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                      <Image
                        src={currentBattle.green.authorAvatar}
                        alt={currentBattle.green.author}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {currentBattle.green.author && (
                      <span className="text-xs sm:text-sm font-black text-white drop-shadow-lg truncate block leading-tight">
                        {currentBattle.green.author}
                      </span>
                    )}
                    {currentBattle.green.name && (
                      <span
                        className={`${
                          currentBattle.green.author
                            ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5'
                            : 'text-sm sm:text-base font-black text-white'
                        } drop-shadow truncate block leading-tight`}
                      >
                        {currentBattle.green.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Percentage if voted */}
              {userVote && (
                <div
                  className={`absolute bottom-2.5 right-3 z-10 transition-opacity duration-300 ${
                    cleanMode ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <div
                    className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                      userVote === 'green'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                        : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                    }`}
                  >
                    {currentBattle.green.percent}%
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop-Only Status Bar: Keyboard Shortcuts + Arrow Nav Buttons (Strictly hidden on Mobile) ── */}
      <footer className="mt-1 pt-1 hidden lg:flex items-center justify-between text-neutral-400 text-xs shrink-0 z-20 px-2 border-t border-neutral-900">
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">1</kbd> Vote for top</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">2</kbd> Vote for bottom</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[10px]">↑/↓</kbd> Navigate</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label="Previous battle"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 transition-colors active:scale-95"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next battle"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-neutral-300 transition-colors active:scale-95"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </footer>

      {/* ── Contest Description Bottom Sheet ── */}
      <DescriptionSheet
        isOpen={isDescriptionOpen}
        onClose={() => setIsDescriptionOpen(false)}
        contest={
          currentContest || {
            title: currentBattle.title,
            description: `Live 1v1 battle duel between ${currentBattle.red.name} and ${currentBattle.green.name}. Cast your vote to crown the winner of this round!`,
            category: currentBattle.category,
          }
        }
        stageInfo="1v1 Battle Duel"
      />

      {/* ── Photo Lightbox (High-Resolution Zoom & Full Creator/Sponsor Page) ── */}
      {lightboxData && (
        <PhotoLightbox
          isOpen={Boolean(lightboxData)}
          onClose={() => setLightboxData(null)}
          photoUrl={lightboxData.photoUrl}
          photos={lightboxData.photos}
          title={lightboxData.title}
          author={lightboxData.author}
          authorAvatar={lightboxData.authorAvatar}
          authorBio={lightboxData.authorBio}
          category={lightboxData.category}
          sponsorName={lightboxData.sponsorName}
          sponsorTier={lightboxData.sponsorTier}
          prizePool={lightboxData.prizePool}
          socialLinks={lightboxData.socialLinks}
          isSelected={lightboxData.isSelected}
          onVote={lightboxData.onVote}
        />
      )}
    </div>
  );
}
