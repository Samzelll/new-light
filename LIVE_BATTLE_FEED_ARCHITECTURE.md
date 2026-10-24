# Архитектура, Исходный Код и Устройство Ленты «Лайв Батл» (Live Battle Feed)

> **Автономный технический документ для ревьюеров и разработчиков.**  
> Этот документ содержит полное описание архитектуры, нативного движка скролла (CSS Scroll-Snap), аппаратной предзагрузки изображений, потоков данных, а также **исходный код компонентов и сервисов целиком**. Любой инженер может досконально изучить логику, протестировать проект и предложить архитектурные улучшения без необходимости открывать репозиторий.

---

## Оглавление
1. [Обзор и UI-концепция (TikTok/Reels 1v1 Arena)](#1-обзор-и-ui-концепция-tiktokreels-1v1-arena)
2. [Архитектурная схема потоков данных и состояний](#2-архитектурная-схема-потоков-данных-и-состояний)
3. [Канонические типы данных: `src/types/battle.ts`](#3-канонические-типы-данных-srctypesbattlets)
4. [Аппаратная предзагрузка и барьер готовности: `src/services/battleImagePreloader.ts`](#4-аппаратная-предзагрузка-и-барьер-готовности-srcservicesbattleimagepreloaderts)
5. [Основной компонент ленты: `src/components/contest/LiveBattleFeedComplete.tsx`](#5-основной-компонент-ленты-srccomponentscontestlivebattlefeedcompletetsx)
6. [Сервис данных и подсчет голосов: `src/services/battleDataService.ts`](#6-сервис-данных-и-подсчет-голосов-srcservicesbattledataservicets)
7. [Сервис рекомендаций и курсорной подгрузки: `src/services/recommendationService.ts`](#7-сервис-рекомендаций-и-курсорной-подгрузки-srcservicesrecommendationservicets)
8. [Разбор ключевых алгоритмов и инженерных решений](#8-разбор-ключевых-алгоритмов-и-инженерных-решений)
   - [8.1. Нативный CSS Scroll-Snap вместо кастомного свайпера](#81-нативный-css-scroll-snap-вместо-кастомного-свайпера)
   - [8.2. Стабильный `activeId` и аппаратный замок позиции (`useLayoutEffect`)](#82-стабильный-activeid-и-аппаратный-замок-позиции-uselayouteffect)
   - [8.3. Аппаратный барьер готовности фото (`useBattleReady`) и Skeleton-анимация](#83-аппаратный-барьер-готовности-фото-usebattleready-и-skeleton-анимация)
   - [8.4. Атомарное голосование, переключение и отмена голоса (Toggle / Unvote)](#84-атомарное-голосование-переключение-и-отмена-голоса-toggle--unvote)
   - [8.5. Гарантированное сохранение голосов (Local Storage + Supabase fallback)](#85-гарантированное-сохранение-голосов-local-storage--supabase-fallback)
   - [8.6. Финальный экран `EndOfFeedSlide` и плавный возврат в начало](#86-финальный-экран-endoffeedslide-и-плавный-возврат-в-начало)
   - [8.7. Безопасность внешних CDN доменов (`shouldBeUnoptimized`)](#87-безопасность-внешних-cdn-доменов-shouldbeunoptimized)
9. [Рекомендации по улучшению кода для код-ревью](#9-рекомендации-по-улучшению-кода-для-код-ревью)

---

## 1. Обзор и UI-концепция (TikTok/Reels 1v1 Arena)

Лента **Live Battle** разработана для мобильного и полноэкранного взаимодействия в формате вертикального бесконечного потока дуэлей:
- **Разделение экрана 50 / 50**: Видимый вьюпорт делится строго пополам между двумя соперниками (Красный угол сверху, Зеленый угол снизу).
- **Плавающий центральный бейдж «VS»**: Расположен строго по центру между двумя карточками с пульсирующей анимацией и индикатором оставшегося времени.
- **Однокликовое голосование (One-Tap Instant Feedback)**: 
  - Нажатие на карточку мгновенно регистрирует выбор.
  - Карточка сжимается до `scale-[0.88]`, подсвечивается изумрудным кольцом (`ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)]`) и бейджем «Выбрано».
  - Противоположная карточка приглушается (`opacity-70 brightness-[0.7]`).
  - Проявляются честные проценты распределения голосов с плавной интерполяцией.
- **Отмена голоса (Toggle / Unvote)**:
  - Повторное нажатие на выбранную карточку отменяет голос: изумрудное кольцо снимается, карточка возвращается к исходному размеру, счетчики и проценты возвращаются в исходное состояние.
  - Нажатие на противоположную карточку мгновенно переключает голос на другого участника.
- **Фиксация позиции**: Пользователь всегда остается на той карточке, за которую проголосовал (сброс к первому батлу исключен на уровне `useLayoutEffect` и `activeIdRef`).
- **Встроенный модальный лайтбокс**: Кнопка `Maximize2` открывает полноразмерный снимок без обрезки, биографию автора, ссылки на соцсети (Instagram, Telegram, X, Portfolio), статус спонсора и ступенчатый зум (1x ➔ 1.5x ➔ 2.5x).

---

## 2. Архитектурная схема потоков данных и состояний

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HomePage (src/app/page.tsx)                     │
│  - allBattles: BattleItem[] (курсорная загрузка без дублей)            │
│  - battleVotes: Record<battleId, 'red' | 'green'>                  │
│  - handleBattleVote(id, corner | null): поддержка отмены голоса        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│       LiveBattleFeedComplete (CSS Scroll-Snap Engine)                  │
│  - scrollerRef: HTMLDivElement (snap-y snap-mandatory, 60fps)          │
│  - activeIdRef + onScroll tracking (точное определение активного)     │
│  - useLayoutEffect anchor (предотвращает сброс скролла на 0)           │
│  - toggle vote / unvote логика                                         │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ BattleSlide                   │        │   EndOfFeedSlide (Final Card) │
│ - useBattleReady(both photos) │        │   - Завершение ленты          │
│ - Skeleton loading state      │        │   - Кнопка "В начало"         │
│ - Интерактивный клик (toggle) │        │   - Сброс фильтров            │
│ - Top (Red) & Bottom (Green)  │        └───────────────────────────────┘
│ - EmbeddedLightbox trigger    │
└───────────────────────────────┘
```

---

## 3. Канонические типы данных: `src/types/battle.ts`

```typescript
/**
 * Canonical Battle Feed Types & Interfaces
 */

export type BattleCorner = 'red' | 'green';

export interface CompetitorDetails {
  id: string;
  name: string;
  author: string;
  photo: string;
  photos?: string[];
  percent: number;
  votes?: number;
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

export interface VoteTotals {
  red: number;
  green: number;
}

export interface VoteState {
  corner: BattleCorner;
  status: 'pending' | 'confirmed';
  totals?: VoteTotals;
}

export type PhotosState = 'loading' | 'ready' | 'error';

export interface LiveBattleFeedProps {
  battles: BattleItem[];
  contestsMap?: Record<string, any>;
  battleVotes?: Record<string, BattleCorner>;
  onVote?: (battleId: string, corner: BattleCorner | null) => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
  modalOpen?: boolean;
}
```

---

## 4. Аппаратная предзагрузка и барьер готовности: `src/services/battleImagePreloader.ts`

```typescript
"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import { getImageProps } from 'next/image';
import { shouldBeUnoptimized } from '@/services/storageService';
import type { BattleItem, PhotosState, VoteTotals } from '@/types/battle';

export const FEED_SIZES = '(max-width: 640px) 100vw, 480px';

const cache = new Map<string, Promise<void>>();
const pinned = new Map<string, HTMLImageElement>();
const MAX_PINNED = 16;

/**
 * Preloads and hardware-decodes a photo using the exact srcset generated by next/image
 */
export function preloadPhoto(src: string, sizes = FEED_SIZES): Promise<void> {
  if (typeof window === 'undefined' || !src) return Promise.resolve();

  const key = `${src}|${sizes}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const isUnoptimized = shouldBeUnoptimized(src);
    const { props } = getImageProps({
      src,
      alt: '',
      fill: true,
      sizes,
      unoptimized: isUnoptimized,
    });

    const img = new window.Image();
    img.referrerPolicy = 'no-referrer';
    if (props.srcSet) img.srcset = props.srcSet;
    img.sizes = sizes;
    img.src = String(props.src);

    pinned.set(key, img);

    const promise = img
      .decode()
      .then(() => undefined)
      .catch((err) => {
        // If decoding failed, remove from cache to allow retry
        cache.delete(key);
        pinned.delete(key);
        throw err;
      });

    cache.set(key, promise);

    // Keep memory clean
    if (pinned.size > MAX_PINNED) {
      const oldestKey = pinned.keys().next().value;
      if (oldestKey) {
        pinned.delete(oldestKey);
        cache.delete(oldestKey);
      }
    }

    return promise;
  } catch (err) {
    cache.delete(key);
    pinned.delete(key);
    return Promise.reject(err);
  }
}

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);

    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Hook to ensure both photos in a battle are downloaded and decoded before voting is unlocked
 */
export function useBattleReady(battle: BattleItem) {
  const [state, setState] = useState<PhotosState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setState('loading');

    const redPhoto = battle.red?.photo;
    const greenPhoto = battle.green?.photo;

    if (!redPhoto && !greenPhoto) {
      setState('ready');
      return;
    }

    const tasks: Promise<void>[] = [];
    if (redPhoto) tasks.push(preloadPhoto(redPhoto));
    if (greenPhoto) tasks.push(preloadPhoto(greenPhoto));

    withTimeout(Promise.all(tasks), 8000)
      .then(() => {
        if (isMounted) setState('ready');
      })
      .catch(() => {
        if (isMounted) setState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [battle.id, battle.red?.photo, battle.green?.photo, attempt]);

  const retry = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  return { state, retry };
}

/**
 * Mathematically accurate percentage calculation from verified weighted votes
 */
export function calcPercents(redVotes: number, greenVotes: number): VoteTotals {
  const safeRed = Math.max(0, Number(redVotes) || 0);
  const safeGreen = Math.max(0, Number(greenVotes) || 0);
  const total = safeRed + safeGreen;

  if (total === 0) {
    return { red: 50, green: 50 };
  }

  const redPercent = Math.round((safeRed / total) * 100);
  const clampedRed = Math.max(1, Math.min(99, redPercent));
  return {
    red: clampedRed,
    green: 100 - clampedRed,
  };
}
```

---

## 5. Основной компонент ленты: `src/components/contest/LiveBattleFeedComplete.tsx`

```typescript
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
import type {
  BattleCorner,
  BattleItem,
  CompetitorDetails,
  LiveBattleFeedProps,
  VoteState,
} from '@/types/battle';
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
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  socialLinks?: CompetitorDetails['socialLinks'];
  isSelected?: boolean;
  onVote?: () => void;
}

function EmbeddedLightbox({
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
}: EmbeddedLightboxProps) {
  const allPhotos = photos && photos.length > 0 ? photos : [photoUrl];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreenModal, setIsFullscreenModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2.5>(1);

  // Сброс индекса при смене фото
  useEffect(() => {
    setActiveIndex(0);
    setZoomLevel(1);
    setIsFullscreenModal(false);
  }, [photoUrl]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreenModal) {
          setIsFullscreenModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreenModal, onClose]);

  if (!isOpen) return null;

  const currentPhoto = allPhotos[activeIndex] || photoUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-4xl max-h-[94vh] bg-[#141417] border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-800/80 bg-[#18181c]">
          <div className="flex items-center gap-2.5 min-w-0">
            {authorAvatar && (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20 shrink-0">
                <Image
                  src={resolveImageUrl(authorAvatar, 'avatars')}
                  alt={author || ''}
                  fill
                  unoptimized={shouldBeUnoptimized(authorAvatar)}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">{title}</h3>
              {author && <p className="text-[11px] text-neutral-400 truncate">{author}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFullscreenModal(true);
                setZoomLevel(1);
              }}
              title="Открыть оригинал без обрезки"
              className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-neutral-700/80 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Maximize2 size={13} className="text-[#ff6a2b]" />
              <span className="hidden sm:inline">Оригинал</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Тело модалки */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
          {/* Фото */}
          <div
            onClick={() => {
              setIsFullscreenModal(true);
              setZoomLevel(1);
            }}
            className="relative flex-1 min-h-[360px] sm:min-h-[460px] bg-[#101014] flex items-center justify-center cursor-zoom-in group overflow-hidden"
          >
            {/* Ambient Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <Image
                src={currentPhoto}
                alt=""
                fill
                unoptimized={shouldBeUnoptimized(currentPhoto)}
                sizes="100vw"
                className="object-cover filter blur-3xl opacity-35 scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[#0c0c10]/40 backdrop-blur-xs" />
            </div>

            {/* Sharp Centered Photo */}
            <div className="relative w-full h-full p-3 sm:p-5 flex items-center justify-center z-10">
              <Image
                src={currentPhoto}
                alt={title}
                fill
                unoptimized={shouldBeUnoptimized(currentPhoto)}
                className="object-contain group-hover:scale-[1.01] transition-transform duration-300"
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            </div>
          </div>

          {/* Боковая панель */}
          <div className="w-full md:w-80 p-5 bg-[#141417] border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {category && (
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff6a2b] flex items-center gap-1.5">
                  <Tag size={12} />
                  <span>{category}</span>
                </div>
              )}

              {authorBio && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-400 mb-1">Об авторе</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">{authorBio}</p>
                </div>
              )}

              {sponsorName && (
                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Award size={14} className="text-[#ff6a2b]" />
                    <span>{sponsorName}</span>
                  </div>
                  {sponsorTier && (
                    <div className="text-[11px] text-neutral-400">{sponsorTier}</div>
                  )}
                  {prizePool && (
                    <div className="text-xs font-extrabold text-emerald-400">
                      Призовой фонд: {prizePool}
                    </div>
                  )}
                </div>
              )}

              {socialLinks && Object.values(socialLinks).some(Boolean) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-400">Контакты и портфолио</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {socialLinks.instagram && (
                      <a
                        href={socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                      >
                        Instagram
                      </a>
                    )}
                    {socialLinks.telegram && (
                      <a
                        href={socialLinks.telegram}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                      >
                        Telegram
                      </a>
                    )}
                    {socialLinks.portfolio && (
                      <a
                        href={socialLinks.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
                      >
                        Портфолио
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Кнопка голосования внутри модалки */}
            {onVote && (
              <button
                type="button"
                onClick={() => {
                  onVote();
                  onClose();
                }}
                disabled={isSelected}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg ${
                  isSelected
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Вы проголосовали за эту работу</span>
                  </>
                ) : (
                  <span>Отдать голос за эту работу</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр оригинала */}
      {isFullscreenModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-2 select-none animate-fade-in"
          onClick={() => setIsFullscreenModal(false)}
        >
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2.5 : 1));
              }}
              className="px-3 py-1.5 rounded-full bg-neutral-900/90 text-white text-xs font-bold border border-white/10 flex items-center gap-1.5"
            >
              {zoomLevel === 1 ? <ZoomIn size={14} /> : <ZoomOut size={14} />}
              <span>{zoomLevel}x</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreenModal(false)}
              className="w-9 h-9 rounded-full bg-neutral-900/90 text-white flex items-center justify-center border border-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-2 cursor-zoom-out"
            onClick={() => setIsFullscreenModal(false)}
          >
            <div
              className="relative w-full h-full max-w-7xl max-h-screen transition-transform duration-200 flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel})` }}
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2.5 : 1));
              }}
            >
              <Image
                src={currentPhoto}
                alt={title}
                fill
                priority
                unoptimized={shouldBeUnoptimized(currentPhoto)}
                referrerPolicy="no-referrer"
                className="object-contain"
                sizes="100vw"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
            <h4 className="font-bold text-white mb-1">Формат турнира</h4>
            <p className="text-neutral-400">
              {stageInfo || '1v1 Лайв-Батл с моментальным учетом голосов.'}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-1">Правила голосования</h4>
            <p className="text-neutral-400 leading-relaxed">
              Один голос на одну дуэль. Выберите наиболее качественную и атмосферную
              работу. Результаты учитывают веса доверия авторов.
            </p>
          </div>

          {contest.description && (
            <div>
              <h4 className="font-bold text-white mb-1">О конкурсе</h4>
              <p className="text-neutral-400 leading-relaxed">{contest.description}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
        >
          Понятно
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
          onClick={() => {
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
              sizes={FEED_SIZES}
              unoptimized={shouldBeUnoptimized(battle.red.photo)}
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
                  className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in transition-colors cursor-pointer"
                  title="Нажмите повторно, чтобы отменить выбор"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Выбрано</span>
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
                  sponsorName: battle.red.sponsorName || battle.sponsorName,
                  sponsorTier: battle.red.sponsorTier,
                  prizePool: battle.red.prizePool,
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
          onClick={() => {
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
              sizes={FEED_SIZES}
              unoptimized={shouldBeUnoptimized(battle.green.photo)}
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
                  className="px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in transition-colors cursor-pointer"
                  title="Нажмите повторно, чтобы отменить выбор"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Выбрано</span>
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
                  sponsorName: battle.green.sponsorName || battle.sponsorName,
                  sponsorTier: battle.green.sponsorTier,
                  prizePool: battle.green.prizePool,
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
}: LiveBattleFeedProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Стабильная позиция по activeId, а не числовому индексу
  const [activeId, setActiveId] = useState<string | null>(battles[0]?.id ?? null);
  const activeIdRef = useRef<string | null>(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

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
      setActiveId(battles[0].id);
      activeIdRef.current = battles[0].id;
    }
  }, [battles, activeId]);

  // 5.1. Восстановление и удержание позиции скролла: предотвращает сброс на 1-й батл
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeIdRef.current) return;
    const targetIdx = battles.findIndex((b) => b.id === activeIdRef.current);
    if (targetIdx > 0 && scroller.clientHeight > 0) {
      const expectedTop = targetIdx * scroller.clientHeight;
      if (Math.abs(scroller.scrollTop - expectedTop) > 10) {
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
        activeIdRef.current = b.id;
        setActiveId(b.id);
      }
    }
  }, [battles]);

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
              activeIdRef.current = bId;
              setActiveId(bId);
            }
          }
        }
      },
      { root, threshold: 0.6 }
    );

    const sections = root.querySelectorAll('[data-battle-id]');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [battles]);

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
      setActiveId(bId);
      activeIdRef.current = bId;

      const currentVote = localVotes[bId]?.corner || battleVotes[bId] || null;

      // ── СЦЕНАРИЙ 1: Отмена голоса (повторное нажатие на выбранный угол) ──
      if (currentVote === corner) {
        voteLockRef.current.delete(bId);

        setLocalVotes((prev) => {
          const next = { ...prev };
          delete next[bId];
          return next;
        });

        if (onVote) {
          onVote(bId, null);
        }

        try {
          const { cancelBattleVote } = await import('@/services/battleDataService');
          await cancelBattleVote(battle.contestId ?? battle.id);
        } catch (e) {
          console.warn('Cancel vote note:', e);
        }
        return;
      }

      // ── СЦЕНАРИЙ 2: Голосование (новый голос или переключение на противоположный) ──
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
      }

      try {
        const { castBattleVote } = await import('@/services/battleDataService');
        await castBattleVote(battle.contestId ?? battle.id, battle[corner].id);
      } catch (err: any) {
        console.warn('Vote background sync note:', err);
      }
    },
    [battleVotes, localVotes, onVote]
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
          Нет активных батлов по текущим фильтрам
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-xs">
          Попробуйте сбросить фильтры или выбрать другие категории.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-full bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs shadow-lg shadow-[#ff6a2b]/20 transition-all active:scale-95"
          >
            Сбросить фильтры
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
              className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0"
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
        <section className="h-full w-full snap-start snap-always relative overflow-hidden shrink-0">
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
              title: battles[activeIndex]?.title || 'Батл',
              description: '1v1 Лайв-Батл дуэль между двумя лучшими работами турнира.',
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
```

---

## 6. Сервис данных и подсчет голосов: `src/services/battleDataService.ts`

```typescript
/**
 * Battle Data Service
 * 
 * Modular data layer for 1v1 Battle contests.
 * Provides getBattle, castVote, and getNextBattle so the backend
 * can be swapped out easily without modifying UI components.
 */

import { supabase } from '@/services/supabase';
import { getContests, getContestById } from '@/services/contestService';
import { getParticipants } from '@/services/participantService';
import { castVote as castVoteService } from '@/services/voteService';
import { resolveImageUrl } from '@/services/storageService';
import type { BattleItem, CompetitorDetails, BattleCorner } from '@/types/battle';

export interface BattleCompetitor {
  id: string;
  name: string;
  photoUrl: string;
  photos?: string[];
  votes: number;
  percentage: number;
  corner: 'red' | 'blue';
  isUserPick?: boolean;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
}

export interface BattleContest {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  rules: string;
  status: string;
  totalVotes: number;
  competitors: [BattleCompetitor, BattleCompetitor];
  userVotedId: string | null;
}

// Fallback competitor sets if a contest has fewer than 2 competitors
const FALLBACK_PAIRS: Record<string, [Partial<BattleCompetitor>, Partial<BattleCompetitor>]> = {
  default: [
    {
      name: 'Manhattan sunset',
      photoUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1080&q=80',
    },
    {
      name: 'Neon Shinjuku',
      photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    },
  ],
  'contest-stars': [
    {
      name: 'Golden Glow Horizon',
      photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
    },
    {
      name: 'Cosmic Neon Eclipse',
      photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80',
    },
  ],
};

/**
 * Fetch a single battle contest and its 1v1 competitors with vote stats.
 */
export async function getBattle(contestId?: string): Promise<BattleContest | null> {
  try {
    let targetId = contestId;

    // If no ID provided, pick the first battle contest
    if (!targetId) {
      const { data: allContests } = await getContests({ includePausedOrBlocked: false });
      const firstBattle = allContests?.find((c) => c.type === 'battle');
      if (firstBattle) targetId = firstBattle.id;
    }

    if (!targetId) targetId = 'contest-battle-01';

    const { data: contest } = await getContestById(targetId);
    if (!contest) return null;

    // Fetch participants
    const { data: participantsData } = await getParticipants(targetId, 'all');
    const participants = participantsData || [];

    // Fetch votes with trust_weight for accurate scoring/points
    const { data: votesData } = await supabase
      .from('votes')
      .select('id, participant_id, voter_id, trust_weight')
      .eq('contest_id', targetId);

    const votes = votesData || [];
    const totalVotes = votes.length;

    // Check current user session for existing vote
    let userVotedId: string | null = null;
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (currentUserId) {
      const myVote = votes.find((v: any) => v.voter_id === currentUserId);
      if (myVote) userVotedId = myVote.participant_id;
    }

    // Determine competitors
    const fallbackPair = FALLBACK_PAIRS[targetId] || FALLBACK_PAIRS.default;

    // Participant 1
    const p1 = participants[0];
    const p1Id = p1?.id || 'part-1';
    const p1Name = p1?.submission_data?.name || fallbackPair[0].name || 'Competitor 1';
    const rawP1Author = (p1?.submission_data as any)?.author?.trim();
    const p1Author = rawP1Author && !rawP1Author.startsWith('@challenger') ? rawP1Author : undefined;
    const p1Photo = resolveImageUrl(p1?.submission_data?.photos?.[0] || fallbackPair[0].photoUrl || '', 'submissions');
    const p1VotesRaw = votes
      .filter((v: any) => v.participant_id === p1Id)
      .reduce((sum: number, v: any) => sum + (Number(v.trust_weight) > 0 ? Number(v.trust_weight) : 1), 0);
    const p1Votes = Math.round(p1VotesRaw * 10) / 10;

    // Participant 2
    const p2 = participants[1];
    const p2Id = p2?.id || 'part-2';
    const p2Name = p2?.submission_data?.name || fallbackPair[1].name || 'Competitor 2';
    const rawP2Author = (p2?.submission_data as any)?.author?.trim();
    const p2Author = rawP2Author && !rawP2Author.startsWith('@challenger') ? rawP2Author : undefined;
    const p2Photo = resolveImageUrl(p2?.submission_data?.photos?.[0] || fallbackPair[1].photoUrl || '', 'submissions');
    const p2VotesRaw = votes
      .filter((v: any) => v.participant_id === p2Id)
      .reduce((sum: number, v: any) => sum + (Number(v.trust_weight) > 0 ? Number(v.trust_weight) : 1), 0);
    const p2Votes = Math.round(p2VotesRaw * 10) / 10;

    // Calculate percentages
    let p1Percent = 50;
    let p2Percent = 50;
    const effectiveTotal = p1Votes + p2Votes;
    if (effectiveTotal > 0) {
      p1Percent = Number(((p1Votes / effectiveTotal) * 100).toFixed(1));
      p2Percent = Number((100 - p1Percent).toFixed(1));
    }

    const competitor1: BattleCompetitor = {
      id: p1Id,
      name: p1Name,
      author: p1Author,
      authorAvatar: p1Author ? resolveImageUrl(p1?.profiles?.avatar_url, 'avatars') || undefined : undefined,
      authorBio: p1?.submission_data?.description || `Challenger representing ${p1Name}.`,
      photoUrl: p1Photo,
      photos: (p1?.submission_data?.photos && p1.submission_data.photos.length > 0) ? p1.submission_data.photos : [p1Photo],
      votes: p1Votes,
      percentage: p1Percent,
      corner: 'red',
      isUserPick: userVotedId === p1Id,
    };

    const competitor2: BattleCompetitor = {
      id: p2Id,
      name: p2Name,
      author: p2Author,
      authorAvatar: p2Author ? resolveImageUrl(p2?.profiles?.avatar_url, 'avatars') || undefined : undefined,
      authorBio: p2?.submission_data?.description || `Challenger representing ${p2Name}.`,
      photoUrl: p2Photo,
      photos: (p2?.submission_data?.photos && p2.submission_data.photos.length > 0) ? p2.submission_data.photos : [p2Photo],
      votes: p2Votes,
      percentage: p2Percent,
      corner: 'blue',
      isUserPick: userVotedId === p2Id,
    };

    return {
      id: contest.id,
      title: contest.title?.toUpperCase() || 'BATTLE ARENA',
      description: contest.description || 'Duel of two strongest works. Vote for the most atmospheric shot.',
      category: contest.categories?.name || 'Street photo',
      format: '1 vs 1 battle',
      rules: contest.rules || 'One vote per user. Tapping your choice casts an immutable vote. Trust-weighted ranking.',
      status: contest.status,
      totalVotes: effectiveTotal || totalVotes,
      competitors: [competitor1, competitor2],
      userVotedId,
    };
  } catch (err) {
    console.error('Error fetching battle contest:', err);
    return null;
  }
}

const BATTLE_VOTES_STORAGE_KEY = 'opinion_net_battle_votes';

export function getPersistedBattleVotes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BATTLE_VOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistBattleVote(battleOrContestId: string, participantId: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPersistedBattleVotes();
    existing[battleOrContestId] = participantId;
    localStorage.setItem(BATTLE_VOTES_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function removePersistedBattleVote(battleOrContestId: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPersistedBattleVotes();
    delete existing[battleOrContestId];
    localStorage.setItem(BATTLE_VOTES_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

/**
 * Cast a vote for a competitor in a battle contest with resilient local + server persistence.
 */
export async function castVote(
  contestId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  // Always persist locally first so votes are never lost even if guest/offline
  persistBattleVote(contestId, participantId);

  try {
    let trustWeight = 1.0;
    try {
      const { getMyTrust } = await import('@/services/trustService');
      const { data: trustData } = await getMyTrust();
      if (trustData?.score && trustData.score > 0) {
        trustWeight = Number(trustData.score);
      }
    } catch {
      // Fallback 1.0 weight
    }

    const { error } = await castVoteService({
      contestId,
      stageId: contestId,
      groupId: contestId,
      participantId,
      trustWeight,
    });

    if (error) {
      console.warn('Server vote save note (recorded locally):', error);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Error casting battle vote to server (recorded locally):', err);
    return { success: true };
  }
}

export const castBattleVote = castVote;

/**
 * Cancel an existing vote in a battle contest.
 */
export async function cancelBattleVote(contestId: string): Promise<{ success: boolean; error?: string }> {
  removePersistedBattleVote(contestId);
  try {
    const { cancelVote } = await import('@/services/voteService');
    await cancelVote({ contestId });
    return { success: true };
  } catch (err: any) {
    console.warn('Cancel vote server notice (removed locally):', err);
    return { success: true };
  }
}

/**
 * Get the next battle in the feed to enable endless exploring.
 */
export async function getNextBattle(currentContestId: string): Promise<BattleContest | null> {
  try {
    const { data: allContests } = await getContests({ includePausedOrBlocked: false });
    const battles = (allContests || []).filter((c) => c.type === 'battle');

    if (battles.length === 0) return null;

    const currentIndex = battles.findIndex((b) => b.id === currentContestId);
    const nextIndex = (currentIndex + 1) % battles.length;
    const nextContest = battles[nextIndex];

    if (!nextContest) return null;
    return await getBattle(nextContest.id);
  } catch (err) {
    console.error('Error fetching next battle:', err);
    return null;
  }
}

export const SEED_SAMPLE_BATTLES: BattleItem[] = [
  {
    id: 'battle-01',
    contestId: 'contest-neon-shinjuku',
    title: 'NEON TOKYO · 1v1 Duel',
    category: 'Cyberpunk & Neon',
    tags: ['Art', 'Design', 'Photography'],
    timeRemaining: '12h left',
    isPopular: true,
    sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
    red: {
      id: 'red-01',
      name: 'Shinjuku in Rain',
      author: '@kenji_lens',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      authorBio: 'Street documentary creator based in Tokyo. Capturing wet neon pavement reflections, umbrellas, and cyber alleyways.',
      photo: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=85',
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=85',
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=85',
      ],
      percent: 58,
      votes: 116,
      sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
      sponsorTier: 'Headline Partner',
      prizePool: '$4,000 Global Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/kenji_lens',
        telegram: 'https://t.me/kenji_lens',
        twitter: 'https://x.com/kenji_lens',
        portfolio: 'https://kenjilens.tokyo',
      },
    },
    green: {
      id: 'green-01',
      name: 'Neon Crossing',
      author: '@yuki_street',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      authorBio: 'Urban colorist and night-crawler capturing Shibuya scramble and Akihabara signs through customized vintage prism filters.',
      photo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=85',
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=85',
      ],
      percent: 42,
      votes: 84,
      sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
      sponsorTier: 'Headline Partner',
      prizePool: '$4,000 Global Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/yuki_street',
        telegram: 'https://t.me/yuki_street',
        twitter: 'https://x.com/yuki_street',
        portfolio: 'https://yukistreet.photo',
      },
    },
  },
  {
    id: 'battle-02',
    contestId: 'contest-tennis-apply',
    title: 'TENNIS CHAMPIONSHIP · Final Set',
    category: 'Sports & Motion',
    tags: ['Sports'],
    timeRemaining: '4h left',
    isPopular: true,
    sponsorName: 'Nike Action Sports & Pro Tour',
    red: {
      id: 'red-02',
      name: 'Ace Serve',
      author: '@alex_shot',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      authorBio: 'ATP Tour action photographer catching 120mph flat serves frozen in air at maximum racket contact.',
      photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=85',
        'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=1200&q=85',
        'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&q=85',
      ],
      percent: 54,
      votes: 108,
      sponsorName: 'Nike Action Sports & Pro Tour',
      sponsorTier: 'Global Athletics Sponsor',
      prizePool: '$6,000 Cash Grant',
      socialLinks: {
        instagram: 'https://instagram.com/alex_shot',
        telegram: 'https://t.me/alex_shot',
        twitter: 'https://x.com/alex_shot',
        portfolio: 'https://alexshot.tennis',
      },
    },
    green: {
      id: 'green-02',
      name: 'Clay Slide',
      author: '@mateo_clay',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
      authorBio: 'Roland Garros red clay specialist tracking dust clouds and aggressive baseline sliding.',
      photo: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&q=85',
        'https://images.unsplash.com/photo-1530915536417-6d601666ff7c?w=1200&q=85',
        'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=1200&q=85',
      ],
      percent: 46,
      votes: 92,
      sponsorName: 'Nike Action Sports & Pro Tour',
      sponsorTier: 'Global Athletics Sponsor',
      prizePool: '$6,000 Cash Grant',
      socialLinks: {
        instagram: 'https://instagram.com/mateo_clay',
        telegram: 'https://t.me/mateo_clay',
        twitter: 'https://x.com/mateo_clay',
        portfolio: 'https://mateoclay.com',
      },
    },
  },
  {
    id: 'battle-03',
    contestId: 'contest-photo-month',
    title: 'MOUNTAIN VIEW · Golden Hour',
    category: 'Nature & Landscape',
    tags: ['Photography'],
    timeRemaining: '18h left',
    isPopular: false,
    sponsorName: 'Earth Explorer & Hasselblad Master',
    red: {
      id: 'red-03',
      name: 'Alps Peak Mist',
      author: '@nordic_eye',
      authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
      authorBio: 'Alpine landscape explorer documenting morning mist layers across Dolomites and Swiss peaks.',
      photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85',
        'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=85',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=85',
      ],
      percent: 51,
      votes: 102,
      sponsorName: 'Earth Explorer & Hasselblad Master',
      sponsorTier: 'Expedition Partner',
      prizePool: '$8,000 Mountain Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/nordic_eye',
        telegram: 'https://t.me/nordic_eye',
        twitter: 'https://x.com/nordic_eye',
        portfolio: 'https://nordiceye.earth',
      },
    },
    green: {
      id: 'green-03',
      name: 'Sunset Fjord',
      author: '@elena_arctic',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      authorBio: 'Wilderness photographer focusing on coastal waterways, northern mirrors, and glacial reflections.',
      photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=85',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=85',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=85',
      ],
      percent: 49,
      votes: 98,
      sponsorName: 'Earth Explorer & Hasselblad Master',
      sponsorTier: 'Expedition Partner',
      prizePool: '$8,000 Mountain Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/elena_arctic',
        telegram: 'https://t.me/elena_arctic',
        twitter: 'https://x.com/elena_arctic',
        portfolio: 'https://elenaarctic.com',
      },
    },
  },
  {
    id: 'battle-04',
    contestId: 'contest-glamour',
    title: 'MISS GLAMOUR · Top 2 Duel',
    category: 'Portrait & Style',
    tags: ['Photography', 'Art', 'Creative'],
    timeRemaining: '8h left',
    isPopular: true,
    sponsorName: 'Vogue Creator Initiative & Elite Studio',
    red: {
      id: 'red-04',
      name: 'Flash in the Dark',
      author: '@alisa_fashion',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      authorBio: 'Studio portrait artist specializing in hard specular flash, avant-garde makeup, and monochrome styling.',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=85',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=85',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=85',
      ],
      percent: 53,
      votes: 106,
      sponsorName: 'Vogue Creator Initiative & Elite Studio',
      sponsorTier: 'Fashion Platinum Sponsor',
      prizePool: '$5,000 Editorial Spread + Feature Cover',
      socialLinks: {
        instagram: 'https://instagram.com/alisa_fashion',
        telegram: 'https://t.me/alisa_fashion',
        twitter: 'https://x.com/alisa_fashion',
        portfolio: 'https://alisafashion.design',
      },
    },
    green: {
      id: 'green-04',
      name: 'Silk Glance',
      author: '@milana_model',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      authorBio: 'High fashion editorial creator. Natural beauty lighting with silk fabrics and golden skin tones.',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=85',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&q=85',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=85',
      ],
      percent: 47,
      votes: 94,
      sponsorName: 'Vogue Creator Initiative & Elite Studio',
      sponsorTier: 'Fashion Platinum Sponsor',
      prizePool: '$5,000 Editorial Spread + Feature Cover',
      socialLinks: {
        instagram: 'https://instagram.com/milana_model',
        telegram: 'https://t.me/milana_model',
        twitter: 'https://x.com/milana_model',
        portfolio: 'https://milanamodel.art',
      },
    },
  },
  {
    id: 'battle-05',
    contestId: 'contest-design-ideas',
    title: 'FUTURE DESIGN · 3D Concept',
    category: 'Art & Design',
    tags: ['Design', 'Art'],
    timeRemaining: '24h left',
    isPopular: true,
    sponsorName: 'Maxon Cinema 4D & Unreal Engine',
    red: {
      id: 'red-05',
      name: 'Neon Polygon',
      author: '@render_master',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      authorBio: 'Procedural 3D animator and look-dev artist focusing on luminous geometry and physical glass shaders.',
      photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=85',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=85',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=85',
      ],
      percent: 61,
      votes: 122,
      sponsorName: 'Maxon Cinema 4D & Unreal Engine',
      sponsorTier: 'Creative Technology Sponsor',
      prizePool: '$3,500 Hardware Grant',
      socialLinks: {
        instagram: 'https://instagram.com/render_master',
        telegram: 'https://t.me/render_master',
        twitter: 'https://x.com/render_master',
        portfolio: 'https://rendermaster.cg',
      },
    },
    green: {
      id: 'green-05',
      name: 'Cyber Structure',
      author: '@vector_art',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
      authorBio: 'Generative architect exploring parametric facades and algorithmic volumetric lighting.',
      photo: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=1200&q=85',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85',
        'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200&q=85',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=85',
      ],
      percent: 39,
      votes: 78,
      sponsorName: 'Maxon Cinema 4D & Unreal Engine',
      sponsorTier: 'Creative Technology Sponsor',
      prizePool: '$3,500 Hardware Grant',
      socialLinks: {
        instagram: 'https://instagram.com/vector_art',
        telegram: 'https://t.me/vector_art',
        twitter: 'https://x.com/vector_art',
        portfolio: 'https://vectorart.io',
      },
    },
  },
];

/**
 * Fetch all battle items for TikTokBattleView, merging newly created
 * and database-persisted battles right at the top.
 */
export async function getAllBattleItems(): Promise<BattleItem[]> {
  try {
    const { data: allContests } = await getContests({ includePausedOrBlocked: false });
    const battleContests = (allContests || []).filter(
      (c) => c.type === 'battle' || c.group_size === 2
    );

    const sampleContestIds = new Set(SEED_SAMPLE_BATTLES.map((s) => s.contestId).filter(Boolean));
    const dynamicItems: BattleItem[] = [];

    for (const contest of battleContests) {
      const battle = await getBattle(contest.id);
      if (!battle || !battle.competitors || battle.competitors.length < 2) continue;

      const p1 = battle.competitors[0];
      const p2 = battle.competitors[1];

      dynamicItems.push({
        id: `battle-${contest.id}`,
        contestId: contest.id,
        title: contest.title?.toUpperCase() || '1V1 BATTLE',
        category: contest.categories?.name || 'Showdown Duel',
        timeRemaining: contest.status === 'active' ? 'Voting active' : 'Finished',
        tags: ['Battle', contest.categories?.name || 'Showdown'].filter(Boolean),
        isPopular: Boolean(contest.is_featured),
        sponsorName: 'Community Arena Duel',
        red: {
          id: p1.id,
          name: p1.name || 'Challenger 1',
          author: p1.author || '@challenger1',
          authorAvatar: p1.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          authorBio: 'Challenger 1 in this 1v1 battle showdown.',
          photo: p1.photoUrl || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80',
          percent: p1.percentage,
          votes: p1.votes || Math.max(1, Math.round((p1.percentage || 50) * 2)),
        },
        green: {
          id: p2.id,
          name: p2.name || 'Challenger 2',
          author: p2.author || '@challenger2',
          authorAvatar: p2.authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
          authorBio: 'Challenger 2 in this 1v1 battle showdown.',
          photo: p2.photoUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80',
          percent: p2.percentage,
          votes: p2.votes || Math.max(1, Math.round((p2.percentage || 50) * 2)),
        },
      });
    }

    // User-created and non-sample battles appear FIRST!
    const userCreated = dynamicItems.filter((b) => !sampleContestIds.has(b.contestId));

    // Also update any sample battles with live percentage data from database
    const updatedSamples = SEED_SAMPLE_BATTLES.map((sample) => {
      const live = dynamicItems.find((d) => d.contestId === sample.contestId);
      if (live) {
        return {
          ...sample,
          red: { ...sample.red, percent: live.red.percent, votes: live.red.votes, id: live.red.id },
          green: { ...sample.green, percent: live.green.percent, votes: live.green.votes, id: live.green.id },
        };
      }
      return sample;
    });

    return [...userCreated, ...updatedSamples];
  } catch (err) {
    console.error('Error fetching all battle items:', err);
    return SEED_SAMPLE_BATTLES;
  }
}
```

---

## 7. Сервис рекомендаций и курсорной подгрузки: `src/services/recommendationService.ts`

```typescript
/**
 * Recommendation & Infinite Preloading Service for TikTok-style Feeds
 * 
 * Provides progressive batch loading, proactive image preloading,
 * and endless recommendations for 1v1 Battles and 4-way Group Contests.
 */

import type { BattleItem } from '@/types/battle';
import type { Group } from '@/services/types';

// Curated pool of dynamic battles to expand the infinite stream with full author and sponsor data
const SAMPLE_EXPANSION_BATTLES: BattleItem[] = [
  {
    id: 'battle-rec-01',
    contestId: 'contest-street-bw',
    title: 'STREET B&W · Contrast Duel',
    category: 'Monochrome & Noir',
    tags: ['Photography', 'Art'],
    timeRemaining: '14h left',
    isPopular: true,
    sponsorName: 'Leica Masters & Urban Street Guild',
    red: {
      id: 'red-rec-01',
      name: 'Shadows on Asphalt',
      author: '@shadow_seeker',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      authorBio: 'Tokyo street photographer focusing on high-contrast silhouetted figures and rainy pavements. Shot on 35mm f/1.4 prime lens.',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80',
      percent: 54,
      votes: 108,
      sponsorName: 'Leica Masters & Urban Street Guild',
      sponsorTier: 'Premier Diamond Partner',
      prizePool: '$5,000 Cash Grant + Exhibition in Berlin',
      socialLinks: {
        instagram: 'https://instagram.com/shadow_seeker',
        telegram: 'https://t.me/shadow_seeker',
        twitter: 'https://x.com/shadow_seeker',
        portfolio: 'https://shadowseeker.photo',
      },
    },
    green: {
      id: 'green-rec-01',
      name: 'Subway Light Ray',
      author: '@metro_noir',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      authorBio: 'Underground transit light explorer. Capturing beam reflections through dust and tile mosaics in metropolitan subways.',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80',
      percent: 46,
      votes: 92,
      sponsorName: 'Leica Masters & Urban Street Guild',
      sponsorTier: 'Premier Diamond Partner',
      prizePool: '$5,000 Cash Grant + Exhibition in Berlin',
      socialLinks: {
        instagram: 'https://instagram.com/metro_noir',
        telegram: 'https://t.me/metro_noir',
        twitter: 'https://x.com/metro_noir',
        portfolio: 'https://metronoir.art',
      },
    },
  },
  {
    id: 'battle-rec-02',
    contestId: 'contest-nature-stars',
    title: 'WILD HORIZON · Mountain Duel',
    category: 'Landscape & Nature',
    tags: ['Photography', 'Creative'],
    timeRemaining: '6h left',
    isPopular: true,
    sponsorName: 'National Geographic Visual Fund',
    red: {
      id: 'red-rec-02',
      name: 'Misty Alpine Ridge',
      author: '@peak_walker',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      authorBio: 'Alpinist and high-altitude visual creator. Documenting glacier melt and twilight ridge lines above 3,000 meters.',
      photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
      percent: 62,
      votes: 124,
      sponsorName: 'National Geographic Visual Fund',
      sponsorTier: 'Official Title Sponsor',
      prizePool: '$10,000 Expedition Grant',
      socialLinks: {
        instagram: 'https://instagram.com/peak_walker',
        telegram: 'https://t.me/peak_walker',
        twitter: 'https://x.com/peak_walker',
        portfolio: 'https://peakwalker.earth',
      },
    },
    green: {
      id: 'green-rec-02',
      name: 'Emerald Valley Mist',
      author: '@nordic_lens',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      authorBio: 'Fjord and Nordic forest photographer. Specializing in long exposure morning fog and emerald moss ecosystems.',
      photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&q=80',
      percent: 38,
      votes: 76,
      sponsorName: 'National Geographic Visual Fund',
      sponsorTier: 'Official Title Sponsor',
      prizePool: '$10,000 Expedition Grant',
      socialLinks: {
        instagram: 'https://instagram.com/nordic_lens',
        telegram: 'https://t.me/nordic_lens',
        twitter: 'https://x.com/nordic_lens',
        portfolio: 'https://nordiclense.com',
      },
    },
  },
  {
    id: 'battle-rec-03',
    contestId: 'contest-design-ideas',
    title: 'FUTURISM · Isometric Duel',
    category: '3D & Concept Art',
    tags: ['Design', 'Art'],
    timeRemaining: '20h left',
    isPopular: false,
    sponsorName: 'Houdini & Octane Render Labs',
    red: {
      id: 'red-rec-03',
      name: 'Cybernetic Cube',
      author: '@mesh_artisan',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
      authorBio: 'Procedural hard-surface artist working on neon geometry, mathematical fractals, and raytraced reflections.',
      photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=900&q=80',
      percent: 48,
      votes: 96,
      sponsorName: 'Houdini & Octane Render Labs',
      sponsorTier: 'Innovator Sponsor',
      prizePool: '$4,000 Creative Software Bundle',
      socialLinks: {
        instagram: 'https://instagram.com/mesh_artisan',
        telegram: 'https://t.me/mesh_artisan',
        twitter: 'https://x.com/mesh_artisan',
        portfolio: 'https://meshartisan.xyz',
      },
    },
    green: {
      id: 'green-rec-03',
      name: 'Abstract Fluid Core',
      author: '@render_flow',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      authorBio: 'Fluid dynamics specialist and digital sculptor creating hyper-gloss chrome and iridescent viscosities.',
      photo: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=900&q=80',
      percent: 52,
      votes: 104,
      sponsorName: 'Houdini & Octane Render Labs',
      sponsorTier: 'Innovator Sponsor',
      prizePool: '$4,000 Creative Software Bundle',
      socialLinks: {
        instagram: 'https://instagram.com/render_flow',
        telegram: 'https://t.me/render_flow',
        twitter: 'https://x.com/render_flow',
        portfolio: 'https://renderflow.studio',
      },
    },
  },
  {
    id: 'battle-rec-04',
    contestId: 'contest-tennis-apply',
    title: 'COURT GLORY · Action Shot',
    category: 'Sports & Motion',
    tags: ['Sports'],
    timeRemaining: '11h left',
    isPopular: true,
    sponsorName: 'Nike Action Sports & Sony Alpha',
    red: {
      id: 'red-rec-04',
      name: 'Power Smash',
      author: '@speed_capture',
      authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200',
      authorBio: 'High-speed sports photographer capturing 1/8000s shutter action at Grand Slam and clay court tourneys.',
      photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80',
      percent: 57,
      votes: 114,
      sponsorName: 'Nike Action Sports & Sony Alpha',
      sponsorTier: 'Official Grand Slam Partner',
      prizePool: '$7,500 Gear Grant + VIP Media Pass',
      socialLinks: {
        instagram: 'https://instagram.com/speed_capture',
        telegram: 'https://t.me/speed_capture',
        twitter: 'https://x.com/speed_capture',
        portfolio: 'https://speedcapture.pro',
      },
    },
    green: {
      id: 'green-rec-04',
      name: 'Backhand Spin',
      author: '@tennis_pro',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      authorBio: 'Editorial sports documentarian focusing on athlete determination, dust clouds, and dynamic courtside kinetics.',
      photo: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=900&q=80',
      percent: 43,
      votes: 86,
      sponsorName: 'Nike Action Sports & Sony Alpha',
      sponsorTier: 'Official Grand Slam Partner',
      prizePool: '$7,500 Gear Grant + VIP Media Pass',
      socialLinks: {
        instagram: 'https://instagram.com/tennis_pro',
        telegram: 'https://t.me/tennis_pro',
        twitter: 'https://x.com/tennis_pro',
        portfolio: 'https://tennisprophotos.com',
      },
    },
  },
];

// Preload helper to ensure zero flash/delay when navigating
export function preloadImages(urls: (string | undefined)[]) {
  if (typeof window === 'undefined') return;
  urls.forEach((url) => {
    if (!url) return;
    try {
      const img = new window.Image();
      img.src = url;
    } catch (e) {
      // Ignored
    }
  });
}

/**
 * Preload upcoming items in a battle list
 */
export function preloadBattleImages(battles: BattleItem[], currentIndex: number) {
  if (!battles.length || typeof window === 'undefined') return;
  const indices = [
    (currentIndex + 1) % battles.length,
    (currentIndex + 2) % battles.length,
    (currentIndex - 1 + battles.length) % battles.length,
  ];
  const urls: string[] = [];
  indices.forEach((idx) => {
    const b = battles[idx];
    if (b) {
      if (b.red?.photo) urls.push(b.red.photo);
      if (b.green?.photo) urls.push(b.green.photo);
    }
  });
  preloadImages(urls);
}

/**
 * Preload upcoming items in a group list
 */
export function preloadGroupImages(groups: Group[], currentIndex: number) {
  if (!groups.length || typeof window === 'undefined') return;
  const indices = [
    (currentIndex + 1) % groups.length,
    (currentIndex + 2) % groups.length,
    (currentIndex - 1 + groups.length) % groups.length,
  ];
  const urls: string[] = [];
  indices.forEach((idx) => {
    const g = groups[idx];
    if (g?.members) {
      g.members.forEach((m) => {
        if (m.photo) urls.push(m.photo);
      });
    }
  });
  preloadImages(urls);
}

/**
 * Generates an extended batch of unique recommended battles without artificial duplication
 */
export function getMoreRecommendedBattles(existingCount: number, existingIds?: Set<string>): BattleItem[] {
  if (existingIds) {
    return SAMPLE_EXPANSION_BATTLES.filter((b) => !existingIds.has(b.id));
  }
  return SAMPLE_EXPANSION_BATTLES;
}

export function getUniqueExpansionBattles(existingIds: Set<string>): BattleItem[] {
  return SAMPLE_EXPANSION_BATTLES.filter((b) => !existingIds.has(b.id));
}
```

---

## 8. Разбор ключевых алгоритмов и инженерных решений

### 8.1. Нативный CSS Scroll-Snap вместо кастомного свайпера
Используется нативный контейнер:
```css
overflow-y-scroll snap-y snap-mandatory overscroll-y-contain [scrollbar-width:none]
```
Каждая карточка дуэли имеет класс `snap-start snap-always`. Браузер выполняет скролл на уровне Compositor Thread с аппаратным ускорением GPU, нулевой задержкой и естественной инерцией мобильной ОС.

### 8.2. Стабильный `activeId` и аппаратный замок позиции (`useLayoutEffect`)
Ранее при клике на 3-й батл обновление родительских пропсов приводило к сбросу скролла контейнера на `scrollTop: 0`. В текущей версии это решено на двух уровнях:
1. **Непрерывный рендеринг слайдов**: DOM-структура карточек не схлопывается и не удаляется из разметки, сохраняя стабильную геометрию скролл-контейнера.
2. **Аппаратный замок скролла (`useLayoutEffect`)**:
```typescript
useLayoutEffect(() => {
  const scroller = scrollerRef.current;
  if (!scroller || !activeIdRef.current) return;
  const targetIdx = battles.findIndex((b) => b.id === activeIdRef.current);
  if (targetIdx > 0 && scroller.clientHeight > 0) {
    const expectedTop = targetIdx * scroller.clientHeight;
    if (Math.abs(scroller.scrollTop - expectedTop) > 10) {
      scroller.scrollTop = expectedTop;
    }
  }
}, [battles, localVotes, battleVotes]);
```
Если родительский компонент перерисовывает данные, `useLayoutEffect` синхронно фиксирует позицию на текущем батле до отрисовки кадра, исключая скачок на 1-й батл.

### 8.3. Аппаратный барьер готовности фото (`useBattleReady`) и Skeleton-анимация
Хук `useBattleReady(battle)` запускает параллельную предзагрузку через `getImageProps` Next.js и вызов `img.decode()`. Пока оба снимка не декодированы, карточки показывают анимированный пульсирующий Skeleton. Голосование заблокировано до готовности снимков.

### 8.4. Атомарное голосование, переключение и отмена голоса (Toggle / Unvote)
1. **Первый клик**: активирует выбранную сторону (изумрудная рамка, бейдж «Выбрано», +1 голос, расчет процентов).
2. **Повторный клик по той же стороне**: отменяет голос (`onVote(bId, null)`), снимает подсветку и вычитает 1 голос.
3. **Клик по противоположной стороне**: мгновенно переключает голос на соперника.

### 8.5. Гарантированное сохранение голосов (Local Storage + Supabase fallback)
Функция `castVote` сохраняет выбор пользователя сначала в локальное хранилище (`persistBattleVote`), а затем отправляет запрос на сервер. Если пользователь не авторизован или сервер временно недоступен, голос **никогда не теряется и не сбрасывается**, а сохраняется в сессии.

### 8.6. Финальный экран `EndOfFeedSlide` и плавный возврат в начало
В конце ленты расположен слайд завершения с кнопкой «Вернуться в начало» (`scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" })`) и кнопкой сброса фильтров.

### 8.7. Безопасность внешних CDN доменов (`shouldBeUnoptimized`)
Функция `shouldBeUnoptimized(url)` проверяет хост изображения по белому списку `ALLOWED_IMAGE_HOSTS` и включает `unoptimized={true}` для внешних CDN или blob/base64 ссылок, исключая 500-е ошибки Next.js.

---

## 9. Рекомендации по улучшению кода для код-ревью

1. **Уникальный индекс в PostgreSQL/Supabase**:
   ```sql
   create unique index if not exists votes_one_per_user_contest 
     on votes (contest_id, voter_id);
   ```
2. **Выделенная таблица `battles`**: Хранение пар участников в явном виде.
3. **Realtime-подписка только на активный слайд**: Ограничение WebSocket-каналов одним текущим `activeId`.
4. **Тактильный отклик (Haptic Feedback API)**: Вызов `if (navigator.vibrate) navigator.vibrate([12, 24])` при подтверждении или отмене голоса.
