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
      <main className="min-h-screen bg-[#0b0b0d] text-white p-4 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#ff6a2b] border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-neutral-400">Загрузка баттла...</p>
      </main>
    );
  }

  if (!battle || !redComp || !blueComp) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-sm text-neutral-400">Баттл не найден или завершён.</p>
        <button
          onClick={onBack || (() => router.push('/?tab=battles'))}
          className="px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
        >
          Вернуться в ленту баттлов
        </button>
      </main>
    );
  }

  const redPercent = Math.round(redComp.percentage);
  const bluePercent = Math.round(blueComp.percentage);

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white font-['Onest',sans-serif] selection:bg-[#ff6a2b]/30 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#161619] border border-[#ff6a2b]/50 text-[#ff6a2b] text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
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
            className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              aria-label="Поделиться"
              className="w-10 h-10 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
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
                  ? 'bg-[#ff6a2b]/20 border-[#ff6a2b]/40 text-[#ff6a2b]'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-white'
              }`}
            >
              <Bookmark size={18} strokeWidth={2.4} className={isSubscribed ? 'fill-[#ff6a2b]' : ''} />
            </button>
          </div>
        </div>

        {/* ── Battle Header Banner ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#ff6a2b]">
            <span className="w-2 h-2 rounded-full bg-[#ff6a2b] animate-pulse shrink-0" />
            <span>1v1 ДУЭЛЬ · БЕСКОНЕЧНЫЙ БАТТЛ</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400 font-semibold">{battle.category || 'Opinion Arena'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {battle.title}
          </h1>

          {battle.description && (
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              {battle.description}
            </p>
          )}

          {/* Sponsor Bounty Strip */}
          <div className="flex items-center gap-2 px-3.5 py-2 mt-2 rounded-xl bg-neutral-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm">
            <Trophy size={14} className="text-amber-400 shrink-0" />
            <div className="truncate">
              <span>Призовой фонд: 100 000 ₽</span>
              <span className="mx-2 text-neutral-500">·</span>
              <span className="text-neutral-400 font-normal">Спонсор: Alpha Creator Fund</span>
            </div>
          </div>
        </div>

        {/* ── 1v1 Split Arena Cards ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-bold px-1">
            <span className="flex items-center gap-1.5 text-[#ff6a2b]">
              <Swords size={13} />
              <span>Красный угол vs Синий угол</span>
            </span>
            <span className="tabular-nums">
              {battle.totalVotes > 0 ? `Всего голосов: ${battle.totalVotes}` : 'Прямой эфир'}
            </span>
          </div>

          {/* Duel Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            
            {/* 🔴 RED CORNER CARD */}
            <div
              onClick={() => handleVote('red')}
              className={`relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none ${
                userVote === 'red'
                  ? 'bg-[#ff6a2b]/15 border-[#ff6a2b] ring-2 ring-[#ff6a2b]/30'
                  : 'bg-[#141418] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Photo Box: Instagram 4:5 standard crop (object-cover, no black bars) */}
              <div className="relative w-full aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-black/40 mb-3 border border-white/10">
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
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {redComp.photos && redComp.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 pointer-events-none">
                    {redComp.photos.length} фото
                  </div>
                )}
              </div>

              {/* Title & Creator */}
              <div className="space-y-1 mb-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#ff6a2b]">
                  Красный угол
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">{redComp.name}</h3>
                {redComp.author && (
                  <p className="text-[11px] text-neutral-400 truncate">{redComp.author}</p>
                )}
              </div>

              {/* Vote Split & Button */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-[#ff6a2b] tabular-nums">{redPercent}%</span>
                  {userVote === 'red' && (
                    <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-0.5">
                      <Check size={11} strokeWidth={3} /> Ваш выбор
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ff6a2b] rounded-full transition-all duration-500"
                    style={{ width: `${redPercent}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote('red');
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    userVote === 'red'
                      ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                      : 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white shadow-md'
                  }`}
                >
                  {userVote === 'red' ? 'Отменить голос' : 'Голосовать'}
                </button>
              </div>
            </div>

            {/* 🔵 BLUE CORNER CARD */}
            <div
              onClick={() => handleVote('blue')}
              className={`relative rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none ${
                userVote === 'blue'
                  ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/30'
                  : 'bg-[#141418] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Photo Box: Instagram 4:5 standard crop (object-cover, no black bars) */}
              <div className="relative w-full aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-black/40 mb-3 border border-white/10">
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
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-transform active:scale-90"
                >
                  <Maximize2 size={13} strokeWidth={2.4} />
                </button>

                {/* Photos count pill if multiple */}
                {blueComp.photos && blueComp.photos.length > 1 && (
                  <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 pointer-events-none">
                    {blueComp.photos.length} фото
                  </div>
                )}
              </div>

              {/* Title & Creator */}
              <div className="space-y-1 mb-2.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Синий угол
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">{blueComp.name}</h3>
                {blueComp.author && (
                  <p className="text-[11px] text-neutral-400 truncate">{blueComp.author}</p>
                )}
              </div>

              {/* Vote Split & Button */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-sky-400 tabular-nums">{bluePercent}%</span>
                  {userVote === 'blue' && (
                    <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-0.5">
                      <Check size={11} strokeWidth={3} /> Ваш выбор
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${bluePercent}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVote('blue');
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                    userVote === 'blue'
                      ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                      : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md'
                  }`}
                >
                  {userVote === 'blue' ? 'Отменить голос' : 'Голосовать'}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Battle Format & Mechanics Strip ── */}
        <div className="rounded-2xl bg-[#141418] border border-neutral-800 p-3.5 grid grid-cols-3 divide-x divide-neutral-800 text-center">
          <div className="px-2">
            <div className="text-sm sm:text-base font-extrabold text-white">Бесконечный</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">формат баттла</div>
          </div>
          <div className="px-2">
            <div className="text-sm sm:text-base font-extrabold text-white">1v1 Дуэль</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">прямой выбор</div>
          </div>
          <div className="px-2">
            <div className="text-sm sm:text-base font-extrabold text-emerald-400">Вес голоса</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">защита от накруток</div>
          </div>
        </div>

        {/* ── Rules Checklist for Battles ── */}
        <div className="space-y-2 py-1 px-1">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Check size={15} className="text-[#ff6a2b] shrink-0" strokeWidth={2.8} />
            <span>Голосование 1 на 1 без ограничения по времени раунда</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Check size={15} className="text-[#ff6a2b] shrink-0" strokeWidth={2.8} />
            <span>Один голос на дуэль — вы можете изменить выбор в любой момент</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <Check size={15} className="text-[#ff6a2b] shrink-0" strokeWidth={2.8} />
            <span>В арене баттлов работает плавный свайп и переход к следующей паре</span>
          </div>
        </div>

        {/* ── Primary Action: Enter Battle Arena ── */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArenaView(true)}
            className="w-full h-[52px] rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#ff6a2b]/20 cursor-pointer"
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
