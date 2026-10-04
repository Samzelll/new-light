"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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

    const updatedCompetitors = battle.competitors.map((c) => {
      const isPick = c.id === competitor.id;
      return {
        ...c,
        votes: isPick ? c.votes + 1 : c.votes,
        isUserPick: isPick,
      };
    }) as [BattleCompetitor, BattleCompetitor];

    const total = updatedCompetitors[0].votes + updatedCompetitors[1].votes;
    if (total > 0) {
      updatedCompetitors[0].percentage = Number(((updatedCompetitors[0].votes / total) * 100).toFixed(1));
      updatedCompetitors[1].percentage = Number((100 - updatedCompetitors[0].percentage).toFixed(1));
    }

    setBattle({
      ...battle,
      totalVotes: total,
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
        className={`w-full max-w-md h-full flex flex-col justify-between p-3.5 sm:p-4 select-none relative overflow-hidden transition-all duration-200 ${
          isTransitioning ? 'opacity-60 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* ── Top Bar ── */}
      <header className="flex items-center justify-between py-1 relative z-20 shrink-0">
        {/* Back Button (Round) */}
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Back to feed"
          className="w-9 h-9 rounded-full bg-[#18181b] hover:bg-[#27272a] text-white/90 hover:text-white flex items-center justify-center transition-all active:scale-95 border border-white/5 shadow-sm"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        {/* Centered Title + Subtitle */}
        <div className="text-center px-2 flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-black tracking-wider text-white uppercase truncate drop-shadow-sm">
            {battle.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-white/50 truncate mt-0.5 font-medium">
            {hasVoted ? 'Thanks, your vote counted' : `${battle.category} · battle`}
          </p>
        </div>

        {/* Info Button (Round with orange 'i') */}
        <button
          type="button"
          onClick={() => setIsDetailsOpen(true)}
          aria-label="Contest information"
          className="w-9 h-9 rounded-full bg-[#18181b] hover:bg-[#27272a] text-[#ff6a2b] flex items-center justify-center font-serif italic text-base font-bold transition-all active:scale-95 border border-white/5 shadow-sm"
        >
          i
        </button>
      </header>

      {/* ── Arena: Two vertically stacked photo cards with central VS badge ── */}
      <div className="flex-1 min-h-0 flex flex-col justify-between py-2 relative my-1">
        {/* 1. Top Photo Card: Red Corner */}
        <button
          type="button"
          onClick={() => handleVote(redComp)}
          disabled={hasVoted}
          aria-label={`Vote Red corner: ${redComp.name}`}
          className={`relative flex-1 min-h-0 w-full rounded-3xl overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all duration-300 ${
            activeTapCorner === 'red' ? 'scale-[0.98]' : 'active:scale-[0.98]'
          } ${
            hasVoted
              ? userVotedCorner === 'red'
                ? 'ring-2 ring-[#ef4444] shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                : 'opacity-70 brightness-[0.7]'
              : 'hover:brightness-105'
          }`}
        >
          {/* Corner Pill Top-Left */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-md inline-flex items-center gap-1 transition-all"
              style={{ backgroundColor: '#ef4444' }}
            >
              {hasVoted && userVotedCorner === 'red' ? 'Red corner ✓ your pick' : 'Red corner'}
            </span>
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

          {/* Entry Title & Tap Hint */}
          <div className="absolute bottom-3.5 left-4 right-24 z-10 pointer-events-none">
            <h2 className="font-extrabold text-white text-base sm:text-lg leading-tight drop-shadow-md truncate">
              {redComp.name}
            </h2>
            {!hasVoted && (
              <p className="text-xs text-white/60 font-medium mt-0.5 drop-shadow-sm">
                Tap to vote
              </p>
            )}
          </div>

          {/* Percentage (Shown after voting) */}
          {hasVoted && (
            <div className="absolute bottom-3.5 right-4 z-10 pointer-events-none text-right animate-fade-in">
              <span
                className="font-black text-2xl sm:text-3xl tracking-tight leading-none drop-shadow-md"
                style={{ color: '#ef4444' }}
              >
                {redComp.percentage.toFixed(1)}%
              </span>
            </div>
          )}
        </button>

        {/* 2. Circular "VS" Badge (Centered on the gap between cards) */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white text-black font-black text-xs flex items-center justify-center shadow-2xl border-2 border-[#0b0b0d] select-none pointer-events-none"
        >
          VS
        </div>

        {/* 3. Bottom Photo Card: Blue Corner */}
        <button
          type="button"
          onClick={() => handleVote(blueComp)}
          disabled={hasVoted}
          aria-label={`Vote Blue corner: ${blueComp.name}`}
          className={`relative flex-1 min-h-0 w-full rounded-3xl overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all duration-300 mt-2.5 ${
            activeTapCorner === 'blue' ? 'scale-[0.98]' : 'active:scale-[0.98]'
          } ${
            hasVoted
              ? userVotedCorner === 'blue'
                ? 'ring-2 ring-[#10b981] shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                : 'opacity-70 brightness-[0.7]'
              : 'hover:brightness-105'
          }`}
        >
          {/* Corner Pill Top-Left */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-md inline-flex items-center gap-1 transition-all"
              style={{ backgroundColor: '#10b981' }}
            >
              {hasVoted && userVotedCorner === 'blue' ? 'Blue corner ✓ your pick' : 'Blue corner'}
            </span>
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

          {/* Entry Title & Tap Hint */}
          <div className="absolute bottom-3.5 left-4 right-24 z-10 pointer-events-none">
            <h2 className="font-extrabold text-white text-base sm:text-lg leading-tight drop-shadow-md truncate">
              {blueComp.name}
            </h2>
            {!hasVoted && (
              <p className="text-xs text-white/60 font-medium mt-0.5 drop-shadow-sm">
                Tap to vote
              </p>
            )}
          </div>

          {/* Percentage (Shown after voting) */}
          {hasVoted && (
            <div className="absolute bottom-3.5 right-4 z-10 pointer-events-none text-right animate-fade-in">
              <span
                className="font-black text-2xl sm:text-3xl tracking-tight leading-none drop-shadow-md"
                style={{ color: '#10b981' }}
              >
                {blueComp.percentage.toFixed(1)}%
              </span>
            </div>
          )}
        </button>
      </div>

      {/* ── Bottom Section: Hint / Split Bar & Next Battle ── */}
      <footer className="shrink-0 pt-1 pb-1">
        {hasVoted ? (
          <div className="space-y-1 animate-fade-in">
            {/* Thin Split Bar with Corner Colors */}
            <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-white/10 shadow-inner">
              <div
                style={{ width: `${redComp.percentage}%`, backgroundColor: '#ef4444' }}
                className="h-full transition-all duration-500"
              />
              <div
                style={{ width: `${blueComp.percentage}%`, backgroundColor: '#10b981' }}
                className="h-full transition-all duration-500"
              />
            </div>

            {/* Next Battle Action */}
            <button
              type="button"
              onClick={goToNextBattle}
              className="text-xs font-bold text-[#ff6a2b] hover:text-white transition-colors py-1.5 flex items-center justify-center gap-1 mx-auto focus:outline-none focus-visible:underline"
            >
              <span>Next battle</span>
              <span>↑</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={goToNextBattle}
            className="w-full text-xs text-white/40 hover:text-white/70 text-center py-2 font-medium tracking-wide transition-colors focus:outline-none"
          >
            Swipe up for next battle ↑
          </button>
        )}
      </footer>

      {/* ── Details Bottom Sheet (State 3: "i" button) ── */}
      {isDetailsOpen && (
        <DetailsSheet battle={battle} onClose={() => setIsDetailsOpen(false)} />
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
            <span className="text-white/50 font-medium">Category</span>
            <span className="text-white font-semibold">{battle.category}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-white/50 font-medium">Format</span>
            <span className="text-white font-semibold">{battle.format}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <span className="text-white/50 font-medium">Votes so far</span>
            <span className="text-white font-bold">{battle.totalVotes}</span>
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
