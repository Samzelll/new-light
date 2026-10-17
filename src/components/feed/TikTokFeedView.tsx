"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Check, ChevronRight, ChevronUp, ChevronDown, Maximize2, Sparkles } from 'lucide-react';
import type { Group, Contest } from '@/services/types';
import { DescriptionSheet } from './DescriptionSheet';
import { PhotoLightbox } from '../common/PhotoLightbox';
import { preloadGroupImages } from '@/services/recommendationService';

export interface TikTokFeedViewProps {
  groups: Group[];
  contestsMap: Record<string, any>;
  groupVotes: Record<string, string>;
  onVote: (groupId: string, participantId: string) => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
}

export function TikTokFeedView({
  groups,
  contestsMap,
  groupVotes,
  onVote,
  onResetFilters,
  onLoadMore,
}: TikTokFeedViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
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

  // Keep index within bounds when filtered groups change
  useEffect(() => {
    if (currentIndex >= groups.length && groups.length > 0) {
      setCurrentIndex(0);
    }
  }, [groups.length, currentIndex]);

  // Proactive preloading of next group images into browser cache
  useEffect(() => {
    preloadGroupImages(groups, currentIndex);
  }, [currentIndex, groups]);

  // Infinite recommendation threshold: trigger more groups when approaching end
  useEffect(() => {
    if (groups.length > 0 && currentIndex >= groups.length - 2) {
      if (onLoadMore) {
        onLoadMore();
      }
    }
  }, [currentIndex, groups.length, onLoadMore]);

  const goToNext = useCallback(() => {
    if (groups.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % groups.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [groups.length]);

  const goToPrev = useCallback(() => {
    if (groups.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + groups.length) % groups.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [groups.length]);

  // Native mobile touch swipe listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (deltaY > 40) {
      // Swiped UP -> Next group
      goToNext();
    } else if (deltaY < -40) {
      // Swiped DOWN -> Previous group
      goToPrev();
    }
  };

  // Keyboard navigation (ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDescriptionOpen || lightboxData) return;
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
  }, [goToNext, goToPrev, isDescriptionOpen, lightboxData]);

  // Motion pan drag for desktop / mouse swipes
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col relative select-none px-1 pt-0 pb-1 md:pb-16 lg:pb-0 overflow-hidden h-full w-full min-h-0"
    >
      {/* ── Top Bar: Centered Clickable Contest Title (Slightly larger, clearly interactive) ── */}
      <header className="flex items-center justify-center px-3 py-1.5 shrink-0 z-20 bg-transparent border-none w-full">
        <Link
          href={`/contest/${currentGroup.contestId}`}
          className="group inline-flex items-center justify-center gap-1.5 max-w-[92%] text-center cursor-pointer transition-all active:scale-95"
          title="Open contest details & rules"
        >
          <span className="text-sm sm:text-base font-black tracking-wide text-white group-hover:text-[#ff6a2b] transition-colors truncate drop-shadow-md">
            {currentContest?.title || shortTitle}
          </span>
          <ChevronRight
            size={16}
            className="text-neutral-500 group-hover:text-[#ff6a2b] group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
          />
        </Link>
      </header>

      {/* ── 4 Tall Vertical Rectangles (2x2 Grid Maximizing Viewport Height) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentGroup.id}
            custom={direction}
            variants={{
              enter: (d: number) => ({
                y: d > 0 ? 90 : -90,
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
                y: d > 0 ? -90 : 90,
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
            className="flex-1 flex flex-col h-full min-h-0 relative bg-transparent border-none shadow-none p-0 cursor-grab active:cursor-grabbing"
          >
            {/* 4 Entrants arranged as 4 vertically-directed rectangles in a 2x2 grid filling 100% height */}
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2 flex-1 h-full min-h-0">
              {currentGroup.members.slice(0, 4).map((member, idx) => {
                const isSelected = currentVoteId === member.participantId;
                const sharePct = [42, 31, 16, 11][idx % 4];

                return (
                  <div
                    key={member.participantId}
                    onClick={() => onVote(currentGroup.id, member.participantId)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer bg-[#141418] border transition-all duration-300 origin-center flex flex-col min-h-0 h-full ${
                      isSelected
                        ? 'scale-[0.88] border-emerald-500 ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                        : currentVoteId
                        ? 'border-neutral-800/80 opacity-65 brightness-[0.7]'
                        : 'border-neutral-800/80 hover:border-neutral-700 hover:brightness-105 active:scale-[0.98]'
                    }`}
                  >
                    {/* Photo filling the vertical rectangle */}
                    <div className="relative w-full h-full min-h-0 overflow-hidden bg-neutral-900">
                      {member.photo ? (
                        <Image
                          src={member.photo}
                          alt={member.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 240px"
                          className={`object-cover object-center transition-transform duration-500 ${
                            isSelected ? '' : 'group-hover:scale-105'
                          }`}
                          priority={idx < 2}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                          Photo
                        </div>
                      )}

                      {/* Scrim Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

                      {/* Top Bar inside card: Selection badge / Share % + Inspect Zoom button */}
                      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                        {/* Vote Choice Badge (Highlighted Green) or Share % */}
                        {isSelected ? (
                          <div className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-md animate-fade-in border border-emerald-400/40">
                            <Check size={11} strokeWidth={3} />
                            <span>Selected</span>
                          </div>
                        ) : currentVoteId ? (
                          <div className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-xs font-black text-[11px] text-white border border-neutral-700/80 tabular-nums">
                            {sharePct}%
                          </div>
                        ) : (
                          <span className="w-2" />
                        )}

                        {/* Inspect Zoom Button to examine photo in full detail */}
                        {member.photo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const authorTag = (member as any).author || `@creator_${idx + 1}`;
                              setLightboxData({
                                photoUrl: member.photo,
                                photos: (member as any).photos || [member.photo],
                                title: member.title,
                                author: authorTag,
                                authorAvatar: (member as any).authorAvatar,
                                authorBio: (member as any).authorBio || `Featured creative work in ${shortTitle}. Captured with sharp depth-of-field and nuanced natural grading.`,
                                category: `${shortTitle} · Round ${currentGroup.roundNumber || 1}`,
                                sponsorName: currentContest?.sponsorName || 'Alpha Lab & Vision Partners',
                                sponsorTier: 'Official Contest Sponsor',
                                prizePool: '$3,000 Award & Professional Exposure',
                                socialLinks: {
                                  instagram: `https://instagram.com/${authorTag.replace('@', '')}`,
                                  telegram: `https://t.me/${authorTag.replace('@', '')}`,
                                  twitter: `https://x.com/${authorTag.replace('@', '')}`,
                                  portfolio: `https://${authorTag.replace('@', '')}.design`,
                                },
                                isSelected: isSelected,
                                onVote: () => onVote(currentGroup.id, member.participantId),
                              });
                            }}
                            aria-label={`Inspect ${member.title} full photo`}
                            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-white/20 shadow-md ml-auto"
                          >
                            <Maximize2 size={13} strokeWidth={2.4} />
                          </button>
                        )}
                      </div>

                      {/* Author Avatar + Name + Work Title at bottom of photo */}
                      <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {(member as any).authorAvatar && (
                            <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                              <Image
                                src={(member as any).authorAvatar}
                                alt=""
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-[11px] sm:text-xs font-black text-white drop-shadow-md truncate block leading-tight">
                              {(member as any).author || member.title}
                            </span>
                            {member.title && (member as any).author && (
                              <span className="text-[10px] text-white/80 font-medium drop-shadow truncate block mt-0.5 leading-tight">
                                {member.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voting Progress Line */}
                    {currentVoteId && (
                      <div className="h-1 bg-neutral-800 w-full overflow-hidden shrink-0">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isSelected ? 'bg-emerald-500' : 'bg-neutral-600'
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

      {/* ── Desktop-Only Navigation Buttons (Strictly hidden on phone and tablet) ── */}
      <footer className="mt-1 pt-0.5 hidden lg:flex items-center justify-end text-neutral-400 text-xs shrink-0 z-20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label="Previous group"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 transition-colors active:scale-95"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next group"
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
        contest={currentContest || {
          title: currentGroup.contestTitle,
          description: `Group stage round in ${currentGroup.contestTitle}. Choose your favorite submission among the 4 contenders to push them into the finals!`,
        }}
        stageInfo={`Group #${currentGroup.groupNumber || 1}`}
      />

      {/* ── Photo Lightbox (High-Resolution Detail View) ── */}
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
