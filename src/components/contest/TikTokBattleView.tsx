"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronRight, ChevronUp, ChevronDown, Check, Sparkles } from 'lucide-react';
import { DescriptionSheet } from '../feed/DescriptionSheet';
import { BattleParticipantModal, BattleParticipantModalProps } from '@/components/battle/BattleParticipantModal';
import { PinchZoomImage } from '../common/PinchZoomImage';
import { preloadBattleImages } from '@/services/recommendationService';
import { useDeviceMode } from '@/hooks/useDeviceMode';
import { useUiPreferences } from '@/hooks/useUiPreferences';

import type {
  BattleCorner,
  BattleItem,
  CompetitorDetails,
} from '@/types/battle';

export type { BattleCorner, BattleItem, CompetitorDetails };

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

  const [lightboxData, setLightboxData] = useState<BattleParticipantModalProps | null>(null);

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

  const handleVoteWithHaptic = useCallback(
    (battleId: string, corner: 'red' | 'green') => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([25, 35, 20]);
        } catch (_) {}
      }
      onVote(battleId, corner);
    },
    [onVote]
  );

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
          <span className="font-display text-sm sm:text-base font-bold text-ink group-hover:text-accent transition-colors truncate drop-shadow-md">
            {currentBattle.title}
          </span>
          <ChevronRight
            size={16}
            className="text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
          />
        </Link>

        {/* Balanced spacer */}
        <div className="w-8 shrink-0" />
      </header>

      {/* Mobile Pinch Tip */}
      {showPinchNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-scrim border border-accent/40 text-ink text-[11px] font-bold flex items-center gap-2 shadow-2xl pointer-events-none animate-slide-down">
          <Sparkles size={13} className="text-accent shrink-0" />
          <span>Pinch to zoom</span>
        </div>
      )}

      {/* ── Vertical 50/50 Split 1v1 Arena ── */}
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
            {/* 1. TOP CARD (Side A)                                       */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              onClick={() => handleVoteWithHaptic(currentBattle.id, 'red')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-xl border border-side-a/70 bg-surface ${
                userVote === 'red'
                  ? 'scale-[0.99] ring-2 ring-side-a shadow-[0_0_35px_rgba(196,165,116,0.3)] z-10'
                  : userVote === 'green'
                  ? 'opacity-60'
                  : 'hover:brightness-105 active:scale-[0.99]'
              }`}
            >
              {/* Photo with pinch-to-zoom on mobile */}
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

              {/* Scrim Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Top Bar inside Card: Selection Badge + 40px Circle Expand Icon */}
              <div
                className={`absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  {userVote === 'red' && (
                    <span className="px-2.5 py-1 rounded-full bg-accent text-accent-fg font-black text-[11px] flex items-center gap-1 shadow-lg animate-fade-in border border-accent/40">
                      <Check size={12} strokeWidth={3} />
                      <span>Selected</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Author chip: clickable pill on scrim */}
              <div
                className={`absolute bottom-2.5 left-3 z-10 transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLightboxData({
                      isOpen: true,
                      onClose: () => setLightboxData(null),
                      photoUrl: currentBattle.red.photo,
                      photos: currentBattle.red.photos || [currentBattle.red.photo],
                      title: currentBattle.red.name,
                      author: currentBattle.red.author,
                      authorAvatar: currentBattle.red.authorAvatar,
                      authorBio: currentBattle.red.authorBio,
                      category: currentBattle.category,
                      corner: 'red',
                      opponentName: currentBattle.green.name,
                      opponentCorner: 'blue',
                      percentage: currentBattle.red.percent,
                      opponentPercentage: currentBattle.green.percent,
                      sponsorName: currentBattle.red.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.red.sponsorTier,
                      prizePool: currentBattle.red.prizePool,
                      tags: currentBattle.tags,
                      socialLinks: currentBattle.red.socialLinks,
                      isSelected: userVote === 'red',
                      onVote: () => onVote(currentBattle.id, 'red'),
                    });
                  }}
                  className="group/author bg-scrim hover:bg-surface-2/90 active:scale-95 px-3 py-1.5 rounded-full backdrop-blur-xs border border-line/60 hover:border-line flex items-center gap-2.5 shadow-lg cursor-pointer pointer-events-auto transition-all text-left"
                  aria-label={`Inspect ${currentBattle.red.name || currentBattle.red.author || 'competitor'} photo`}
                >
                  {currentBattle.red.authorAvatar ? (
                    <div className="relative w-9 h-9 rounded-full ring-2 ring-side-a overflow-hidden shrink-0 bg-surface-2">
                      {(() => {
                        const avatar = resolveImageUrl(currentBattle.red.authorAvatar, 'avatars');
                        return (
                          <Image
                            src={avatar}
                            alt={currentBattle.red.author || 'Author'}
                            fill
                            unoptimized={shouldBeUnoptimized(avatar)}
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                  <div className="min-w-0 pr-1">
                    {currentBattle.red.author && (
                      <span className="text-[14px] font-semibold text-ink group-hover/author:text-accent transition-colors truncate block leading-tight">
                        {currentBattle.red.author}
                      </span>
                    )}
                    {currentBattle.red.name && (
                      <span className="font-display text-[16px] text-ink group-hover/author:text-accent transition-colors truncate block leading-tight">
                        {currentBattle.red.name}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* CENTER: 56px VS BADGE OR 22px RESULT BAR                   */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              aria-hidden="true"
              className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 z-20 px-4 sm:px-8 pointer-events-none transition-all duration-300 ${
                cleanMode ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              {!userVote ? (
                /* Unvoted: 56px VS circle */
                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-accent text-on-accent border-4 border-bg font-black text-sm flex items-center justify-center shadow-lg">
                    VS
                  </div>
                </div>
              ) : (
                /* Voted: 22px high Result Bar (track surface-2, side A segment, side B segment) */
                <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-1.5 animate-fade-in">
                  <div className="w-full h-[22px] rounded-full overflow-hidden bg-surface-2 flex items-center border border-line shadow-lg">
                    <div
                      className="bg-side-a h-full flex items-center px-2 text-on-accent font-display text-xs font-bold transition-all duration-500 overflow-hidden"
                      style={{ width: `${currentBattle.red.percent}%` }}
                    >
                      <span className="truncate">{currentBattle.red.percent}%</span>
                    </div>
                    <div
                      className="bg-side-b h-full flex items-center justify-end px-2 text-on-side-b font-display text-xs font-bold transition-all duration-500 overflow-hidden"
                      style={{ width: `${currentBattle.green.percent}%` }}
                    >
                      <span className="truncate">{currentBattle.green.percent}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* 2. BOTTOM CARD (Side B)                                    */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              onClick={() => handleVoteWithHaptic(currentBattle.id, 'green')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-xl border border-side-b/70 bg-surface ${
                userVote === 'green'
                  ? 'scale-[0.99] ring-2 ring-side-b shadow-[0_0_35px_rgba(138,160,196,0.3)] z-10'
                  : userVote === 'red'
                  ? 'opacity-60'
                  : 'hover:brightness-105 active:scale-[0.99]'
              }`}
            >
              {/* Photo with pinch-to-zoom on mobile */}
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

              {/* Scrim Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Top Bar inside Bottom Card: Selection Badge + 40px Circle Expand Icon */}
              <div
                className={`absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div>
                  {userVote === 'green' && (
                    <span className="px-2.5 py-1 rounded-full bg-accent text-accent-fg font-black text-[11px] flex items-center gap-1 shadow-lg animate-fade-in border border-accent/40">
                      <Check size={12} strokeWidth={3} />
                      <span>Selected</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Author chip: clickable pill on scrim */}
              <div
                className={`absolute bottom-2.5 left-3 z-10 transition-opacity duration-300 ${
                  cleanMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLightboxData({
                      isOpen: true,
                      onClose: () => setLightboxData(null),
                      photoUrl: currentBattle.green.photo,
                      photos: currentBattle.green.photos || [currentBattle.green.photo],
                      title: currentBattle.green.name,
                      author: currentBattle.green.author,
                      authorAvatar: currentBattle.green.authorAvatar,
                      authorBio: currentBattle.green.authorBio,
                      category: currentBattle.category,
                      corner: 'blue',
                      opponentName: currentBattle.red.name,
                      opponentCorner: 'red',
                      percentage: currentBattle.green.percent,
                      opponentPercentage: currentBattle.red.percent,
                      sponsorName: currentBattle.green.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.green.sponsorTier,
                      prizePool: currentBattle.green.prizePool,
                      tags: currentBattle.tags,
                      socialLinks: currentBattle.green.socialLinks,
                      isSelected: userVote === 'green',
                      onVote: () => onVote(currentBattle.id, 'green'),
                    });
                  }}
                  className="group/author bg-scrim hover:bg-surface-2/90 active:scale-95 px-3 py-1.5 rounded-full backdrop-blur-xs border border-line/60 hover:border-line flex items-center gap-2.5 shadow-lg cursor-pointer pointer-events-auto transition-all text-left"
                  aria-label={`Inspect ${currentBattle.green.name || currentBattle.green.author || 'competitor'} photo`}
                >
                  {currentBattle.green.authorAvatar ? (
                    <div className="relative w-9 h-9 rounded-full ring-2 ring-side-b overflow-hidden shrink-0 bg-surface-2">
                      {(() => {
                        const avatar = resolveImageUrl(currentBattle.green.authorAvatar, 'avatars');
                        return (
                          <Image
                            src={avatar}
                            alt={currentBattle.green.author || 'Author'}
                            fill
                            unoptimized={shouldBeUnoptimized(avatar)}
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                  <div className="min-w-0 pr-1">
                    {currentBattle.green.author && (
                      <span className="text-[14px] font-semibold text-ink group-hover/author:text-accent transition-colors truncate block leading-tight">
                        {currentBattle.green.author}
                      </span>
                    )}
                    {currentBattle.green.name && (
                      <span className="font-display text-[16px] text-ink group-hover/author:text-accent transition-colors truncate block leading-tight">
                        {currentBattle.green.name}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop-Only Status Bar ── */}
      <footer className="mt-1 pt-1 hidden lg:flex items-center justify-between text-muted text-xs shrink-0 z-20 px-2 border-t border-line">
        <div className="flex items-center gap-3 text-[11px] text-faint">
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[10px] border border-line">1</kbd> Vote for top</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[10px] border border-line">2</kbd> Vote for bottom</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-2 text-ink font-mono text-[10px] border border-line">↑/↓</kbd> Navigate</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label="Previous battle"
            className="w-7 h-7 rounded-full bg-surface-2 border border-line hover:bg-surface disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-muted transition-colors active:scale-95"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next battle"
            className="w-7 h-7 rounded-full bg-surface-2 border border-line hover:bg-surface flex items-center justify-center text-muted transition-colors active:scale-95"
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

      {/* ── Battle Participant Details Modal (with Swipe Carousel) ── */}
      {lightboxData && (
        <BattleParticipantModal
          {...lightboxData}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}
