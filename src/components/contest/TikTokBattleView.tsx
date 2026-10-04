"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Info, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { Contest } from '@/services/types';
import { DescriptionSheet } from '../feed/DescriptionSheet';

export interface BattleItem {
  id: string;
  contestId?: string;
  title: string;
  category: string;
  timeRemaining?: string;
  tags?: string[];
  isPopular?: boolean;
  red: {
    id: string;
    name: string;
    author: string;
    photo: string;
    percent: number;
  };
  green: {
    id: string;
    name: string;
    author: string;
    photo: string;
    percent: number;
  };
}

export interface TikTokBattleViewProps {
  battles: BattleItem[];
  contestsMap: Record<string, any>;
  battleVotes: Record<string, 'red' | 'green'>;
  onVote: (battleId: string, corner: 'red' | 'green') => void;
  onResetFilters?: () => void;
}

export function TikTokBattleView({
  battles,
  contestsMap,
  battleVotes,
  onVote,
  onResetFilters,
}: TikTokBattleViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);

  // Keep index within bounds when filtered battles change
  useEffect(() => {
    if (currentIndex >= battles.length && battles.length > 0) {
      setCurrentIndex(0);
    }
  }, [battles.length, currentIndex]);

  // Preload upcoming and previous battle images into browser cache
  useEffect(() => {
    if (battles.length === 0) return;

    const indicesToPreload = [
      (currentIndex + 1) % battles.length,
      (currentIndex + 2) % battles.length,
      (currentIndex - 1 + battles.length) % battles.length,
    ];

    indicesToPreload.forEach((idx) => {
      const b = battles[idx];
      if (b && typeof window !== 'undefined') {
        if (b.red?.photo) {
          const img1 = new window.Image();
          img1.src = b.red.photo;
        }
        if (b.green?.photo) {
          const img2 = new window.Image();
          img2.src = b.green.photo;
        }
      }
    });
  }, [currentIndex, battles]);

  const goToNext = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 320);
  }, [battles.length]);

  const goToPrev = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + battles.length) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 320);
  }, [battles.length]);

  // Keyboard navigation (ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDescriptionOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isDescriptionOpen]);

  // Touch Drag handler for TikTok-style swipe
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetThreshold = 40;
    const velocityThreshold = 180;

    if (info.offset.y < -offsetThreshold || info.velocity.y < -velocityThreshold) {
      goToNext();
    } else if (info.offset.y > offsetThreshold || info.velocity.y > velocityThreshold) {
      goToPrev();
    }
  };

  // Mouse wheel scroll handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let wheelTimer: NodeJS.Timeout | null = null;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      if (isDescriptionOpen) return;
      accumulatedDelta += e.deltaY;

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (accumulatedDelta > 40) {
          goToNext();
        } else if (accumulatedDelta < -40) {
          goToPrev();
        }
        accumulatedDelta = 0;
      }, 70);
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
    };
  }, [goToNext, goToPrev, isDescriptionOpen]);

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

  // Short clean title
  const shortTitle =
    currentBattle.title?.replace(/·.*/, '').trim() ||
    currentContest?.title ||
    '1v1 BATTLE';

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-between relative select-none touch-pan-x px-3 pt-1 pb-2 overflow-hidden"
    >
      {/* ── Top Bar: Short Title + Live Pill + "Details" Button ── */}
      <header className="flex items-center justify-between bg-[#141418] border border-neutral-800/80 px-3 py-2 rounded-2xl mb-2 shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xs font-black text-white uppercase tracking-tight truncate">
              {shortTitle}
            </h2>
            <span className="text-[10px] text-neutral-400 font-bold shrink-0">
              · 1v1
            </span>
          </div>
        </div>

        {/* Right side: Counter & "Details" button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-300 tabular-nums">
            {currentIndex + 1} / {battles.length}
          </span>
          <button
            type="button"
            onClick={() => setIsDescriptionOpen(true)}
            aria-label="Battle details"
            className="px-2.5 py-1 rounded-full bg-[#202026] hover:bg-[#2b2b34] text-neutral-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors border border-neutral-700/60"
          >
            <Info size={13} className="text-[#ff6a2b]" strokeWidth={2.4} />
            <span>Details</span>
          </button>
        </div>
      </header>

      {/* ── Interactive TikTok-style 1v1 Arena (Draggable Vertical Swipe) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-[440px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentBattle.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                y: d > 0 ? 120 : -120,
                opacity: 0,
                scale: 0.96,
              }),
              center: {
                y: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  y: { type: 'spring', stiffness: 350, damping: 32 },
                  opacity: { duration: 0.2 },
                },
              },
              exit: (d: number) => ({
                y: d > 0 ? -120 : 120,
                opacity: 0,
                scale: 0.96,
                transition: { duration: 0.18 },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.22}
            onDragEnd={handleDragEnd}
            className="flex-1 flex flex-col justify-between cursor-grab active:cursor-grabbing"
          >
            {/* Split Screen 1v1 Arena */}
            <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-[#161619] shadow-2xl flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-2 flex-1 relative min-h-0">
                {/* Red Corner (Left) */}
                <div
                  onClick={() => onVote(currentBattle.id, 'red')}
                  className={`group relative overflow-hidden cursor-pointer transition-all border-r border-black/50 ${
                    userVote === 'red' ? 'ring-2 ring-red-500 z-10' : ''
                  }`}
                >
                  <Image
                    src={currentBattle.red.photo}
                    alt={currentBattle.red.name}
                    fill
                    sizes="(max-width: 448px) 50vw, 220px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                  {/* Corner Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-red-600/90 text-white font-bold text-[10px] shadow">
                    Red Corner
                  </div>

                  {/* Selected check */}
                  {userVote === 'red' && (
                    <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] flex items-center gap-1 shadow">
                      <Check size={11} strokeWidth={3} />
                      <span>Your Pick</span>
                    </div>
                  )}

                  {/* Percentage share if voted */}
                  {userVote && (
                    <div className="absolute bottom-12 left-2.5 z-10 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs font-black text-xs text-red-400 border border-red-500/40">
                      {currentBattle.red.percent}%
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                      {currentBattle.red.name}
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                      {currentBattle.red.author}
                    </p>
                  </div>
                </div>

                {/* VS Badge in Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#ff6a2b] border-2 border-black flex items-center justify-center font-black text-xs text-white shadow-xl pointer-events-none">
                  VS
                </div>

                {/* Green Corner (Right) */}
                <div
                  onClick={() => onVote(currentBattle.id, 'green')}
                  className={`group relative overflow-hidden cursor-pointer transition-all ${
                    userVote === 'green' ? 'ring-2 ring-emerald-500 z-10' : ''
                  }`}
                >
                  <Image
                    src={currentBattle.green.photo}
                    alt={currentBattle.green.name}
                    fill
                    sizes="(max-width: 448px) 50vw, 220px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                  {/* Corner Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white font-bold text-[10px] shadow">
                    Green Corner
                  </div>

                  {/* Selected check */}
                  {userVote === 'green' && (
                    <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow">
                      <Check size={11} strokeWidth={3} />
                      <span>Your Pick</span>
                    </div>
                  )}

                  {/* Percentage share if voted */}
                  {userVote && (
                    <div className="absolute bottom-12 right-2.5 z-10 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs font-black text-xs text-emerald-400 border border-emerald-500/40">
                      {currentBattle.green.percent}%
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 z-10 text-right">
                    <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                      {currentBattle.green.name}
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                      {currentBattle.green.author}
                    </p>
                  </div>
                </div>
              </div>

              {/* Live percent progress bar */}
              {userVote && (
                <div className="h-1.5 w-full flex bg-neutral-900 shrink-0">
                  <div
                    className="bg-red-500 transition-all duration-700"
                    style={{ width: `${currentBattle.red.percent}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all duration-700"
                    style={{ width: `${currentBattle.green.percent}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Minimalist TikTok Swipe Navigation Footer ── */}
      <footer className="mt-2 pt-1 flex items-center justify-between text-neutral-400 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-neutral-500">Swipe up / down</span>
          <span className="text-[10px] text-neutral-600">or use arrows</span>
        </div>

        {/* Up / Down Chevrons for Desktop / Click */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label="Previous battle"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next battle"
            className="w-7 h-7 rounded-full bg-[#ff6a2b] hover:bg-[#ff7a3d] flex items-center justify-center text-white transition-colors shadow-md shadow-[#ff6a2b]/20"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </footer>

      {/* ── Full Description Sheet (Opened by "Details" button) ── */}
      <DescriptionSheet
        isOpen={isDescriptionOpen}
        onClose={() => setIsDescriptionOpen(false)}
        contest={
          currentContest || {
            id: currentBattle.id,
            title: currentBattle.title,
            description: `Live 1v1 battle in category ${currentBattle.category}. Pick your favorite entrant to advance.`,
            categoryId: currentBattle.category,
            prize: '$1,000 + Trophy',
            quickRules: [
              'Vote once for one of the two competitors',
              'Live percentages available after casting vote',
              'Winner advances to playoffs',
            ],
            status: 'active',
            type: 'battle',
            isFeatured: currentBattle.isPopular,
          } as any
        }
        stageInfo={`Battle ${currentIndex + 1} of ${battles.length}`}
      />
    </div>
  );
}
