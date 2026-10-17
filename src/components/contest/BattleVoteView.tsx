"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Maximize2, Check } from 'lucide-react';
import { PhotoLightbox } from '@/components/common/PhotoLightbox';
import {
  BattleContest,
  BattleCompetitor,
  getBattle,
  castVote,
  getNextBattle,
} from '@/services/battleDataService';

interface BattleVoteViewProps {
  initialContestId?: string;
}

export function BattleVoteView({ initialContestId }: BattleVoteViewProps) {
  const router = useRouter();

  const [battle, setBattle] = useState<BattleContest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userVotedCorner, setUserVotedCorner] = useState<'red' | 'blue' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTapCorner, setActiveTapCorner] = useState<'red' | 'blue' | null>(null);
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

  // Cached next battle for instant swipe transition
  const nextBattleRef = useRef<BattleContest | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Load battle data
  const loadBattleData = useCallback(async (contestId?: string) => {
    setLoading(true);
    const data = await getBattle(contestId);
    if (data) {
      setBattle(data);
      if (data.userVotedId) {
        const picked = data.competitors.find((c) => c.id === data.userVotedId);
        if (picked) setUserVotedCorner(picked.corner);
      } else {
        setUserVotedCorner(null);
      }

      // Preload next battle in the feed
      getNextBattle(data.id).then((next) => {
        if (next) {
          nextBattleRef.current = next;
          // Preload next pair of images into browser cache
          next.competitors.forEach((c) => {
            if (c.photoUrl) {
              const img = new Image();
              img.src = c.photoUrl;
            }
          });
        }
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBattleData(initialContestId);
  }, [initialContestId, loadBattleData]);

  // Navigate to next battle in the feed
  const goToNextBattle = useCallback(async () => {
    if (!battle || isTransitioning) return;
    setIsTransitioning(true);

    let next = nextBattleRef.current;
    if (!next || next.id === battle.id) {
      next = await getNextBattle(battle.id);
    }

    if (next) {
      // Update browser history without full page reload
      window.history.pushState({}, '', `/contest/${next.id}`);
      setBattle(next);
      if (next.userVotedId) {
        const picked = next.competitors.find((c) => c.id === next.userVotedId);
        setUserVotedCorner(picked ? picked.corner : null);
      } else {
        setUserVotedCorner(null);
      }

      // Preload the subsequent battle
      getNextBattle(next.id).then((subsequent) => {
        if (subsequent) {
          nextBattleRef.current = subsequent;
          subsequent.competitors.forEach((c) => {
            if (c.photoUrl) {
              const img = new Image();
              img.src = c.photoUrl;
            }
          });
        }
      });
    }

    setTimeout(() => {
      setIsTransitioning(false);
    }, 250);
  }, [battle, isTransitioning]);

  // Handle card tap to vote
  const handleVote = async (competitor: BattleCompetitor) => {
    if (!battle || userVotedCorner) return; // Cannot vote twice or change vote

    // Haptic/scale tap animation
    setActiveTapCorner(competitor.corner);
    setTimeout(() => setActiveTapCorner(null), 200);

    // Optimistic UI update
    setUserVotedCorner(competitor.corner);

    let weightToAdd = 1.0;
    try {
      const { getMyTrust } = await import('@/services/trustService');
      const { data: trustData } = await getMyTrust();
      if (trustData?.score && trustData.score > 0) {
        weightToAdd = Number(trustData.score);
      }
    } catch {}

    const updatedCompetitors = battle.competitors.map((c) => {
      const isPick = c.id === competitor.id;
      return {
        ...c,
        votes: isPick ? Math.round((c.votes + weightToAdd) * 10) / 10 : c.votes,
        isUserPick: isPick,
      };
    }) as [BattleCompetitor, BattleCompetitor];

    const total = Math.round((updatedCompetitors[0].votes + updatedCompetitors[1].votes) * 10) / 10;
    if (total > 0) {
      updatedCompetitors[0].percentage = Number(((updatedCompetitors[0].votes / total) * 100).toFixed(1));
      updatedCompetitors[1].percentage = Number((100 - updatedCompetitors[0].percentage).toFixed(1));
    }

    setBattle({
      ...battle,
      totalVotes: Math.round(total),
      competitors: updatedCompetitors,
      userVotedId: competitor.id,
    });

    // Cast vote through data layer
    await castVote(battle.id, competitor.id);
  };

  // Touch handlers for vertical swipe up gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
    touchStartYRef.current = null;

    // Swipe up detected (swiped upward by more than 50px)
    if (deltaY > 50) {
      goToNextBattle();
    }
  };

  if (loading || !battle) {
    return (
      <main className="fixed inset-0 z-30 bg-[#0b0b0d] text-white flex items-center justify-center overflow-hidden font-sans">
        <div className="w-full max-w-md h-full flex flex-col justify-between p-3.5 sm:p-4 animate-pulse select-none">
          <div className="flex items-center justify-between py-1">
            <div className="w-9 h-9 rounded-full bg-white/10" />
            <div className="space-y-1 text-center flex-1 px-4">
              <div className="h-4 w-28 bg-white/10 rounded mx-auto" />
              <div className="h-3 w-36 bg-white/10 rounded mx-auto" />
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 my-2 flex flex-col gap-2.5">
            <div className="flex-1 bg-white/10 rounded-3xl" />
            <div className="flex-1 bg-white/10 rounded-3xl" />
          </div>
          <div className="h-4 w-36 bg-white/10 rounded mx-auto my-2" />
        </div>
      </main>
    );
  }

  const [redComp, blueComp] = battle.competitors;
  const hasVoted = Boolean(userVotedCorner);

  return (
    <main
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-30 bg-[#0b0b0d] text-white flex items-center justify-center overflow-hidden font-sans"
    >
      <div
        className={`w-full max-w-md h-full flex flex-col justify-between px-1.5 sm:px-2 pt-1 pb-1 select-none relative overflow-hidden transition-all duration-200 ${
          isTransitioning ? 'opacity-60 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* ── Top Bar: Back Button + Centered Clickable Contest Title (Seamless, no extra info button) ── */}
        <header className="flex items-center justify-between px-1 py-1 relative z-20 shrink-0 bg-transparent border-none">
          {/* Back Button (Seamless) */}
          <button
            type="button"
            onClick={() => router.push('/')}
            aria-label="Back to feed"
            className="w-8 h-8 rounded-full bg-transparent hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all active:scale-95 border-none shrink-0"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>

          {/* Centered Clickable Title */}
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className="group inline-flex items-center justify-center gap-1.5 px-2 flex-1 min-w-0 transition-all cursor-pointer text-center active:scale-95"
            title="Open contest details & rules"
          >
            <span className="text-sm sm:text-base font-black tracking-wider text-white uppercase truncate drop-shadow-sm group-hover:text-[#ff6a2b] transition-colors">
              {battle.title}
            </span>
            <ChevronRight
              size={15}
              className="text-neutral-500 group-hover:text-[#ff6a2b] group-hover:translate-x-0.5 transition-all shrink-0 opacity-70 group-hover:opacity-100"
            />
          </button>

          {/* Spacer to balance the Back button on left */}
          <div className="w-8 shrink-0" />
        </header>

        {/* ── Arena: Two vertically stacked photo cards with central VS badge (Maximizes screen space) ── */}
        <div className="flex-1 min-h-0 flex flex-col justify-between relative my-1 gap-1.5 bg-transparent border-0">
          {/* 1. Top Photo Card: Competitor 1 */}
          <div
            role="button"
            tabIndex={hasVoted ? -1 : 0}
            onClick={() => !hasVoted && handleVote(redComp)}
            onKeyDown={(e) => {
              if (!hasVoted && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleVote(redComp);
              }
            }}
            aria-label={`Vote for: ${redComp.name}`}
            className={`relative flex-1 min-h-0 w-full rounded-2xl sm:rounded-3xl overflow-hidden ${hasVoted ? 'cursor-default' : 'cursor-pointer'} text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all duration-300 origin-center border border-neutral-800/80 bg-[#121215] ${
              hasVoted
                ? userVotedCorner === 'red'
                  ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : 'opacity-70 brightness-[0.7]'
                : activeTapCorner === 'red'
                ? 'scale-[0.98]'
                : 'hover:brightness-105 active:scale-[0.98]'
            }`}
          >
            {/* Selected Badge Top-Left (Only when selected) */}
            {hasVoted && userVotedCorner === 'red' && (
              <div className="absolute top-3 left-3 z-10 pointer-events-none animate-fade-in">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-emerald-600 shadow-md inline-flex items-center gap-1 border border-emerald-400/40">
                  <Check size={12} strokeWidth={3} />
                  <span>Selected</span>
                </span>
              </div>
            )}

            {/* Top-Right: Zoom inspect button */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const authorTag = redComp.author || undefined;
                  setLightboxData({
                    photoUrl: redComp.photoUrl,
                    photos: redComp.photos || [redComp.photoUrl],
                    title: redComp.name,
                    author: authorTag,
                    authorAvatar: redComp.author ? redComp.authorAvatar : undefined,
                    authorBio: redComp.author ? ((redComp as any).authorBio || `Challenger in ${battle.title}.`) : undefined,
                    category: battle.title,
                    sponsorName: (battle as any).sponsorName || 'Alpha Lab & Creator Fund',
                    sponsorTier: 'Official Contest Sponsor',
                    prizePool: '$2,500 Prize Pool',
                    socialLinks: authorTag ? {
                      instagram: `https://instagram.com/${authorTag.replace('@', '')}`,
                      telegram: `https://t.me/${authorTag.replace('@', '')}`,
                      twitter: `https://x.com/${authorTag.replace('@', '')}`,
                      portfolio: `https://${authorTag.replace('@', '')}.design`,
                    } : undefined,
                    isSelected: userVotedCorner === 'red',
                    onVote: () => handleVote(redComp),
                  });
                }}
                aria-label={`Inspect ${redComp.name} photo`}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-white/20 shadow-md"
              >
                <Maximize2 size={14} strokeWidth={2.4} />
              </button>
            </div>

            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={redComp.photoUrl}
              alt={redComp.name}
              className="w-full h-full object-cover object-center pointer-events-none"
            />

            {/* Bottom Dark Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

            {/* Entry Author Avatar + Handle + Work Title */}
            <div className="absolute bottom-3 left-3.5 right-24 z-10 pointer-events-none">
              <div className="flex items-center gap-2">
                {redComp.author && redComp.authorAvatar && (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={redComp.authorAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  {redComp.author && (
                    <span className="text-xs sm:text-sm font-black text-white drop-shadow-md truncate block leading-tight">
                      {redComp.author}
                    </span>
                  )}
                  <span className={`${redComp.author ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5' : 'text-sm sm:text-base font-black text-white'} drop-shadow-md truncate block leading-tight tracking-wide`}>
                    {redComp.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Percentage & Points (Shown after voting, green if picked) */}
            {hasVoted && (
              <div className="absolute bottom-3 right-3.5 z-10 pointer-events-none text-right animate-fade-in">
                <span
                  className={`font-black text-2xl sm:text-3xl tracking-tight leading-none drop-shadow-md ${
                    userVotedCorner === 'red' ? 'text-emerald-400' : 'text-neutral-300'
                  }`}
                >
                  {redComp.percentage.toFixed(1)}%
                </span>
                <span className="block text-[11px] font-bold text-white/80 tracking-wide mt-0.5 drop-shadow">
                  {redComp.votes} {redComp.votes === 1 ? 'pt' : 'pts'}
                </span>
              </div>
            )}
          </div>

          {/* 2. Circular "VS" Badge (Centered on the gap between cards) */}
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6a2b] to-[#e04500] text-white font-black text-xs flex items-center justify-center shadow-2xl border-2 border-[#0b0b0d] select-none pointer-events-none ring-2 ring-white/20 animate-pulse"
          >
            VS
          </div>

          {/* 3. Bottom Photo Card: Competitor 2 */}
          <div
            role="button"
            tabIndex={hasVoted ? -1 : 0}
            onClick={() => !hasVoted && handleVote(blueComp)}
            onKeyDown={(e) => {
              if (!hasVoted && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleVote(blueComp);
              }
            }}
            aria-label={`Vote for: ${blueComp.name}`}
            className={`relative flex-1 min-h-0 w-full rounded-2xl sm:rounded-3xl overflow-hidden ${hasVoted ? 'cursor-default' : 'cursor-pointer'} text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-all duration-300 origin-center border border-neutral-800/80 bg-[#121215] ${
              hasVoted
                ? userVotedCorner === 'blue'
                  ? 'scale-[0.88] ring-2 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.35)] z-10'
                  : 'opacity-70 brightness-[0.7]'
                : activeTapCorner === 'blue'
                ? 'scale-[0.98]'
                : 'hover:brightness-105 active:scale-[0.98]'
            }`}
          >
            {/* Selected Badge Top-Left (Only when selected) */}
            {hasVoted && userVotedCorner === 'blue' && (
              <div className="absolute top-3 left-3 z-10 pointer-events-none animate-fade-in">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-emerald-600 shadow-md inline-flex items-center gap-1 border border-emerald-400/40">
                  <Check size={12} strokeWidth={3} />
                  <span>Selected</span>
                </span>
              </div>
            )}

            {/* Top-Right: Zoom inspect button */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const authorTag = blueComp.author || undefined;
                  setLightboxData({
                    photoUrl: blueComp.photoUrl,
                    photos: blueComp.photos || [blueComp.photoUrl],
                    title: blueComp.name,
                    author: authorTag,
                    authorAvatar: blueComp.author ? blueComp.authorAvatar : undefined,
                    authorBio: blueComp.author ? ((blueComp as any).authorBio || `Challenger in ${battle.title}.`) : undefined,
                    category: battle.title,
                    sponsorName: (battle as any).sponsorName || 'Alpha Lab & Creator Fund',
                    sponsorTier: 'Official Contest Sponsor',
                    prizePool: '$2,500 Prize Pool',
                    socialLinks: authorTag ? {
                      instagram: `https://instagram.com/${authorTag.replace('@', '')}`,
                      telegram: `https://t.me/${authorTag.replace('@', '')}`,
                      twitter: `https://x.com/${authorTag.replace('@', '')}`,
                      portfolio: `https://${authorTag.replace('@', '')}.design`,
                    } : undefined,
                    isSelected: userVotedCorner === 'blue',
                    onVote: () => handleVote(blueComp),
                  });
                }}
                aria-label={`Inspect ${blueComp.name} photo`}
                className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-white/20 shadow-md"
              >
                <Maximize2 size={14} strokeWidth={2.4} />
              </button>
            </div>

            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blueComp.photoUrl}
              alt={blueComp.name}
              className="w-full h-full object-cover object-center pointer-events-none"
            />

            {/* Bottom Dark Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

            {/* Entry Author Avatar + Handle + Work Title */}
            <div className="absolute bottom-3 left-3.5 right-24 z-10 pointer-events-none">
              <div className="flex items-center gap-2">
                {blueComp.author && blueComp.authorAvatar && (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/40 shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blueComp.authorAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  {blueComp.author && (
                    <span className="text-xs sm:text-sm font-black text-white drop-shadow-md truncate block leading-tight">
                      {blueComp.author}
                    </span>
                  )}
                  <span className={`${blueComp.author ? 'text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5' : 'text-sm sm:text-base font-black text-white'} drop-shadow-md truncate block leading-tight tracking-wide`}>
                    {blueComp.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Percentage & Points (Shown after voting, green if picked) */}
            {hasVoted && (
              <div className="absolute bottom-3 right-3.5 z-10 pointer-events-none text-right animate-fade-in">
                <span
                  className={`font-black text-2xl sm:text-3xl tracking-tight leading-none drop-shadow-md ${
                    userVotedCorner === 'blue' ? 'text-emerald-400' : 'text-neutral-300'
                  }`}
                >
                  {blueComp.percentage.toFixed(1)}%
                </span>
                <span className="block text-[11px] font-bold text-white/80 tracking-wide mt-0.5 drop-shadow">
                  {blueComp.votes} {blueComp.votes === 1 ? 'pt' : 'pts'}
                </span>
              </div>
            )}
          </div>
        </div>

      {/* ── Bottom Section: Thin Split Bar after voting & Desktop-Only Controls ── */}
      <footer className="shrink-0 pt-1 pb-1">
        {hasVoted ? (
          <div className="space-y-1.5 animate-fade-in">
            {/* Thin Split Bar with Corner Colors */}
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-white/10 shadow-inner">
              <div
                style={{ width: `${redComp.percentage}%`, backgroundColor: userVotedCorner === 'red' ? '#10b981' : '#52525b' }}
                className="h-full transition-all duration-500"
              />
              <div
                style={{ width: `${blueComp.percentage}%`, backgroundColor: userVotedCorner === 'blue' ? '#10b981' : '#52525b' }}
                className="h-full transition-all duration-500"
              />
            </div>

            {/* Desktop-only Next Battle controls */}
            <div className="hidden lg:flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={goToNextBattle}
                aria-label="Next battle"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-end text-xs text-white/40 py-1">
            <button
              type="button"
              onClick={goToNextBattle}
              aria-label="Next battle"
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors active:scale-95"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
      </footer>

      {/* ── Details Bottom Sheet (State 3: "i" button) ── */}
      {isDetailsOpen && (
        <DetailsSheet battle={battle} onClose={() => setIsDetailsOpen(false)} />
      )}

      {/* ── Photo Lightbox (High-Resolution Zoom & Detail Inspection) ── */}
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
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailsSheet Component
// ─────────────────────────────────────────────────────────────────────────────
interface DetailsSheetProps {
  battle: BattleContest;
  onClose: () => void;
}

export function DetailsSheet({ battle, onClose }: DetailsSheetProps) {
  const [showFullRules, setShowFullRules] = useState(false);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Contest Details"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#161618] rounded-t-3xl border-t border-white/10 p-5 space-y-4 shadow-2xl z-50 animate-slide-up text-white"
      >
        {/* Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-2" />

        {/* Title */}
        <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
          {battle.title}
        </h2>

        {/* Description */}
        <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
          {battle.description}
        </p>

        {/* Key-Value Rows */}
        <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-white/50 font-medium">Format</span>
            <span className="text-white font-semibold">{battle.format}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-white/50 font-medium">Votes / Points</span>
            <span className="text-white font-bold">{battle.totalVotes} pts</span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-white/50 font-medium">Rules</span>
            <button
              type="button"
              onClick={() => setShowFullRules(!showFullRules)}
              className="text-[#ff6a2b] font-bold hover:underline flex items-center gap-1 focus:outline-none"
            >
              <span>{showFullRules ? 'Hide rules' : 'Read →'}</span>
            </button>
          </div>

          {showFullRules && (
            <div className="p-3 bg-black/40 rounded-xl text-xs text-white/70 leading-relaxed border border-white/5 animate-fade-in">
              {battle.rules}
            </div>
          )}
        </div>

        {/* Primary Action Button: Join this contest */}
        <Link
          href={`/apply/${battle.id}`}
          className="w-full block py-3.5 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7b42] text-white font-extrabold text-sm text-center shadow-lg transition-transform active:scale-[0.98] mt-4"
        >
          Join this contest
        </Link>

        {/* Secondary Action: Back to battle */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs text-white/60 hover:text-white transition-colors font-medium text-center focus:outline-none"
        >
          Back to battle
        </button>
      </div>
    </div>
  );
}
