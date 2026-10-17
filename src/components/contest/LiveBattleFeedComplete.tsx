"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LIVE BATTLE FEED — COMPLETE STANDALONE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Полный автономный файл ленты 1v1 Лайв-Батлов в стиле TikTok / Reels.
 * Содержит в себе:
 *  1. Все TypeScript интерфейсы данных и состояний
 *  2. Движок жестов: Touch Swipe (мобильные), Mouse Wheel (десктоп с дебаунсом),
 *     Framer Motion Drag (перетаскивание мышью), Keyboard (стрелки Вверх/Вниз)
 *  3. Механику голосования в 1 клик с оптимистичным пересчетом процентов
 *  4. Экраны деталей: Встроенный PhotoLightbox (зум/оригинал) и DescriptionSheet (правила/описание)
 *  5. Механизм предзагрузки изображений и бесконечной подгрузки новых пар
 * 
 * Этот файл можно использовать как эталон, вносить в него любые изменения
 * логики просмотра/голосования и возвращать обратно для интеграции.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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
  red: CompetitorDetails;    // Верхний угол (Challenger 1)
  green: CompetitorDetails;  // Нижний угол (Challenger 2)
}

export interface LiveBattleFeedProps {
  /** Список батл-пар для показа в ленте */
  battles: BattleItem[];
  /** Хэш-таблица конкурсов для быстрого доступа к описанию и правилам */
  contestsMap?: Record<string, any>;
  /** Уже отданные голоса пользователя: battleId -> 'red' | 'green' */
  battleVotes?: Record<string, 'red' | 'green'>;
  /** Callback при голосовании за одного из участников */
  onVote?: (battleId: string, corner: 'red' | 'green') => void;
  /** Callback сброса фильтров, если список пуст */
  onResetFilters?: () => void;
  /** Callback подгрузки следующей порции батлов (инфинит-скролл) */
  onLoadMore?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMBEDDED LIGHTBOX MODAL (PHOTO & CREATOR DETAILS)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none">
      <div
        className="fixed inset-0 bg-transparent"
        onClick={() => {
          if (isFullscreenModal) setIsFullscreenModal(false);
          else onClose();
        }}
      />

      <div className="relative z-10 w-full max-w-4xl max-h-[94vh] bg-[#141417] border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-800/80 bg-[#18181c]">
          <div className="flex items-center gap-2 min-w-0">
            {authorAvatar && (
              <div className="relative w-7 h-7 rounded-full overflow-hidden border border-white/20 shrink-0">
                <Image src={authorAvatar} alt={author || ''} fill className="object-cover" referrerPolicy="no-referrer" />
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
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Тело модалки */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
          {/* Фото: Естественная посадка с мягким амбиентным свечением */}
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
                className="object-contain group-hover:scale-[1.01] transition-transform duration-300"
                referrerPolicy="no-referrer"
                sizes="(max-width: 768px) 100vw, 60vw"
              />
            </div>
          </div>

          {/* Боковая панель: Автор, спонсоры, голос */}
          <div className="w-full md:w-80 p-5 bg-[#141417] border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {category && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 font-bold text-[11px] uppercase tracking-wider">
                  {category}
                </span>
              )}

              <div>
                <h4 className="text-sm font-black text-white">{title}</h4>
                {author && <p className="text-xs text-neutral-400 mt-0.5">Автор: {author}</p>}
                {authorBio && <p className="text-xs text-neutral-300 mt-2 leading-relaxed">{authorBio}</p>}
              </div>

              {sponsorName && (
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Спонсор</span>
                  <p className="text-xs font-bold text-white mt-0.5">{sponsorName}</p>
                  {prizePool && <p className="text-[11px] text-emerald-400 font-semibold mt-1">Приз: {prizePool}</p>}
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
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                    : 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white shadow-[#ff6a2b]/30'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check size={16} strokeWidth={3} />
                    <span>Вы выбрали эту работу</span>
                  </>
                ) : (
                  <>
                    <span>Проголосовать за эту работу</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр оригинала с зумом */}
      {isFullscreenModal && (
        <div
          onClick={() => setIsFullscreenModal(false)}
          className="fixed inset-0 z-60 bg-black flex flex-col animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between px-4 py-3 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 z-10"
          >
            <span className="text-xs font-semibold text-neutral-300">
              Оригинал ({title})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.5 : prev === 1.5 ? 2.5 : 1))}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
              >
                {zoomLevel === 1 ? <ZoomIn size={13} /> : <ZoomOut size={13} />}
                <span>{zoomLevel}x</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreenModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 w-full h-full flex items-center justify-center overflow-auto p-2"
            onClick={() => setIsFullscreenModal(false)}
          >
            <div
              className="relative w-full h-full max-w-7xl max-h-screen transition-transform duration-200 flex items-center justify-center cursor-zoom-out select-none"
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
// 3. EMBEDDED CONTEST DESCRIPTION SHEET
// ─────────────────────────────────────────────────────────────────────────────

interface EmbeddedDescriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contest: any;
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

  if (!isOpen || !contest) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in select-none">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md mx-auto bg-[#161619] border-t border-neutral-800 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto -mt-1 mb-2" />

        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[#ff6a2b] uppercase tracking-wider block mb-1">
              {stageInfo || '1v1 Battle Duel'}
            </span>
            <h2 className="text-base font-black text-white uppercase tracking-tight truncate">
              {contest.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Описание</h3>
          <p className="text-sm text-neutral-200 leading-relaxed bg-[#121215] p-3 rounded-2xl border border-neutral-800/60">
            {contest.description}
          </p>
        </div>

        {contest.prize && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#121215] border border-neutral-800/60 text-xs font-semibold text-emerald-400">
            <Award size={14} />
            <span>Призовой фонд: {contest.prize}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MAIN LIVE BATTLE FEED COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function LiveBattleFeedComplete({
  battles,
  contestsMap = {},
  battleVotes = {},
  onVote,
  onResetFilters,
  onLoadMore,
}: LiveBattleFeedProps) {
  // Текущая батл-пара в ленте
  const [currentIndex, setCurrentIndex] = useState(0);
  // Направление анимации перехода (1 = вниз / следующий, -1 = вверх / предыдущий)
  const [direction, setDirection] = useState<1 | -1>(1);

  // Локальные оверрайды процентов для мгновенного отклика при клике
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { redPercent: number; greenPercent: number }>
  >({});

  // Модальные окна
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<EmbeddedLightboxProps | null>(null);

  // Ссылки для предотвращения спама и троттлинга жестов
  const containerRef = useRef<HTMLDivElement>(null);
  const isTransitioningRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  // 4.1. Контроль границ индекса при обновлении списка батлов
  useEffect(() => {
    if (currentIndex >= battles.length && battles.length > 0) {
      setCurrentIndex(0);
    }
  }, [battles.length, currentIndex]);

  // 4.2. Порог автоматической догрузки батлов (за 2 карточки до конца)
  useEffect(() => {
    if (battles.length > 0 && currentIndex >= battles.length - 2) {
      if (onLoadMore) onLoadMore();
    }
  }, [currentIndex, battles.length, onLoadMore]);

  // 4.3. Переключение на следующий батл
  const goToNext = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [battles.length]);

  // 4.4. Переключение на предыдущий батл
  const goToPrev = useCallback(() => {
    if (battles.length <= 1 || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + battles.length) % battles.length);
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 280);
  }, [battles.length]);

  // 4.5. Touch-жесты свайпа для мобильных телефонов (deltaY > 40px)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    touchStartY.current = null;

    if (deltaY > 40) {
      goToNext(); // Свайп снизу вверх -> Следующий батл
    } else if (deltaY < -40) {
      goToPrev(); // Свайп сверху вниз -> Предыдущий батл
    }
  };

  // 4.6. Клавиатурная навигация (Стрелки Вверх / Вниз)
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

  // 4.7. Колесико мыши (Mouse Wheel с дебаунсом 60мс для TikTok-ощущения на ПК)
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

  // 4.8. Драг мышью на десктопе через Framer Motion PanInfo
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetThreshold = 35;
    const velocityThreshold = 140;

    if (info.offset.y < -offsetThreshold || info.velocity.y < -velocityThreshold) {
      goToNext();
    } else if (info.offset.y > offsetThreshold || info.velocity.y > velocityThreshold) {
      goToPrev();
    }
  };

  // 4.9. Обработка голоса с мгновенным локальным откликом
  const handleInternalVote = (battleId: string, corner: 'red' | 'green') => {
    if (onVote) {
      onVote(battleId, corner);
    }

    // Мгновенно сдвигаем проценты для наглядности
    const targetBattle = battles.find((b) => b.id === battleId);
    if (!targetBattle) return;

    const currentRed = localOverrides[battleId]?.redPercent ?? targetBattle.red.percent;
    let newRed = currentRed;
    if (corner === 'red') {
      newRed = Math.min(99, currentRed + 2);
    } else {
      newRed = Math.max(1, currentRed - 2);
    }

    setLocalOverrides((prev) => ({
      ...prev,
      [battleId]: {
        redPercent: newRed,
        greenPercent: 100 - newRed,
      },
    }));
  };

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

  const currentBattle = battles[currentIndex];
  const currentContest = currentBattle.contestId
    ? contestsMap[currentBattle.contestId]
    : null;
  const userVote = battleVotes[currentBattle.id] || null;

  // Динамические проценты (с учетом локального сдвига)
  const redPercent =
    localOverrides[currentBattle.id]?.redPercent ?? currentBattle.red.percent;
  const greenPercent =
    localOverrides[currentBattle.id]?.greenPercent ?? currentBattle.green.percent;

  const targetContestId = currentBattle.contestId || currentBattle.id;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col relative select-none px-1 pt-0 pb-16 lg:pb-0 overflow-hidden h-full w-full min-h-0"
    >
      {/* ── ВЕРХНЯЯ ШАПКА: Заголовок конкурса с кликом для перехода в детали ── */}
      <header className="flex items-center justify-center px-3 py-1.5 shrink-0 z-20 bg-transparent border-none w-full">
        <Link
          href={`/contest/${targetContestId}`}
          className="group inline-flex items-center justify-center gap-1.5 max-w-[92%] text-center cursor-pointer transition-all active:scale-95"
          title="Открыть детали и правила конкурса"
        >
          <span className="text-sm sm:text-base font-black tracking-wide text-white group-hover:text-[#ff6a2b] transition-colors truncate drop-shadow-md">
            {currentBattle.title}
          </span>
          <ChevronRight
            size={16}
            className="text-neutral-500 group-hover:text-[#ff6a2b] group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
          />
        </Link>
      </header>

      {/* ── АРЕНА 50 / 50: Вертикальное разделение на 2 карточки с плавной анимацией ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0 w-full h-full pb-0.5">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentBattle.id}
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
            className="flex-1 flex flex-col h-full min-h-0 relative bg-transparent border-none shadow-none cursor-grab active:cursor-grabbing gap-1.5"
          >
            {/* ══════════════════════════════════════════════════════════ */}
            {/* 1. ВЕРХНЯЯ КАРТОЧКА (RED CORNER) — 50% Высоты             */}
            {/* ══════════════════════════════════════════════════════════ */}
            <div
              onClick={() => handleInternalVote(currentBattle.id, 'red')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
                userVote === 'red'
                  ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : userVote
                  ? 'opacity-70 brightness-[0.7]'
                  : 'hover:brightness-105 active:scale-[0.98]'
              }`}
            >
              {/* Фото участника */}
              <Image
                src={currentBattle.red.photo}
                alt={currentBattle.red.name}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className={`object-cover object-center transition-transform duration-500 ${
                  userVote === 'red' ? '' : 'group-hover:scale-105'
                }`}
                priority
                referrerPolicy="no-referrer"
              />

              {/* Затемнение */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

              {/* Верхняя плашка карточки: Бейдж выбора + Кнопка зума */}
              <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
                <div>
                  {userVote === 'red' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in">
                      <Check size={12} strokeWidth={3} />
                      <span>Выбрано</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                      sponsorName: currentBattle.red.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.red.sponsorTier,
                      prizePool: currentBattle.red.prizePool,
                      socialLinks: currentBattle.red.socialLinks,
                      isSelected: userVote === 'red',
                      onVote: () => handleInternalVote(currentBattle.id, 'red'),
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

              {/* Процент голосов (отображается после голосования) */}
              {userVote && (
                <div className="absolute bottom-2.5 right-3 z-10">
                  <div
                    className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                      userVote === 'red'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                        : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                    }`}
                  >
                    {redPercent}%
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
              onClick={() => handleInternalVote(currentBattle.id, 'green')}
              className={`group relative flex-1 h-1/2 min-h-0 w-full overflow-hidden cursor-pointer transition-all duration-300 origin-center rounded-2xl sm:rounded-3xl border border-neutral-800/80 bg-[#121215] ${
                userVote === 'green'
                  ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : userVote
                  ? 'opacity-70 brightness-[0.7]'
                  : 'hover:brightness-105 active:scale-[0.98]'
              }`}
            >
              {/* Фото участника */}
              <Image
                src={currentBattle.green.photo}
                alt={currentBattle.green.name}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className={`object-cover object-center transition-transform duration-500 ${
                  userVote === 'green' ? '' : 'group-hover:scale-105'
                }`}
                priority
                referrerPolicy="no-referrer"
              />

              {/* Затемнение */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />

              {/* Верхняя плашка карточки: Бейдж выбора + Кнопка зума */}
              <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between">
                <div>
                  {userVote === 'green' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-lg border border-emerald-400/40 animate-fade-in">
                      <Check size={12} strokeWidth={3} />
                      <span>Выбрано</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
                      sponsorName: currentBattle.green.sponsorName || currentBattle.sponsorName,
                      sponsorTier: currentBattle.green.sponsorTier,
                      prizePool: currentBattle.green.prizePool,
                      socialLinks: currentBattle.green.socialLinks,
                      isSelected: userVote === 'green',
                      onVote: () => handleInternalVote(currentBattle.id, 'green'),
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

              {/* Процент голосов (отображается после голосования) */}
              {userVote && (
                <div className="absolute bottom-2.5 right-3 z-10">
                  <div
                    className={`px-2.5 py-1 rounded-xl backdrop-blur-xs font-black text-xs sm:text-sm shadow-lg shrink-0 tabular-nums border ${
                      userVote === 'green'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                        : 'bg-black/80 text-neutral-300 border-neutral-700/60'
                    }`}
                  >
                    {greenPercent}%
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── КНОПКИ НАВИГАЦИИ (Только для экранов ноутбуков/десктопа) ── */}
      <footer className="mt-1 pt-0.5 hidden lg:flex items-center justify-end text-neutral-400 text-xs shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToPrev}
            disabled={currentIndex === 0}
            aria-label="Предыдущий батл"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 transition-colors active:scale-95"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Следующий батл"
            className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-neutral-300 transition-colors active:scale-95"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </footer>

      {/* ── МОДАЛЬНОЕ ОКНО ОПИСАНИЯ КОНКУРСА ── */}
      <EmbeddedDescriptionSheet
        isOpen={isDescriptionOpen}
        onClose={() => setIsDescriptionOpen(false)}
        contest={
          currentContest || {
            title: currentBattle.title,
            description: `Лайв 1v1 батл-дуэль между работами «${currentBattle.red.name}» и «${currentBattle.green.name}». Отдайте свой голос, чтобы определить победителя раунда!`,
            category: currentBattle.category,
          }
        }
        stageInfo="1v1 Battle Duel"
      />

      {/* ── ВСТРОЕННЫЙ ФОТО-ЛАЙТБОКС (ЗУМ И ОРИГИНАЛ) ── */}
      {lightboxData && <EmbeddedLightbox {...lightboxData} />}
    </div>
  );
}

export default LiveBattleFeedComplete;
