"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Check, Info, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import type { Group, Contest } from '@/services/types';
import { DescriptionSheet } from './DescriptionSheet';

export interface TikTokFeedViewProps {
  groups: Group[];
  contestsMap: Record<string, any>;
  groupVotes: Record<string, string>;
  onVote: (groupId: string, participantId: string) => void;
  onResetFilters?: () => void;
}

export function TikTokFeedView({
  groups,
  contestsMap,
  groupVotes,
  onVote,
  onResetFilters,
}: TikTokFeedViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);

  // Keep index within bounds when filtered groups change
  useEffect(() => {
    if (currentIndex >= groups.length && groups.length > 0) {
      setCurrentIndex(0);
    }
  }, [groups.length, currentIndex]);

  // Preload next and previous groups' images into browser cache
  useEffect(() => {
    if (groups.length === 0) return;

    const indicesToPreload = [
      (currentIndex + 1) % groups.length,
      (currentIndex + 2) % groups.length,
      (currentIndex - 1 + groups.length) % groups.length,
    ];

    indicesToPreload.forEach((idx) => {
      const targetGroup = groups[idx];
      if (targetGroup?.members) {
        targetGroup.members.forEach((m) => {
          if (m.photo && typeof window !== 'undefined') {
            const img = new window.Image();
            img.src = m.photo;
          }
        });
      }
    });
  }, [currentIndex, groups]);

  const goToNext = useCallback(() => {
    if (groups.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % groups.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 320);
  }, [groups.length]);

  const goToPrev = useCallback(() => {
    if (groups.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + groups.length) % groups.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 320);
  }, [groups.length]);

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

  // Touch & Drag handler for TikTok-style swipe
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetThreshold = 40;
    const velocityThreshold = 180;

    if (info.offset.y < -offsetThreshold || info.velocity.y < -velocityThreshold) {
      // Swiped UP -> Go to NEXT
      goToNext();
    } else if (info.offset.y > offsetThreshold || info.velocity.y > velocityThreshold) {
      // Swiped DOWN -> Go to PREVIOUS
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

  if (groups.length === 0) {
    return (
      <div className="flex-1 px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl mb-4">
          🔍
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          No groups match your current filters
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">
          Try resetting tags or search parameters to view all active voting groups.
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

  const currentGroup = groups[currentIndex];
  const currentContest = contestsMap[currentGroup.contestId] || null;
  const currentVoteId = groupVotes[currentGroup.id] || null;

  // Short clean title as requested
  const shortTitle =
    currentGroup.contestTitle?.replace(/·.*/, '').trim() ||
    currentContest?.title ||
    'GROUP ROUND';
  const stageSubtitle =
    currentGroup.contestTitle?.includes('·')
      ? currentGroup.contestTitle.split('·')[1].trim()
      : `Round ${currentGroup.roundNumber || 1}`;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-between relative select-none touch-pan-x px-3 pt-1 pb-2 overflow-hidden"
    >
      {/* ── Top Bar: Short Title + Counter + "Description" Button ── */}
      <header className="flex items-center justify-between bg-[#141418] border border-neutral-800/80 px-3 py-2 rounded-2xl mb-2 shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff6a2b] animate-pulse" />
            <h2 className="text-xs font-black text-white uppercase tracking-tight truncate">
              {shortTitle}
            </h2>
            <span className="text-[10px] text-neutral-400 font-bold shrink-0">
              · {stageSubtitle}
            </span>
          </div>
        </div>

        {/* Right side: Group counter & "Description" modal button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-300 tabular-nums">
            {currentIndex + 1} / {groups.length}
          </span>
          <button
            type="button"
            onClick={() => setIsDescriptionOpen(true)}
            aria-label="Open contest details"
            className="px-2.5 py-1 rounded-full bg-[#202026] hover:bg-[#2b2b34] text-neutral-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors border border-neutral-700/60"
          >
            <Info size={13} className="text-[#ff6a2b]" strokeWidth={2.4} />
            <span>Details</span>
          </button>
        </div>
      </header>

      {/* ── Interactive TikTok-style Card (Draggable Vertical Swipe) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-[440px]">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentGroup.id}
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
            {/* 4 Entrants 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
              {currentGroup.members.slice(0, 4).map((member, idx) => {
                const isSelected = currentVoteId === member.participantId;
                const sharePct = [44, 28, 17, 11][idx % 4];

                return (
                  <div
                    key={member.participantId}
                    onClick={() => onVote(currentGroup.id, member.participantId)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer bg-[#141418] border transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#ff6a2b] ring-2 ring-[#ff6a2b]/40 shadow-lg shadow-[#ff6a2b]/25'
                        : 'border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    {/* Photo with aspect fill */}
                    <div className="relative w-full h-full min-h-[175px] sm:min-h-[195px] overflow-hidden bg-neutral-900">
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={member.title}
                          fill
                          sizes="(max-width: 448px) 50vw, 220px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                          Photo
                        </div>
                      )}

                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                      {/* Vote Choice Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-[#ff6a2b] text-white font-bold text-[10px] flex items-center gap-1 shadow-md animate-fade-in">
                          <Check size={11} strokeWidth={3} />
                          <span>Your Pick</span>
                        </div>
                      )}

                      {/* Percentage share if voted */}
                      {currentVoteId && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs font-black text-[11px] text-white border border-neutral-700">
                          {sharePct}%
                        </div>
                      )}

                      {/* Clean title at bottom */}
                      <div className="absolute bottom-2 left-2 right-2 z-10">
                        <h4 className="text-[12px] font-bold text-white truncate leading-tight drop-shadow-sm">
                          {member.title}
                        </h4>
                      </div>
                    </div>

                    {/* Voting Progress Line */}
                    {currentVoteId && (
                      <div className="h-1 bg-neutral-800 w-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isSelected ? 'bg-[#ff6a2b]' : 'bg-neutral-600'
                          }`}
                          style={{ width: `${sharePct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
            aria-label="Previous group"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 transition-colors"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next group"
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
        contest={currentContest}
        stageInfo={`Group ${currentIndex + 1} of ${groups.length}`}
      />
    </div>
  );
}
