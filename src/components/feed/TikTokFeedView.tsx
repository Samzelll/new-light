"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { Check, ChevronRight, ChevronUp, ChevronDown, RotateCcw, ArrowUp, X } from 'lucide-react';
import type { Group, Contest } from '@/services/types';
import { DescriptionSheet } from './DescriptionSheet';
import { PhotoLightbox } from '../common/PhotoLightbox';
import { preloadGroupImages } from '@/services/recommendationService';
import { photoLoader, GRID_SIZES } from '@/perf/imageUrls';
import { HAPTIC, haptic } from '@/perf/haptics';
import { prefetchPhotos, setPhotoWindow, photoKey } from '@/perf/imageScheduler';

export interface TikTokFeedViewProps {
  groups: Group[];
  contestsMap: Record<string, any>;
  groupVotes: Record<string, string>;
  onVote: (groupId: string, participantId: string | null) => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
  activeGroupId?: string | null;
  onActiveGroupChange?: (groupId: string) => void;
  modalOpen?: boolean;
}

export function TikTokFeedView({
  groups,
  contestsMap,
  groupVotes,
  onVote,
  onResetFilters,
  onLoadMore,
  activeGroupId,
  onActiveGroupChange,
  modalOpen = false,
}: TikTokFeedViewProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Стабильная позиция по activeId, а не числовому индексу
  const [activeId, setActiveId] = useState<string | null>(
    activeGroupId || (groups[0]?.id ?? null)
  );
  const activeIdRef = useRef<string | null>(activeId);

  const updateActiveId = useCallback(
    (newId: string | null) => {
      if (newId && newId !== activeIdRef.current) {
        activeIdRef.current = newId;
        setActiveId(newId);
        onActiveGroupChange?.(newId);
      }
    },
    [onActiveGroupChange]
  );

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Синхронизация при внешнем изменении activeGroupId
  useEffect(() => {
    if (activeGroupId && activeGroupId !== activeIdRef.current) {
      activeIdRef.current = activeGroupId;
      setActiveId(activeGroupId);
    }
  }, [activeGroupId]);

  const activeIndex = useMemo(() => {
    const idx = groups.findIndex((g) => g.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [groups, activeId]);

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [descriptionContest, setDescriptionContest] = useState<any>(null);
  const [descriptionStage, setDescriptionStage] = useState<string>('');

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
    percentage?: number | string;
    onVote?: () => void;
  } | null>(null);

  // Синхронизация activeId при первой загрузке или фильтрации
  useEffect(() => {
    if (groups.length > 0 && (!activeId || !groups.some((g) => g.id === activeId))) {
      const fallback =
        activeGroupId && groups.some((g) => g.id === activeGroupId)
          ? activeGroupId
          : groups[0].id;
      setActiveId(fallback);
      activeIdRef.current = fallback;
    }
  }, [groups, activeId, activeGroupId]);

  // Восстановление и удержание позиции скролла по точному DOM-якорю
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeIdRef.current) return;
    const targetSection = scroller.querySelector(
      `[data-group-id="${activeIdRef.current}"]`
    ) as HTMLElement | null;
    if (targetSection) {
      const expectedTop = targetSection.offsetTop;
      if (Math.abs(scroller.scrollTop - expectedTop) > 5) {
        scroller.scrollTop = expectedTop;
      }
    }
  }, [groups, groupVotes]);

  // Отслеживание позиции при скролле
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientHeight === 0) return;
    const idx = Math.round(scroller.scrollTop / scroller.clientHeight);
    if (idx >= 0 && idx < groups.length) {
      const g = groups[idx];
      if (g && g.id !== activeIdRef.current) {
        updateActiveId(g.id);
      }
    }
  }, [groups, updateActiveId]);

  // IntersectionObserver для надежной смены активного слайда
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || groups.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const gId = (entry.target as HTMLElement).dataset.groupId;
            if (gId && gId !== activeIdRef.current) {
              updateActiveId(gId);
            }
          }
        }
      },
      { root, threshold: 0.6 }
    );

    const sections = root.querySelectorAll('[data-group-id]');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [groups, updateActiveId]);

  // Предзагрузка фото следующих групп вперед
  useEffect(() => {
    preloadGroupImages(groups, activeIndex);
  }, [activeIndex, groups]);

  // Подгрузка при приближении к концу очереди
  useEffect(() => {
    if (groups.length > 0 && activeIndex >= groups.length - 2 && onLoadMore) {
      onLoadMore();
    }
  }, [activeIndex, groups.length, onLoadMore]);

  // Аппаратная предзагрузка фото текущей и следующей группы
  useEffect(() => {
    if (typeof window === 'undefined' || groups.length === 0) return;
    const currentGroup = groups[activeIndex];
    const nextGroup = groups[activeIndex + 1];

    if (currentGroup) {
      const currentPhotos = currentGroup.members
        .map((m) => resolveImageUrl(m.photo, 'submissions'))
        .filter(Boolean);
      prefetchPhotos(currentPhotos, { priority: 0, sizes: GRID_SIZES, scope: 'groups' });
    }
    if (nextGroup) {
      const nextPhotos = nextGroup.members
        .map((m) => resolveImageUrl(m.photo, 'submissions'))
        .filter(Boolean);
      prefetchPhotos(nextPhotos, { priority: 1, sizes: GRID_SIZES, scope: 'groups' });
    }
  }, [activeIndex, groups]);

  // Клавиатурная навигация (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const scroller = scrollerRef.current;
      if (!scroller || isDescriptionOpen || lightboxData || modalOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scroller.scrollBy({ top: scroller.clientHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scroller.scrollBy({ top: -scroller.clientHeight, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDescriptionOpen, lightboxData, modalOpen]);

  const handleScrollToTop = useCallback(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Тап по участнику: голос или отмена голоса (unvote)
  const handleMemberTap = useCallback(
    (groupId: string, participantId: string) => {
      updateActiveId(groupId);

      // Блокируем скролл на текущей группе в DOM
      const scroller = scrollerRef.current;
      if (scroller) {
        const targetSection = scroller.querySelector(
          `[data-group-id="${groupId}"]`
        ) as HTMLElement | null;
        if (targetSection) {
          scroller.scrollTop = targetSection.offsetTop;
        }
      }

      const currentVote = groupVotes[groupId] || null;

      // ── Повторный тап на выбранного участника -> ОТМЕНА ГОЛОСА ──
      if (currentVote === participantId) {
        haptic(HAPTIC.unvote);
        onVote(groupId, null);
        return;
      }

      // ── Первый тап или смена выбора -> ГОЛОСОВАНИЕ ──
      haptic(HAPTIC.vote);
      onVote(groupId, participantId);
    },
    [groupVotes, onVote, updateActiveId]
  );

  if (groups.length === 0) {
    return (
      <div className="flex-1 px-4 py-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center text-2xl mb-4">
          🔍
        </div>
        <h3 className="text-base font-bold text-ink font-display mb-1.5">
          No groups match your current filters
        </h3>
        <p className="text-xs text-muted mb-6 max-w-xs">
          Try resetting tags or search parameters to view all active voting groups.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs shadow-lg shadow-black/20 transition-all active:scale-95"
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden">
      {/* ── Нативный вертикальный контейнер со Scroll-Snap (60 FPS) ── */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, groupIndex) => {
          const currentContest = contestsMap[group.contestId] || null;
          const currentVoteId = groupVotes[group.id] || null;

          const shortTitle =
            group.contestTitle?.replace(/·.*/, '').trim() ||
            currentContest?.title ||
            'GROUP ROUND';
          const stageSubtitle =
            group.contestTitle?.includes('·')
              ? group.contestTitle.split('·')[1].trim()
              : `Round ${group.roundNumber || 1}`;

          return (
            <section
              key={group.id}
              data-group-id={group.id}
              className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0 flex flex-col px-1 pt-1 pb-1.5 sm:pb-2 lg:pb-1 select-none min-h-0 [content-visibility:auto] [contain-intrinsic-size:auto_100dvh]"
            >
              {/* ── 4 карточки 2x2: Заполнение всего доступного вьюпорта ── */}
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2 min-h-0 w-full h-full pb-0.5">
                {group.members.slice(0, 4).map((member, idx) => {
                  const isSelected = currentVoteId === member.participantId;
                  const sharePct = [42, 31, 16, 11][idx % 4];

                  return (
                    <div
                      key={member.participantId}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleMemberTap(group.id, member.participantId);
                      }}
                      className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer bg-surface border transition-all duration-300 origin-center flex flex-col min-h-0 h-full ${
                        isSelected
                          ? 'scale-[0.88] border-accent ring-2 ring-accent shadow-[0_0_30px_rgba(196,165,116,0.35)] z-10'
                          : currentVoteId
                          ? 'border-line opacity-65 brightness-[0.7] hover:opacity-85'
                          : 'border-line hover:border-line-strong hover:brightness-105 active:scale-[0.98]'
                      }`}
                    >
                      {/* Фото участника */}
                      <div className="relative w-full h-full min-h-0 overflow-hidden bg-surface-2">
                        {member.photo ? (() => {
                          const resolvedPhoto = resolveImageUrl(member.photo, 'submissions');
                          return (
                            <Image
                              src={resolvedPhoto}
                              alt={member.title}
                              fill
                              loader={photoLoader}
                              sizes={GRID_SIZES}
                              className={`object-cover object-center transition-transform duration-500 ${
                                isSelected ? '' : 'group-hover:scale-105'
                              }`}
                              priority={groupIndex === 0 && idx < 2}
                              referrerPolicy="no-referrer"
                            />
                          );
                        })() : (
                          <div className="w-full h-full flex items-center justify-center text-faint text-xs">
                            Photo
                          </div>
                        )}

                        {/* Затемнение */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-bg/85 pointer-events-none" />

                        {/* Верхняя плашка: Бейдж выбора / процент + Кнопка зума */}
                        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                          {isSelected ? (
                            <div
                              className="px-2 py-0.5 rounded-full bg-accent text-on-accent font-extrabold text-[10px] flex items-center gap-1.5 shadow-md animate-fade-in border border-accent-soft/40 cursor-pointer transition-colors"
                              title="Tap again to deselect"
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>Selected</span>
                              <span className="font-black border-l border-on-accent/30 pl-1.5 text-on-accent tabular-nums">
                                {sharePct}%
                              </span>
                            </div>
                          ) : currentVoteId ? (
                            <div className="px-2 py-0.5 rounded-full bg-scrim backdrop-blur-xs font-black text-[11px] text-ink border border-line tabular-nums">
                              {sharePct}%
                            </div>
                          ) : (
                            <span className="w-2" />
                          )}
                        </div>

                        {/* Автор и название работы снизу — при нажатии открывается фото в полном размере */}
                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const authorTag = (member as any).author || `@creator_${idx + 1}`;
                              setLightboxData({
                                photoUrl: member.photo,
                                photos: (member as any).photos || [member.photo],
                                title: member.title,
                                author: authorTag,
                                authorAvatar: (member as any).authorAvatar,
                                authorBio:
                                  (member as any).authorBio ||
                                  `Featured creative work in ${shortTitle}. Captured with sharp depth-of-field and nuanced natural grading.`,
                                category: `${shortTitle} · Round ${group.roundNumber || 1}`,
                                sponsorName:
                                  currentContest?.sponsorName || 'Alpha Lab & Vision Partners',
                                sponsorTier: 'Official Contest Sponsor',
                                prizePool: '$3,000 Award & Professional Exposure',
                                socialLinks: {
                                  instagram: `https://instagram.com/${authorTag.replace('@', '')}`,
                                  telegram: `https://t.me/${authorTag.replace('@', '')}`,
                                  twitter: `https://x.com/${authorTag.replace('@', '')}`,
                                  portfolio: `https://${authorTag.replace('@', '')}.design`,
                                },
                                isSelected: isSelected,
                                percentage: sharePct,
                                onVote: () => handleMemberTap(group.id, member.participantId),
                              });
                            }}
                            className="group/author flex items-center gap-1.5 min-w-0 max-w-full text-left rounded-md px-1.5 py-1 -ml-1 -mb-1 bg-surface/50 hover:bg-surface/85 active:scale-95 backdrop-blur-xs transition-all cursor-pointer pointer-events-auto border border-transparent hover:border-line shadow-xs"
                            aria-label={`Inspect ${member.title || (member as any).author || 'participant'} photo`}
                          >
                            {(member as any).authorAvatar && (() => {
                              const resolvedAvatar = resolveImageUrl(
                                (member as any).authorAvatar,
                                'avatars'
                              );
                              return (
                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-line-strong shadow-sm shrink-0">
                                  <Image
                                    src={resolvedAvatar}
                                    alt=""
                                    fill
                                    unoptimized={shouldBeUnoptimized(resolvedAvatar)}
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <span className="text-[11px] sm:text-xs font-black text-ink font-display drop-shadow-md truncate block leading-tight group-hover/author:text-accent transition-colors">
                                {(member as any).author || member.title}
                              </span>
                              {member.title && (member as any).author && (
                                <span className="text-[10px] text-muted font-medium drop-shadow truncate block mt-0.5 leading-tight">
                                  {member.title}
                                </span>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Нижняя плашка конкурса (правый нижний угол под карточками) ── */}
              <footer className="flex items-center justify-end px-2 pt-1.5 pb-0.5 shrink-0 z-20 w-full">
                <Link
                  href={`/contest/${group.contestId}`}
                  className="group inline-flex items-center justify-end gap-1.5 text-right cursor-pointer transition-all active:scale-95 py-1 px-3 rounded-full bg-surface/90 hover:bg-surface-2 border border-line/90 backdrop-blur-md shadow-sm max-w-[85%]"
                  title="Open contest details & rules"
                >
                  <span className="text-xs sm:text-sm font-bold tracking-wide text-ink group-hover:text-accent font-display transition-colors truncate drop-shadow-sm">
                    {currentContest?.title || shortTitle}
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-accent group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </Link>
              </footer>
            </section>
          );
        })}

        {/* ── Финальный экран завершения очереди ── */}
        <section className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0 flex items-center justify-center p-6 text-center select-none bg-bg">
          <div className="max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-accent/40 text-accent flex items-center justify-center text-2xl mb-4 shadow-lg shadow-black/40">
              ✓
            </div>
            <h3 className="text-lg font-black text-ink font-display mb-2">
              You&apos;ve viewed all available groups
            </h3>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              All your votes are counted live. New groups appear every 24 hours at 06:00 UTC.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={handleScrollToTop}
                className="flex-1 py-3 px-4 rounded-xl bg-accent-solid hover:bg-accent-hover text-white font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-lg shadow-black/25 transition-all active:scale-95"
              >
                <ArrowUp size={14} strokeWidth={2.5} />
                <span>Back to top</span>
              </button>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="py-3 px-4 rounded-xl bg-surface-2 hover:bg-line text-ink font-extrabold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-line-strong"
                >
                  <RotateCcw size={14} strokeWidth={2.5} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Описание конкурса ── */}
      {isDescriptionOpen && (
        <DescriptionSheet
          isOpen={isDescriptionOpen}
          onClose={() => setIsDescriptionOpen(false)}
          contest={descriptionContest}
          stageInfo={descriptionStage}
        />
      )}

      {/* ── Лайтбокс фото ── */}
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
          percentage={lightboxData.percentage}
          onVote={lightboxData.onVote}
        />
      )}
    </div>
  );
}

export default TikTokFeedView;
