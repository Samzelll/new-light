"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  Swords,
  Maximize2,
  Check,
  Trophy,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BattleVoteView } from '@/components/contest/BattleVoteView';
import {
  BattleContest,
  BattleCompetitor,
  getBattle,
  castVote,
  getPersistedBattleVotes,
  cancelBattleVote,
} from '@/services/battleDataService';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { HAPTIC, haptic } from '@/perf/haptics';

export interface BattleDetailsViewProps {
  battleId: string;
  onBack?: () => void;
}

export function BattleDetailsView({ battleId, onBack }: BattleDetailsViewProps) {
  const router = useRouter();

  const [battle, setBattle] = useState<BattleContest | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showArenaView, setShowArenaView] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Direct Fullscreen Photo Viewer state (no intermediate page)
  const [fullscreenViewer, setFullscreenViewer] = useState<{
    competitor: BattleCompetitor;
    photoIndex: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2.5>(1);

  // Swipe gesture tracking for fullscreen viewer
  const touchStartXRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  }, []);

  // Load Battle data & persisted vote
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const data = await getBattle(battleId);
      if (mounted && data) {
        setBattle(data);
        const persisted = getPersistedBattleVotes();
        const savedVote = persisted[battleId];
        if (savedVote) {
          const matched = data.competitors.find((c) => c.id === savedVote);
          if (matched) {
            setSelectedCompetitorId(matched.id);
          }
        }
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [battleId]);

  const comp1 = battle?.competitors[0];
  const comp2 = battle?.competitors[1];

  // Tapping directly on a participant card votes or unvotes
  const handleVote = useCallback(
    async (competitorId: string) => {
      if (!battle) return;
      const targetComp = battle.competitors.find((c) => c.id === competitorId);
      if (!targetComp) return;

      const isCancelling = selectedCompetitorId === competitorId;
      haptic(isCancelling ? HAPTIC.unvote : HAPTIC.vote);

      if (isCancelling) {
        setSelectedCompetitorId(null);
        showToast('Голос отменен');
        cancelBattleVote(battle.id);
      } else {
        setSelectedCompetitorId(competitorId);
        showToast(`Вы выбрали: ${targetComp.name}`);
        await castVote(battle.id, competitorId);
      }

      // Refresh battle numbers
      const updated = await getBattle(battle.id);
      if (updated) setBattle(updated);
    },
    [battle, selectedCompetitorId, showToast]
  );

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/contest/${battleId}` : '';
    if (navigator.share) {
      navigator.share({
        title: battle?.title || 'Opinion Net Battle',
        text: `⚔️ Голосуй в баттле: ${comp1?.name} против ${comp2?.name}!`,
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована в буфер обмена!');
    }
  }, [battleId, battle?.title, comp1?.name, comp2?.name, showToast]);

  // Keyboard navigation for fullscreen photo viewer
  useEffect(() => {
    if (!fullscreenViewer) return;
    const allPhotos = fullscreenViewer.competitor.photos || [fullscreenViewer.competitor.photoUrl];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenViewer(null);
        setZoomLevel(1);
      } else if (e.key === 'ArrowLeft' && allPhotos.length > 1) {
        setFullscreenViewer((prev) =>
          prev
            ? {
                ...prev,
                photoIndex: prev.photoIndex > 0 ? prev.photoIndex - 1 : allPhotos.length - 1,
              }
            : null
        );
      } else if (e.key === 'ArrowRight' && allPhotos.length > 1) {
        setFullscreenViewer((prev) =>
          prev
            ? {
                ...prev,
                photoIndex: prev.photoIndex < allPhotos.length - 1 ? prev.photoIndex + 1 : 0,
              }
            : null
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenViewer]);

  if (showArenaView && battle) {
    return (
      <BattleVoteView
        initialContestId={battle.id}
        onBack={() => {
          setShowArenaView(false);
          getBattle(battle.id).then((b) => b && setBattle(b));
        }}
      />
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bg text-ink p-4 flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-muted">Загрузка баттла...</p>
      </main>
    );
  }

  if (!battle || !comp1 || !comp2) {
    return (
      <main className="min-h-screen bg-bg text-ink p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm text-muted">Баттл не найден или завершён.</p>
        <button
          onClick={onBack || (() => router.push('/?tab=battles'))}
          className="px-5 py-2.5 rounded-full bg-surface-2 hover:bg-line text-xs font-bold text-ink transition-colors"
        >
          Вернуться в ленту баттлов
        </button>
      </main>
    );
  }

  const isSelected1 = selectedCompetitorId === comp1.id;
  const isSelected2 = selectedCompetitorId === comp2.id;
  const hasVoted = Boolean(selectedCompetitorId);

  // Dynamic Percentage Split
  const comp1Percent = Math.round(comp1.percentage);
  const comp2Percent = 100 - comp1Percent;

  return (
    <main className="min-h-screen bg-bg text-ink selection:bg-accent/30 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-2 border border-accent/40 text-accent text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      <div className="w-full max-w-xl mx-auto px-2 sm:px-6 pt-3 space-y-3.5 sm:space-y-5">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/?tab=battles"
            onClick={(e) => {
              if (onBack) {
                e.preventDefault();
                onBack();
              }
            }}
            aria-label="Назад"
            className="w-10 h-10 rounded-full bg-surface text-ink border border-line flex items-center justify-center transition-colors hover:border-line-strong cursor-pointer"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Поделиться"
              className="w-10 h-10 rounded-full bg-surface text-ink border border-line flex items-center justify-center transition-colors active:scale-95 hover:border-line-strong"
            >
              <Share2 size={17} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSubscribed((prev) => !prev);
                showToast(!isSubscribed ? 'Вы подписались на обновления баттла' : 'Подписка отменена');
              }}
              aria-label="Подписаться"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                isSubscribed
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface border-line text-ink hover:border-line-strong'
              }`}
            >
              <Bookmark size={18} strokeWidth={2.4} className={isSubscribed ? 'fill-accent' : ''} />
            </button>
          </div>
        </div>

        {/* ── Minimal Battle Header ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-accent">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span>1v1 ДУЭЛЬ</span>
            <span className="text-faint">·</span>
            <span className="text-muted font-medium">{battle.category || 'Opinion Arena'}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight leading-snug">
            {battle.title}
          </h1>

          {battle.description && (
            <p className="text-xs text-muted leading-relaxed pt-0.5">
              {battle.description}
            </p>
          )}

          {/* Minimal Prize Strip */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-line text-ink text-xs font-medium">
            <Trophy size={13} className="text-accent shrink-0" />
            <span className="truncate">
              Призовой фонд: 100 000 ₽ <span className="text-faint mx-1.5">·</span> Спонсор: Alpha Creator Fund
            </span>
          </div>
        </div>

        {/* ── Minimalist 1v1 Cards: Left vs Right ── */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* ── Participant 1 (Left) ── */}
            <div
              onClick={() => handleVote(comp1.id)}
              className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 flex flex-col cursor-pointer select-none border ${
                isSelected1
                  ? 'bg-surface border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              {/* Photo Box: Separate from text and percentage slider */}
              <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-2 border border-line">
                <Image
                  src={comp1.photoUrl}
                  alt={comp1.name}
                  fill
                  unoptimized={shouldBeUnoptimized(comp1.photoUrl)}
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 45vw, 300px"
                  referrerPolicy="no-referrer"
                />

                {/* Selected Checkmark Badge (Clean icon only) */}
                {isSelected1 && (
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md animate-fade-in">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                {/* Enlarge Trigger (top-right): blinks twice on mount then settles at low opacity */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenViewer({ competitor: comp1, photoIndex: 0 });
                  }}
                  title="Открыть фото в полном размере"
                  aria-label="Открыть фото в полном размере"
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/65 text-white/90 flex items-center justify-center backdrop-blur-xs border border-white/15 shadow-sm transition-all duration-300 animate-expand-blink hover:!opacity-100 active:scale-90"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {comp1.photos && comp1.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-scrim text-[10px] font-bold text-ink border border-line pointer-events-none">
                    {comp1.photos.length} фото
                  </div>
                )}
              </div>

              {/* Under Photo: Name, Author & Percentage beside name */}
              <div className="pt-2 px-0.5 flex flex-col">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenViewer({ competitor: comp1, photoIndex: 0 });
                    }}
                    className="font-display text-xs sm:text-sm font-bold text-ink truncate text-left hover:text-accent transition-colors"
                  >
                    {comp1.name}
                  </button>

                  {/* Percentage number beside name without separate slider */}
                  {(hasVoted || battle.totalVotes > 0) && (
                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${
                        isSelected1 ? 'text-emerald-400' : 'text-muted'
                      }`}
                    >
                      {comp1Percent}%
                    </span>
                  )}
                </div>

                {comp1.author && (
                  <p className="text-[11px] text-muted truncate mt-0.5">{comp1.author}</p>
                )}
              </div>
            </div>

            {/* ── Participant 2 (Right) ── */}
            <div
              onClick={() => handleVote(comp2.id)}
              className={`group relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 flex flex-col cursor-pointer select-none border ${
                isSelected2
                  ? 'bg-surface border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                  : 'bg-surface border-line hover:border-line-strong'
              }`}
            >
              {/* Photo Box: Separate from text and percentage slider */}
              <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-surface-2 border border-line">
                <Image
                  src={comp2.photoUrl}
                  alt={comp2.name}
                  fill
                  unoptimized={shouldBeUnoptimized(comp2.photoUrl)}
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 45vw, 300px"
                  referrerPolicy="no-referrer"
                />

                {/* Selected Checkmark Badge (Clean icon only) */}
                {isSelected2 && (
                  <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md animate-fade-in">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}

                {/* Enlarge Trigger (top-right): blinks twice on mount then settles at low opacity */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenViewer({ competitor: comp2, photoIndex: 0 });
                  }}
                  title="Открыть фото в полном размере"
                  aria-label="Открыть фото в полном размере"
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/65 text-white/90 flex items-center justify-center backdrop-blur-xs border border-white/15 shadow-sm transition-all duration-300 animate-expand-blink hover:!opacity-100 active:scale-90"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {comp2.photos && comp2.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-scrim text-[10px] font-bold text-ink border border-line pointer-events-none">
                    {comp2.photos.length} фото
                  </div>
                )}
              </div>

              {/* Under Photo: Name, Author & Percentage beside name */}
              <div className="pt-2 px-0.5 flex flex-col">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullscreenViewer({ competitor: comp2, photoIndex: 0 });
                    }}
                    className="font-display text-xs sm:text-sm font-bold text-ink truncate text-left hover:text-accent transition-colors"
                  >
                    {comp2.name}
                  </button>

                  {/* Percentage number beside name without separate slider */}
                  {(hasVoted || battle.totalVotes > 0) && (
                    <span
                      className={`text-xs font-bold tabular-nums shrink-0 ${
                        isSelected2 ? 'text-emerald-400' : 'text-muted'
                      }`}
                    >
                      {comp2Percent}%
                    </span>
                  )}
                </div>

                {comp2.author && (
                  <p className="text-[11px] text-muted truncate mt-0.5">{comp2.author}</p>
                )}
              </div>
            </div>

          </div>

          {/* ── Single Consolidated Split Slider (Hidden on mobile) ── */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2.5 sm:h-3 bg-surface-2 rounded-full overflow-hidden border border-line hidden sm:flex">
              {/* Left competitor split */}
              <div
                className={`h-full transition-all duration-500 ${
                  isSelected1
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : isSelected2
                    ? 'bg-line-strong'
                    : 'bg-surface-2'
                }`}
                style={{ width: `${comp1Percent}%` }}
              />
              {/* Right competitor split */}
              <div
                className={`h-full transition-all duration-500 ${
                  isSelected2
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : isSelected1
                    ? 'bg-line-strong'
                    : 'bg-surface-2'
                }`}
                style={{ width: `${comp2Percent}%` }}
              />
            </div>

            {/* Total votes count under the single consolidated slider */}
            <div className="flex items-center justify-between text-[11px] text-muted font-medium px-1">
              <span className={isSelected1 ? 'text-emerald-400 font-bold' : 'text-muted'}>
                {comp1Percent}%
              </span>
              <span className="text-faint">
                Всего голосов: {battle.totalVotes}
              </span>
              <span className={isSelected2 ? 'text-emerald-400 font-bold' : 'text-muted'}>
                {comp2Percent}%
              </span>
            </div>
          </div>
        </div>

        {/* ── Battle Format Details Strip ── */}
        <div className="rounded-xl bg-surface border border-line p-3 grid grid-cols-3 divide-x divide-line text-center">
          <div className="px-2">
            <div className="text-xs sm:text-sm font-bold text-ink">Бесконечный</div>
            <div className="text-[10px] text-muted mt-0.5">формат баттла</div>
          </div>
          <div className="px-2">
            <div className="text-xs sm:text-sm font-bold text-ink">1v1 Дуэль</div>
            <div className="text-[10px] text-muted mt-0.5">прямой выбор</div>
          </div>
          <div className="px-2">
            <div className="text-xs sm:text-sm font-bold text-accent">Вес голоса</div>
            <div className="text-[10px] text-muted mt-0.5">защита от накруток</div>
          </div>
        </div>

        {/* ── Rules Summary ── */}
        <div className="space-y-1.5 py-1 px-1 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Check size={14} className="text-accent shrink-0" strokeWidth={2.6} />
            <span>Тапните по участнику для мгновенного выбора или отмены</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-accent shrink-0" strokeWidth={2.6} />
            <span>Один голос на дуэль — вы можете изменить выбор в любой момент</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={14} className="text-accent shrink-0" strokeWidth={2.6} />
            <span>В арене баттлов работает плавный полноэкранный свайп</span>
          </div>
        </div>

        {/* ── Primary Action: Enter Battle Arena ── */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowArenaView(true)}
            className="w-full h-12 rounded-full bg-accent-solid hover:bg-accent-hover active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Swords size={17} strokeWidth={2.4} />
            <span>Войти в Арену баттла (Полноэкранный режим)</span>
          </button>
        </div>
      </div>

      {/* ── DIRECT FULLSCREEN PHOTO VIEWER (Pure Photos, Swipable, No intermediate page) ── */}
      {fullscreenViewer && (() => {
        const comp = fullscreenViewer.competitor;
        const photos = comp.photos && comp.photos.length > 0 ? comp.photos : [comp.photoUrl];
        const activeIdx = fullscreenViewer.photoIndex;
        const currentPhoto = photos[activeIdx] || comp.photoUrl;
        const hasMultiple = photos.length > 1;

        const nextPhoto = () => {
          if (activeIdx < photos.length - 1) {
            setFullscreenViewer({ competitor: comp, photoIndex: activeIdx + 1 });
          } else {
            setFullscreenViewer({ competitor: comp, photoIndex: 0 });
          }
        };

        const prevPhoto = () => {
          if (activeIdx > 0) {
            setFullscreenViewer({ competitor: comp, photoIndex: activeIdx - 1 });
          } else {
            setFullscreenViewer({ competitor: comp, photoIndex: photos.length - 1 });
          }
        };

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Просмотр фото: ${comp.name}`}
            className="fixed inset-0 z-60 bg-scrim/95 backdrop-blur-xl flex flex-col justify-between animate-fade-in select-none text-ink overflow-hidden"
          >
            {/* Top Bar */}
            <div className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
              <div className="min-w-0 pr-2">
                <p className="text-xs sm:text-sm font-bold text-ink truncate font-display">
                  {comp.name}
                </p>
                {comp.author && <p className="text-[11px] text-muted truncate">{comp.author}</p>}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1))}
                  className="px-2.5 py-1 rounded-full bg-surface-2 hover:bg-surface text-xs font-semibold text-ink flex items-center gap-1 transition-colors border border-line"
                  title="Масштаб"
                >
                  {zoomLevel === 1 ? <ZoomIn size={13} /> : <ZoomOut size={13} />}
                  <span>{zoomLevel}x</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFullscreenViewer(null);
                    setZoomLevel(1);
                  }}
                  aria-label="Закрыть"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-90 border border-white/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Photo Stage (Swipeable) */}
            <div
              className="flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 relative"
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartXRef.current === null) return;
                const diff = touchStartXRef.current - e.changedTouches[0].clientX;
                touchStartXRef.current = null;
                if (diff > 45 && hasMultiple) nextPhoto();
                else if (diff < -45 && hasMultiple) prevPhoto();
              }}
              onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2.5 : 1))}
            >
              {/* Desktop Left / Right Navigation */}
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPhoto();
                    }}
                    aria-label="Предыдущее фото"
                    className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-transform active:scale-95"
                  >
                    <ChevronLeft size={22} strokeWidth={2.6} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                    aria-label="Следующее фото"
                    className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-transform active:scale-95"
                  >
                    <ChevronRight size={22} strokeWidth={2.6} />
                  </button>
                </>
              )}

              <div
                className="relative w-full h-full max-w-5xl max-h-[82vh] transition-transform duration-200 flex items-center justify-center"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <Image
                  key={currentPhoto}
                  src={currentPhoto}
                  alt={comp.name}
                  fill
                  priority
                  unoptimized={shouldBeUnoptimized(currentPhoto)}
                  sizes="100vw"
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Bottom Photo Count */}
            {hasMultiple && (
              <div className="relative z-30 pb-4 pt-2 flex items-center justify-center bg-gradient-to-t from-black/80 to-transparent">
                <div className="px-3.5 py-1 rounded-full bg-black/70 border border-white/20 backdrop-blur-md text-xs font-bold tabular-nums text-white/90">
                  {activeIdx + 1} из {photos.length}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </main>
  );
}

export default BattleDetailsView;
