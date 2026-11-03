"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MoreHorizontal,
  Swords,
  Maximize2,
  Check,
  Trophy,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import { BattleParticipantModal } from '@/components/battle/BattleParticipantModal';
import { BattleVoteView } from '@/components/contest/BattleVoteView';
import {
  BattleContest,
  BattleCompetitor,
  getBattle,
  castVote,
  getPersistedBattleVotes,
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
  const [userVote, setUserVote] = useState<'red' | 'blue' | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showArenaView, setShowArenaView] = useState(false);
  const [inspectModalData, setInspectModalData] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Load Battle data
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const data = await getBattle(battleId);
      if (mounted && data) {
        setBattle(data);
        // Check persisted local vote
        const persisted = getPersistedBattleVotes();
        const savedVote = persisted[battleId];
        if (savedVote) {
          const matched = data.competitors.find((c) => c.id === savedVote);
          if (matched) setUserVote(matched.corner);
        }
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [battleId]);

  const redComp = battle?.competitors.find((c) => c.corner === 'red') || battle?.competitors[0];
  const blueComp = battle?.competitors.find((c) => c.corner === 'blue') || battle?.competitors[1];

  const handleVote = useCallback(
    async (corner: 'red' | 'blue') => {
      if (!battle) return;
      const targetComp = corner === 'red' ? redComp : blueComp;
      if (!targetComp) return;

      const isCancelling = userVote === corner;
      haptic(isCancelling ? HAPTIC.unvote : HAPTIC.vote);

      if (isCancelling) {
        setUserVote(null);
        showToast('Голос отменен');
        try {
          const { cancelBattleVote } = await import('@/services/battleDataService');
          cancelBattleVote(battle.id);
        } catch {}
      } else {
        setUserVote(corner);
        showToast(`Голос отдан за ${targetComp.name}!`);
        await castVote(battle.id, targetComp.id);
      }

      // Refresh battle state
      const updated = await getBattle(battle.id);
      if (updated) setBattle(updated);
    },
    [battle, redComp, blueComp, userVote, showToast]
  );

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/contest/${battleId}` : '';
    if (navigator.share) {
      navigator.share({
        title: battle?.title || 'Opinion Net Battle',
        text: `⚔️ Голосуй в баттле: ${redComp?.name} против ${blueComp?.name}!`,
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована в буфер обмена!');
    }
  }, [battleId, battle?.title, redComp?.name, blueComp?.name, showToast]);

  if (showArenaView && battle) {
    return (
      <BattleVoteView
        initialContestId={battle.id}
        onBack={() => {
          setShowArenaView(false);
          // Refresh state
          getBattle(battle.id).then((b) => b && setBattle(b));
        }}
      />
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-bg text-ink p-4 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-muted">Загрузка баттла...</p>
      </main>
    );
  }

  if (!battle || !redComp || !blueComp) {
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

  const redPercent = Math.round(redComp.percentage);
  const bluePercent = Math.round(blueComp.percentage);

  return (
    <main className="min-h-screen bg-bg text-ink selection:bg-accent/30 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-surface-2 border border-accent/50 text-accent text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-4 space-y-5">
        
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack || (() => router.push('/?tab=battles'))}
            aria-label="Назад"
            className="w-10 h-10 rounded-full bg-scrim text-ink border border-line flex items-center justify-center transition-colors hover:border-line-strong"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Поделиться"
              className="w-10 h-10 rounded-full bg-scrim text-ink border border-line flex items-center justify-center transition-colors active:scale-95 hover:border-line-strong"
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
                  : 'bg-scrim border-line text-ink hover:border-line-strong'
              }`}
            >
              <Bookmark size={18} strokeWidth={2.4} className={isSubscribed ? 'fill-accent' : ''} />
            </button>
          </div>
        </div>

        {/* ── Battle Header Banner ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-accent">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
            <span>1v1 ДУЭЛЬ · БЕСКОНЕЧНЫЙ БАТТЛ</span>
            <span className="text-line-strong">·</span>
            <span className="text-muted font-semibold">{battle.category || 'Opinion Arena'}</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight leading-tight">
            {battle.title}
          </h1>

          {battle.description && (
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {battle.description}
            </p>
          )}

          {/* Sponsor Bounty Strip */}
          <div className="flex items-center gap-2 px-3.5 py-2 mt-2 rounded-xl bg-surface border border-line text-ink text-xs font-semibold shadow-sm">
            <Trophy size={14} className="text-accent shrink-0" />
            <div className="truncate">
              <span>Призовой фонд: 100 000 ₽</span>
              <span className="mx-2 text-faint">·</span>
              <span className="text-muted font-normal">Спонсор: Alpha Creator Fund</span>
            </div>
          </div>
        </div>

        {/* ── 1v1 Split Arena Cards ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted font-bold px-1">
            <span className="flex items-center gap-1.5 text-accent">
              <Swords size={13} />
              <span>Сторона A vs Сторона B</span>
            </span>
            <span className="tabular-nums">
              {battle.totalVotes > 0 ? `Всего голосов: ${battle.totalVotes}` : 'Прямой эфир'}
            </span>
          </div>

          {/* Duel Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* 🔴 SIDE A CARD */}
            <div
              onClick={() => handleVote('red')}
              className={`relative rounded-xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none ${
                userVote === 'red'
                  ? 'bg-surface border-side-a ring-2 ring-side-a/40 shadow-[0_0_30px_rgba(196,165,116,0.25)]'
                  : 'bg-surface border-side-a/60 hover:border-side-a'
              }`}
            >
              {/* Photo Box: Instagram 4:5 standard crop */}
              <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-surface-2 mb-3 border border-line">
                <Image
                  src={redComp.photoUrl}
                  alt={redComp.name}
                  fill
                  unoptimized={shouldBeUnoptimized(redComp.photoUrl)}
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 45vw, 300px"
                  referrerPolicy="no-referrer"
                />

                {/* Inspect Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectModalData({
                      photoUrl: redComp.photoUrl,
                      photos: redComp.photos || [redComp.photoUrl],
                      title: redComp.name,
                      author: redComp.author,
                      authorAvatar: redComp.authorAvatar,
                      authorBio: redComp.authorBio || (battle.description ? `Участник дуэли «${battle.title}».` : undefined),
                      category: battle.category,
                      corner: 'red',
                      opponentName: blueComp.name,
                      opponentCorner: 'blue',
                      percentage: redPercent,
                      opponentPercentage: bluePercent,
                      sponsorName: 'Alpha Creator Fund',
                      prizePool: '100 000 ₽',
                      isSelected: userVote === 'red',
                      onVote: () => handleVote('red'),
                    });
                  }}
                  title="Подробности и фото участника"
                  aria-label="Подробности и фото участника"
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-scrim text-ink flex items-center justify-center backdrop-blur-xs border border-line transition-transform active:scale-90 hover:border-line-strong"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {redComp.photos && redComp.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-scrim text-[10px] font-bold text-ink border border-line pointer-events-none">
                    {redComp.photos.length} фото
                  </div>
                )}
              </div>

              {/* Title & Creator */}
              <div className="space-y-1 mb-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-side-a">
                  Сторона A
                </div>
                <h3 className="font-display text-xs sm:text-sm font-bold text-ink truncate">{redComp.name}</h3>
                {redComp.author && (
                  <p className="text-[11px] text-muted truncate">{redComp.author}</p>
                )}
              </div>

              {/* Vote Split & Button */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-side-a tabular-nums">{redPercent}%</span>
                  {userVote === 'red' && (
                    <span className="text-[10px] font-extrabold text-side-a flex items-center gap-0.5">
                      <Check size={11} strokeWidth={3} /> Ваш выбор
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden border border-line">
                  <div
                    className="h-full bg-side-a rounded-full transition-all duration-500"
                    style={{ width: `${redPercent}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote('red');
                  }}
                  className={`w-full py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    userVote === 'red'
                      ? 'bg-surface-2 text-danger border border-danger/40'
                      : 'bg-side-a text-on-accent hover:opacity-90 shadow-sm'
                  }`}
                >
                  {userVote === 'red' ? 'Отменить голос' : 'Голосовать'}
                </button>
              </div>
            </div>

            {/* 🔵 SIDE B CARD */}
            <div
              onClick={() => handleVote('blue')}
              className={`relative rounded-xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none ${
                userVote === 'blue'
                  ? 'bg-surface border-side-b ring-2 ring-side-b/40 shadow-[0_0_30px_rgba(138,160,196,0.25)]'
                  : 'bg-surface border-side-b/60 hover:border-side-b'
              }`}
            >
              {/* Photo Box: Instagram 4:5 standard crop */}
              <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-surface-2 mb-3 border border-line">
                <Image
                  src={blueComp.photoUrl}
                  alt={blueComp.name}
                  fill
                  unoptimized={shouldBeUnoptimized(blueComp.photoUrl)}
                  className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
                  sizes="(max-width: 640px) 45vw, 300px"
                  referrerPolicy="no-referrer"
                />

                {/* Inspect Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectModalData({
                      photoUrl: blueComp.photoUrl,
                      photos: blueComp.photos || [blueComp.photoUrl],
                      title: blueComp.name,
                      author: blueComp.author,
                      authorAvatar: blueComp.authorAvatar,
                      authorBio: blueComp.authorBio || (battle.description ? `Участник дуэли «${battle.title}».` : undefined),
                      category: battle.category,
                      corner: 'blue',
                      opponentName: redComp.name,
                      opponentCorner: 'red',
                      percentage: bluePercent,
                      opponentPercentage: redPercent,
                      sponsorName: 'Alpha Creator Fund',
                      prizePool: '100 000 ₽',
                      isSelected: userVote === 'blue',
                      onVote: () => handleVote('blue'),
                    });
                  }}
                  title="Подробности и фото участника"
                  aria-label="Подробности и фото участника"
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-scrim text-ink flex items-center justify-center backdrop-blur-xs border border-line transition-transform active:scale-90 hover:border-line-strong"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {blueComp.photos && blueComp.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-scrim text-[10px] font-bold text-ink border border-line pointer-events-none">
                    {blueComp.photos.length} фото
                  </div>
                )}
              </div>

              {/* Title & Creator */}
              <div className="space-y-1 mb-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-side-b">
                  Сторона B
                </div>
                <h3 className="font-display text-xs sm:text-sm font-bold text-ink truncate">{blueComp.name}</h3>
                {blueComp.author && (
                  <p className="text-[11px] text-muted truncate">{blueComp.author}</p>
                )}
              </div>

              {/* Vote Split & Button */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-side-b tabular-nums">{bluePercent}%</span>
                  {userVote === 'blue' && (
                    <span className="text-[10px] font-extrabold text-side-b flex items-center gap-0.5">
                      <Check size={11} strokeWidth={3} /> Ваш выбор
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden border border-line">
                  <div
                    className="h-full bg-side-b rounded-full transition-all duration-500"
                    style={{ width: `${bluePercent}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote('blue');
                  }}
                  className={`w-full py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    userVote === 'blue'
                      ? 'bg-surface-2 text-danger border border-danger/40'
                      : 'bg-side-b text-on-side-b hover:opacity-90 shadow-sm'
                  }`}
                >
                  {userVote === 'blue' ? 'Отменить голос' : 'Голосовать'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Battle Format & Mechanics Strip ── */}
        <div className="rounded-xl bg-surface border border-line p-3.5 grid grid-cols-3 divide-x divide-line text-center">
          <div className="px-2">
            <div className="text-sm sm:text-base font-bold text-ink">Бесконечный</div>
            <div className="text-[11px] text-muted mt-0.5">формат баттла</div>
          </div>
          <div className="px-2">
            <div className="text-sm sm:text-base font-bold text-ink">1v1 Дуэль</div>
            <div className="text-[11px] text-muted mt-0.5">прямой выбор</div>
          </div>
          <div className="px-2">
            <div className="text-sm sm:text-base font-bold text-accent">Вес голоса</div>
            <div className="text-[11px] text-muted mt-0.5">защита от накруток</div>
          </div>
        </div>

        {/* ── Rules Checklist for Battles ── */}
        <div className="space-y-2 py-1 px-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Check size={15} className="text-accent shrink-0" strokeWidth={2.8} />
            <span>Голосование 1 на 1 без ограничения по времени раунда</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Check size={15} className="text-accent shrink-0" strokeWidth={2.8} />
            <span>Один голос на дуэль — вы можете изменить выбор в любой момент</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Check size={15} className="text-accent shrink-0" strokeWidth={2.8} />
            <span>В арене баттлов работает плавный свайп и переход к следующей паре</span>
          </div>
        </div>

        {/* ── Primary Action: Enter Battle Arena ── */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArenaView(true)}
            className="w-full h-[52px] rounded-full bg-accent-solid hover:bg-accent-hover active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Swords size={18} strokeWidth={2.4} />
            <span>Войти в Арену баттла (Полноэкранный режим)</span>
          </button>
        </div>

      </div>

      {/* ── Battle Participant Details Modal (with Swipe Carousel) ── */}
      {inspectModalData && (
        <BattleParticipantModal
          isOpen={Boolean(inspectModalData)}
          onClose={() => setInspectModalData(null)}
          {...inspectModalData}
        />
      )}
    </main>
  );
}
export default BattleDetailsView;
