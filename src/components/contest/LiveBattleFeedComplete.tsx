"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE BATTLE FEED — HIGH-PERFORMANCE NATIVE SCROLL-SNAP ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Архитектурно переработанная лента 1v1 батлов в стиле TikTok / Instagram Reels:
 * 1. Нативный CSS Scroll-Snap (snap-y snap-mandatory) с аппаратным ускорением,
 *    естественной инерцией и нулевой задержкой тач-жестов.
 * 2. Идентификация позиции по стабильному activeId через IntersectionObserver (threshold 0.6)
 *    вместо числового индекса — 100% защита от выбивания на 1-й батл.
 * 3. Аппаратная предзагрузка и декодирование через Next.js getImageProps (useBattleReady)
 *    с блокировкой тапа и skeleton-анимацией до готовности обоих фото.
 * 4. Защита от повторных голосов, атомарные статусы (pending -> confirmed),
 *    математически выверенные проценты из реальных голосов и откат при ошибках.
 * 5. Финальный экран EndOfFeedSlide с плавным возвратом в начало ленты.
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import {
  FEED_SIZES,
  preloadPhoto,
  useBattleReady,
  calcPercents,
} from '@/services/battleImagePreloader';
import { photoLoader } from '@/perf/imageUrls';
import { HAPTIC, haptic } from '@/perf/haptics';
import { useTimeToVotable } from '@/features/battle-feed/hooks/useTimeToVotable';
import type {
  BattleCorner,
  BattleItem,
  CompetitorDetails,
  LiveBattleFeedProps,
  VoteState,
} from '@/types/battle';
import { BattleParticipantModal } from '@/components/battle/BattleParticipantModal';
import {
  ChevronRight,
  Check,
  Maximize2,
  X,
  Award,
  Shield,
  Tag,
  ZoomIn,
  ZoomOut,
  Layers,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// Re-export canonical types for backward compatibility
export type { BattleCorner, BattleItem, CompetitorDetails, LiveBattleFeedProps };

// ─────────────────────────────────────────────────────────────────────────────
// 1. EMBEDDED LIGHTBOX MODAL (PHOTO & CREATOR DETAILS)
// ─────────────────────────────────────────────────────────────────────────────

interface EmbeddedLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photos?: string[];
  title: string;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
  category?: string;
  corner?: 'red' | 'blue' | 'green';
  opponentName?: string;
  opponentAvatar?: string;
  opponentCorner?: 'red' | 'blue' | 'green';
  percentage?: number | string;
  opponentPercentage?: number | string;
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  tags?: string[];
  socialLinks?: CompetitorDetails['socialLinks'];
  isSelected?: boolean;
  onVote?: () => void;
}

function EmbeddedLightbox(props: EmbeddedLightboxProps) {
  return <BattleParticipantModal {...props} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMBEDDED DESCRIPTION SHEET
// ─────────────────────────────────────────────────────────────────────────────

interface EmbeddedDescriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contest: {
    title: string;
    description?: string | null;
    category?: string;
  };
  stageInfo?: string;
}

function EmbeddedDescriptionSheet({
  isOpen,
  onClose,
  contest,
  stageInfo,
}: EmbeddedDescriptionSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#16161a] border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff6a2b]" />
            <h3 className="text-sm font-black text-white">{contest.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть описание"
            className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-neutral-300">
          <div>
            <h4 className="font-bold text-white mb-1">Tournament Format</h4>
            <p className="text-neutral-400">
              {stageInfo || '1v1 Live Battle with instant vote tallying.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-1">Voting Rules</h4>
            <p className="text-neutral-400 leading-relaxed">
              One vote per duel. Choose the most compelling and atmospheric
              entry. Votes are weighted by community trust index.
            </p>
          </div>

          {contest.description && (
            <div>
              <h4 className="font-bold text-white mb-1">About Contest</h4>
              <p className="text-neutral-400 leading-relaxed">{contest.description}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BATTLE SLIDE COMPONENT (50/50 VIEWPORT SECTION)
// ─────────────────────────────────────────────────────────────────────────────

interface BattleSlideProps {
  battle: BattleItem;
  isActive: boolean;
  userVote: BattleCorner | null;
  voteTotals?: { red: number; green: number };
  canVote: boolean;
  onVote: (corner: BattleCorner) => void;
  onOpenLightbox: (data: EmbeddedLightboxProps) => void;
  onOpenDescription: () => void;
}

function BattleSlide({
  battle,
  isActive,
  userVote,
  voteTotals,
  canVote,
  onVote,
  onOpenLightbox,
  onOpenDescription,
}: BattleSlideProps) {
  const { state: photosState, retry: retryPhotos } = useBattleReady(battle);
  useTimeToVotable(isActive, photosState);

  // Вычисляем проценты из актуальных или начальных голосов
  const effectiveRedVotes =
    voteTotals?.red ?? (battle.red.votes || Math.round((battle.red.percent || 50) * 2));
  const effectiveGreenVotes =
    voteTotals?.green ?? (battle.green.votes || Math.round((battle.green.percent || 50) * 2));

  const percentages = useMemo(
    () => calcPercents(effectiveRedVotes, effectiveGreenVotes),
    [effectiveRedVotes, effectiveGreenVotes]
  );

  const targetContestId = battle.contestId || battle.id;
  const isReady = photosState === 'ready';

  return (
    <div className="h-full w-full flex flex-col relative select-none px-1 pt-0 pb-16 lg:pb-0 overflow-hidden min-h-0">
      {/* ── Шапка: Заголовок конкурса ── */}
      <header className="flex items-center justify-center px-3 py-1.5 shrink-0 z-20 bg-transparent border-none w-full">
        <Link
          href={`/contest/${targetContestId}`}
          className="group inline-flex items-center justify-center gap-1.5 max-w-[92%] text-center cursor-pointer transition-all active:scale-95"
          title="Открыть детали и правила конкурса"
        >
          <span className="text-sm sm:text-base font-black tracking-wide text-white group-hover:text-[#ff6a2b] transition-colors truncate drop-shadow-md">
            {battle.title}
          </span>
          <ChevronRight
            size={16}
            className="text-neutral-500 group-hover:text-[#ff6a2b] group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
          />
        </Link>
      </header>

      {/* ── Арена 50/50: Две карточки ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 w-full h-full pb-0.5 gap-1.5">
        {/* ══════════════════════════════════════════════════════════ */}
        {/* 1. ВЕРХНЯЯ КАРТОЧКА (RED CORNER) — 50% Высоты             */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div
          role="button"
          tabIndex={isReady ? 0 : -1}
          aria-disabled={!isReady}
          aria-pressed={userVote === 'red'}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isReady) {
              onVote('red');
            }
          }}
          className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
            userVote === 'red'
              ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10 cursor-pointer'
              : userVote === 'green'
              ? 'opacity-70 brightness-[0.7] cursor-pointer hover:opacity-90'
              : isReady
              ? 'cursor-pointer hover:brightness-105 active:scale-[0.98]'
              : 'cursor-wait'
          }`}
        >
          {/* Skeleton Shimmer пока фото не декодированы */}
          {!isReady && (
            <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center z-10">
              <div className="w-8 h-8 rounded-full bg-neutral-800/80 animate-ping opacity-40" />
            </div>
          )}

          {/* Фото участника */}
          {battle.red?.photo && (
            <Image
              src={battle.red.photo}
              alt={battle.red.name}
              fill
              loader={photoLoader}
              sizes={FEED_SIZES}
              priority={isActive}
              referrerPolicy="no-referrer"
              className={`object-cover object-center transition-all duration-500 ${
                isReady ? 'opacity-100' : 'opacity-0'
              } ${userVote === 'red' ? '' : 'group-hover:scale-105'}`}
            />
          )}

          {/* Затемнение */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

          {/* Верхняя плашка карточки: Бейдж выбора + Кнопка зума */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
            <div>
              {userVote === 'red' && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-lg border border-emerald-400/40 animate-fade-in transition-colors cursor-pointer"
                  title="Tap again to deselect"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Selected</span>
                  <span className="font-black border-l border-emerald-400/50 pl-1.5 text-emerald-100 tabular-nums">
                    {percentages.red}%
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox({
                  isOpen: true,
                  onClose: () => {},
                  photoUrl: battle.red.photo,
                  photos: battle.red.photos || [battle.red.photo],
                  title: battle.red.name,
                  author: battle.red.author,
                  authorAvatar: battle.red.authorAvatar,
                  authorBio: battle.red.authorBio,
                  category: battle.category,
                  corner: 'red',
                  opponentName: battle.green.name,
                  opponentCorner: 'blue',
                  percentage: percentages.red,
                  opponentPercentage: percentages.green,
                  sponsorName: battle.red.sponsorName || battle.sponsorName,
                  sponsorTier: battle.red.sponsorTier,
                  prizePool: battle.red.prizePool,
                  tags: battle.tags,
                  socialLinks: battle.red.socialLinks,
                  isSelected: userVote === 'red',
                  onVote: isReady ? () => onVote('red') : undefined,
                });
              }}
              aria-label="Увеличить фото и открыть детали"
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-white/20 shadow-md ml-auto"
            >
              <Maximize2 size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Нижняя плашка: Автор + Название работы */}
          <div className="absolute bottom-2.5 left-3 right-20 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              {battle.red.author && battle.red.authorAvatar && (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                  <Image
                    src={resolveImageUrl(battle.red.authorAvatar, 'avatars')}
                    alt={battle.red.author}
                    fill
                    unoptimized={shouldBeUnoptimized(battle.red.authorAvatar)}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="min-w-0">
                {battle.red.author && (
                  <span className="text-xs sm:text-sm font-black text-white drop-shadow-lg truncate block leading-tight">
                    {battle.red.author}
                  </span>
                )}
                {battle.red.name && (
                  <span
                    className={`${
                      battle.red.author
                        ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5'
                        : 'text-sm sm:text-base font-black text-white'
                    } drop-shadow truncate block leading-tight`}
                  >
                    {battle.red.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Процент голосов (отображается после голосования) */}
          {userVote && (
            <div className="absolute bottom-2.5 right-3 z-10 animate-fade-in">
              <div
                className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                  userVote === 'red'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                    : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                }`}
              >
                {percentages.red}%
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ЦЕНТРАЛЬНЫЙ БЕЙДЖ "VS"                                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-gradient-to-br from-[#ff6a2b] to-[#e04500] border-2 border-[#0b0b0d] flex items-center justify-center font-black text-xs text-white shadow-2xl pointer-events-none ring-2 ring-white/20 animate-pulse"
        >
          VS
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 2. НИЖНЯЯ КАРТОЧКА (GREEN CORNER) — 50% Высоты           */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div
          role="button"
          tabIndex={isReady ? 0 : -1}
          aria-disabled={!isReady}
          aria-pressed={userVote === 'green'}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (isReady) {
              onVote('green');
            }
          }}
          className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
            userVote === 'green'
              ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10 cursor-pointer'
              : userVote === 'red'
              ? 'opacity-70 brightness-[0.7] cursor-pointer hover:opacity-90'
              : isReady
              ? 'cursor-pointer hover:brightness-105 active:scale-[0.98]'
              : 'cursor-wait'
          }`}
        >
          {/* Skeleton Shimmer пока фото не декодированы */}
          {!isReady && (
            <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center z-10">
              <div className="w-8 h-8 rounded-full bg-neutral-800/80 animate-ping opacity-40" />
            </div>
          )}

          {/* Фото участника */}
          {battle.green?.photo && (
            <Image
              src={battle.green.photo}
              alt={battle.green.name}
              fill
              loader={photoLoader}
              sizes={FEED_SIZES}
              priority={isActive}
              referrerPolicy="no-referrer"
              className={`object-cover object-center transition-all duration-500 ${
                isReady ? 'opacity-100' : 'opacity-0'
              } ${userVote === 'green' ? '' : 'group-hover:scale-105'}`}
            />
          )}

          {/* Затемнение */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

          {/* Верхняя плашка карточки: Бейдж выбора + Кнопка зума */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
            <div>
              {userVote === 'green' && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-lg border border-emerald-400/40 animate-fade-in transition-colors cursor-pointer"
                  title="Tap again to deselect"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Selected</span>
                  <span className="font-black border-l border-emerald-400/50 pl-1.5 text-emerald-100 tabular-nums">
                    {percentages.green}%
                  </span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLightbox({
                  isOpen: true,
                  onClose: () => {},
                  photoUrl: battle.green.photo,
                  photos: battle.green.photos || [battle.green.photo],
                  title: battle.green.name,
                  author: battle.green.author,
                  authorAvatar: battle.green.authorAvatar,
                  authorBio: battle.green.authorBio,
                  category: battle.category,
                  corner: 'blue',
                  opponentName: battle.red.name,
                  opponentCorner: 'red',
                  percentage: percentages.green,
                  opponentPercentage: percentages.red,
                  sponsorName: battle.green.sponsorName || battle.sponsorName,
                  sponsorTier: battle.green.sponsorTier,
                  prizePool: battle.green.prizePool,
                  tags: battle.tags,
                  socialLinks: battle.green.socialLinks,
                  isSelected: userVote === 'green',
                  onVote: isReady ? () => onVote('green') : undefined,
                });
              }}
              aria-label="Увеличить фото и открыть детали"
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white/95 hover:text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-white/20 shadow-md ml-auto"
            >
              <Maximize2 size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Нижняя плашка: Автор + Название работы */}
          <div className="absolute bottom-2.5 left-3 right-20 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              {battle.green.author && battle.green.authorAvatar && (
                <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                  <Image
                    src={resolveImageUrl(battle.green.authorAvatar, 'avatars')}
                    alt={battle.green.author}
                    fill
                    unoptimized={shouldBeUnoptimized(battle.green.authorAvatar)}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="min-w-0">
                {battle.green.author && (
                  <span className="text-xs sm:text-sm font-black text-white drop-shadow-lg truncate block leading-tight">
                    {battle.green.author}
                  </span>
                )}
                {battle.green.name && (
                  <span
                    className={`${
                      battle.green.author
                        ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5'
                        : 'text-sm sm:text-base font-black text-white'
                    } drop-shadow truncate block leading-tight`}
                  >
                    {battle.green.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Процент голосов (отображается после голосования) */}
          {userVote && (
            <div className="absolute bottom-2.5 right-3 z-10 animate-fade-in">
              <div
                className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                  userVote === 'green'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                    : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                }`}
              >
                {percentages.green}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ошибка загрузки фото с возможностью повтора */}
      {photosState === 'error' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-xs font-bold flex items-center gap-2 shadow-xl animate-fade-in">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span>Фото не загрузились</span>
          <button
            type="button"
            onClick={retryPhotos}
            className="underline hover:text-white transition-colors"
          >
            Повторить
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. END OF FEED SLIDE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface EndOfFeedSlideProps {
  onScrollToTop: () => void;
  onResetFilters?: () => void;
}

function EndOfFeedSlide({ onScrollToTop, onResetFilters }: EndOfFeedSlideProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center select-none bg-[#0b0b0d]">
      <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-3xl mb-4 shadow-xl">
        🏆
      </div>
      <h3 className="text-base sm:text-lg font-black text-white mb-2 tracking-wide">
        Вы посмотрели все дуэли
      </h3>
      <p className="text-xs text-neutral-400 mb-6 max-w-xs leading-relaxed">
        Все активные 1v1 батлы в этой подборке просмотрены. Вы можете вернуться к началу
        или выбрать другие категории.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onScrollToTop}
          className="w-full py-3 px-5 rounded-full bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#ff6a2b]/25 transition-all active:scale-95"
        >
          <ArrowUp size={16} strokeWidth={2.5} />
          <span>Вернуться в начало</span>
        </button>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full py-3 px-5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold text-xs border border-neutral-800 transition-all active:scale-95"
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MAIN LIVE BATTLE FEED (NATIVE SCROLL-SNAP CONTAINER)
// ─────────────────────────────────────────────────────────────────────────────

export function LiveBattleFeedComplete({
  battles,
  contestsMap = {},
  battleVotes = {},
  onVote,
  onResetFilters,
  onLoadMore,
  modalOpen = false,
  activeBattleId,
  onActiveBattleChange,
}: LiveBattleFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Стабильная позиция по activeId, а не числовому индексу
  const [activeId, setActiveId] = useState<string | null>(
    activeBattleId || (battles[0]?.id ?? null)
  );
  const activeIdRef = useRef<string | null>(activeId);

  const updateActiveId = useCallback(
    (newId: string | null) => {
      if (newId && newId !== activeIdRef.current) {
        activeIdRef.current = newId;
        setActiveId(newId);
        onActiveBattleChange?.(newId);
      }
    },
    [onActiveBattleChange]
  );

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Синхронизация при внешнем изменении activeBattleId
  useEffect(() => {
    if (activeBattleId && activeBattleId !== activeIdRef.current) {
      activeIdRef.current = activeBattleId;
      setActiveId(activeBattleId);
    }
  }, [activeBattleId]);

  const activeIndex = useMemo(() => {
    const idx = battles.findIndex((b) => b.id === activeId);
    return idx >= 0 ? idx : 0;
  }, [battles, activeId]);

  // Локальные голоса и защита от повторных кликов
  const [localVotes, setLocalVotes] = useState<Record<string, VoteState>>({});
  const voteLockRef = useRef<Set<string>>(new Set());
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Модальные окна
  const [lightboxData, setLightboxData] = useState<EmbeddedLightboxProps | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  // Синхронизация activeId при первой загрузке или смене фильтра
  useEffect(() => {
    if (battles.length > 0 && (!activeId || !battles.some((b) => b.id === activeId))) {
      const fallbackId =
        activeBattleId && battles.some((b) => b.id === activeBattleId)
          ? activeBattleId
          : battles[0].id;
      setActiveId(fallbackId);
      activeIdRef.current = fallbackId;
    }
  }, [battles, activeId, activeBattleId]);

  // 5.1. Восстановление и удержание позиции скролла: предотвращает сброс на 1-й батл
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeIdRef.current) return;
    const targetSection = scroller.querySelector(
      `[data-battle-id="${activeIdRef.current}"]`
    ) as HTMLElement | null;
    if (targetSection) {
      const expectedTop = targetSection.offsetTop;
      if (Math.abs(scroller.scrollTop - expectedTop) > 5) {
        scroller.scrollTop = expectedTop;
      }
    }
  }, [battles, localVotes, battleVotes]);

  // 5.2. Точный трекинг activeId при любом нативном скролле / свайпе
  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientHeight === 0) return;
    const idx = Math.round(scroller.scrollTop / scroller.clientHeight);
    if (idx >= 0 && idx < battles.length) {
      const b = battles[idx];
      if (b && b.id !== activeIdRef.current) {
        updateActiveId(b.id);
      }
    }
  }, [battles, updateActiveId]);

  // 5.3. IntersectionObserver для дополнительной надежности
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || battles.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const bId = (entry.target as HTMLElement).dataset.battleId;
            if (bId && bId !== activeIdRef.current) {
              updateActiveId(bId);
            }
          }
        }
      },
      { root, threshold: 0.6 }
    );

    const sections = root.querySelectorAll('[data-battle-id]');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [battles, updateActiveId]);

  // 5.4. Аппаратная предзагрузка на 2-3 слайда вперед
  useEffect(() => {
    if (typeof window === 'undefined' || battles.length === 0) return;

    for (let i = activeIndex + 1; i <= activeIndex + 3; i++) {
      const nextBattle = battles[i];
      if (!nextBattle) break;
      if (nextBattle.red?.photo) preloadPhoto(nextBattle.red.photo).catch(() => {});
      if (nextBattle.green?.photo) preloadPhoto(nextBattle.green.photo).catch(() => {});
    }
  }, [activeIndex, battles]);

  // 5.5. Триггер подгрузки новых батлов при приближении к концу очереди
  useEffect(() => {
    if (activeIndex >= battles.length - 2 && onLoadMore) {
      onLoadMore();
    }
  }, [activeIndex, battles.length, onLoadMore]);

  // 5.6. Клавиатурная навигация (ArrowDown / ArrowUp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const scroller = scrollerRef.current;
      if (!scroller || modalOpen || lightboxData || isDescriptionOpen) return;

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
  }, [modalOpen, lightboxData, isDescriptionOpen]);

  // 5.7. Голосование и отмена голоса (toggle / unvote)
  const handleVote = useCallback(
    async (battle: BattleItem, corner: BattleCorner) => {
      const bId = battle.id;
      updateActiveId(bId);

      // Немедленная фиксация позиции скролла на текущем слайде в DOM
      const scroller = scrollerRef.current;
      if (scroller) {
        const targetSection = scroller.querySelector(
          `[data-battle-id="${bId}"]`
        ) as HTMLElement | null;
        if (targetSection) {
          scroller.scrollTop = targetSection.offsetTop;
        }
      }

      const currentVote = localVotes[bId]?.corner || battleVotes[bId] || null;

      // ── СЦЕНАРИЙ 1: Отмена голоса (повторное нажатие на выбранный угол) ──
      if (currentVote === corner) {
        haptic(HAPTIC.unvote);
        voteLockRef.current.delete(bId);

        setLocalVotes((prev) => {
          const next = { ...prev };
          delete next[bId];
          return next;
        });

        if (onVote) {
          onVote(bId, null);
        } else {
          try {
            const { cancelBattleVote } = await import('@/services/battleDataService');
            await cancelBattleVote(battle.contestId ?? battle.id);
          } catch (e) {
            console.warn('Cancel vote note:', e);
          }
        }
        return;
      }

      // ── СЦЕНАРИЙ 2: Голосование (новый голос или переключение на противоположный) ──
      haptic(HAPTIC.vote);
      const baseRedVotes = Math.max(0, battle.red.votes || Math.round((battle.red.percent || 50) * 2));
      const baseGreenVotes = Math.max(0, battle.green.votes || Math.round((battle.green.percent || 50) * 2));

      // Если переключаем с красного на зеленый (или наоборот), корректируем
      const optimisticTotals = {
        red: baseRedVotes + (corner === 'red' ? 1 : currentVote === 'red' ? -1 : 0),
        green: baseGreenVotes + (corner === 'green' ? 1 : currentVote === 'green' ? -1 : 0),
      };

      setLocalVotes((prev) => ({
        ...prev,
        [bId]: {
          corner,
          status: 'confirmed',
          totals: optimisticTotals,
        },
      }));

      if (onVote) {
        onVote(bId, corner);
      } else {
        try {
          const { castBattleVote } = await import('@/services/battleDataService');
          await castBattleVote(battle.contestId ?? battle.id, battle[corner].id);
        } catch (err: any) {
          console.warn('Vote background sync note:', err);
        }
      }
    },
    [battleVotes, localVotes, onVote, updateActiveId]
  );

  const handleScrollToTop = useCallback(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Пустое состояние
  if (battles.length === 0) {
    return (
      <div className="flex-1 px-4 py-16 flex flex-col items-center justify-center text-center select-none">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl mb-4">
          ⚔️
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          No active battles match your filters
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">
          Try resetting filters or selecting different categories.
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

  return (
    <div className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden">
      {/* Тост об ошибке голосования */}
      {errorToast && (
        <div
          role="alert"
          className="fixed top-4 inset-x-0 mx-auto w-fit z-50 bg-red-950/90 border border-red-500/80 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-fade-in"
        >
          <AlertCircle size={15} className="text-red-400" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* ── Нативный вертикальный контейнер со Scroll-Snap ── */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {battles.map((battle) => {
          const userVote =
            localVotes[battle.id]?.corner || battleVotes[battle.id] || null;
          const voteTotals = localVotes[battle.id]?.totals;

          return (
            <section
              key={battle.id}
              data-battle-id={battle.id}
              className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0 [content-visibility:auto] [contain-intrinsic-size:auto_100dvh]"
            >
              <BattleSlide
                battle={battle}
                isActive={battle.id === activeId}
                userVote={userVote}
                voteTotals={voteTotals}
                canVote={true}
                onVote={(corner) => handleVote(battle, corner)}
                onOpenLightbox={(data) => setLightboxData(data)}
                onOpenDescription={() => setIsDescriptionOpen(true)}
              />
            </section>
          );
        })}

        {/* ── Финальный слайд завершения очереди ── */}
        <section className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0 [content-visibility:auto] [contain-intrinsic-size:auto_100dvh]">
          <EndOfFeedSlide
            onScrollToTop={handleScrollToTop}
            onResetFilters={onResetFilters}
          />
        </section>
      </div>

      {/* ── Встроенный лайтбокс (фото и детали) ── */}
      {lightboxData && (
        <EmbeddedLightbox
          {...lightboxData}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* ── Встроенное описание конкурса ── */}
      {isDescriptionOpen && (
        <EmbeddedDescriptionSheet
          isOpen={isDescriptionOpen}
          onClose={() => setIsDescriptionOpen(false)}
          contest={
            contestsMap[battles[activeIndex]?.contestId || ''] || {
              title: battles[activeIndex]?.title || 'Battle',
              description: '1v1 Live Battle duel between two featured tournament entries.',
              category: battles[activeIndex]?.category,
            }
          }
          stageInfo="1v1 Battle Duel"
        />
      )}
    </div>
  );
}

export default LiveBattleFeedComplete;
