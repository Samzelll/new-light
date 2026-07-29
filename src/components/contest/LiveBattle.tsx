"use client";

import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { formatPercentage } from '@/utils/formatters';
import { supabase } from '@/services/supabase';
import { ConfettiBurst } from '@/components/ui/ConfettiBurst';
import { useToast } from '@/components/ui/Toast';

interface LiveBattleProps {
  contestId: string;
  participants: any[];
  userTrustScore: number;
}

export function LiveBattle({ contestId, participants, userTrustScore }: LiveBattleProps) {
  const { isAuthenticated } = useAuth();
  const { voteInGroup } = useVote();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [votes, setVotes] = useState<any[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; desc?: string } | null>(null);
  const [confettiSide, setConfettiSide] = useState<'p1' | 'p2' | null>(null);
  // Track previous percentages for upset detection
  const prevP1Ref = useRef<number | null>(null);

  // Load existing votes
  useEffect(() => {
    async function loadVotes() {
      const { data } = await supabase
        .from('votes')
        .select('id, participant_id, trust_weight')
        .eq('contest_id', contestId);
      if (data) setVotes(data);
    }
    loadVotes();
  }, [contestId]);

  // Realtime vote subscription
  useRealtime('votes', `contest_id=eq.${contestId}`, (payload) => {
    if (payload.new) {
      setVotes((prev) => [...prev, payload.new]);
    }
  });

  // Calculate weighted percentages
  const totals = votes.reduce(
    (acc, vote) => {
      const weight = Number(vote.trust_weight) || 1.0;
      acc.total += weight;
      acc[vote.participant_id] = (acc[vote.participant_id] || 0) + weight;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const getPercent = (partId: string) => {
    if (totals.total === 0) return 50;
    return ((totals[partId] || 0) / totals.total) * 100;
  };

  const handleVote = async (participantId: string, side: 'p1' | 'p2') => {
    if (votedId || voting) return;

    if (!isAuthenticated) {
      toastInfo('Sign in to cast your vote and build your reputation', '🔒');
      return;
    }

    setVoting(true);
    const { error } = await voteInGroup(contestId, contestId, contestId, participantId, userTrustScore);

    if (!error) {
      setVotedId(participantId);
      setConfettiSide(side);
      // Reset confetti trigger after animation completes
      setTimeout(() => setConfettiSide(null), 2500);
      toastSuccess('Your vote has been recorded!', '⚡');
    } else {
      toastError(error);
    }
    setVoting(false);
  };

  if (participants.length < 2) {
    return (
      <div className="card text-center py-10 bg-surface-800 border-surface-700">
        <div className="text-3xl mb-2">⚔️</div>
        <h3 className="text-white font-bold text-lg mb-1">Battle Match Configuration</h3>
        <p className="text-gray-400 text-xs max-w-sm mx-auto">
          {participants.length === 1
            ? '1 competitor is ready. Waiting for a second competitor to launch the battle.'
            : 'No competitors added yet. Check back soon.'}
        </p>
      </div>
    );
  }

  const p1 = participants[0];
  const p2 = participants[1];

  const p1Name = p1.submission_data?.name || p1.profiles?.display_name || p1.profiles?.username || 'Competitor 1';
  const p2Name = p2.submission_data?.name || p2.profiles?.display_name || p2.profiles?.username || 'Competitor 2';

  const p1Photo = getPublicUrl('submissions', p1.submission_data?.photos?.[0] || '');
  const p2Photo = getPublicUrl('submissions', p2.submission_data?.photos?.[0] || '');

  const p1Desc = p1.submission_data?.description;
  const p2Desc = p2.submission_data?.description;

  const p1Percent = getPercent(p1.id);
  const p2Percent = getPercent(p2.id);

  // Detect upset (leader changed after a vote stream update)
  const isP1Leading = p1Percent > p2Percent;
  const isClose = Math.abs(p1Percent - p2Percent) < 5 && totals.total > 0;

  const canVote = isAuthenticated && !votedId && !voting;

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-surface-800 border border-surface-600 rounded-2xl overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white font-bold flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
            <div className="max-h-[65vh] bg-black overflow-hidden flex items-center justify-center">
              <img src={previewPhoto.url} alt={previewPhoto.title} className="max-h-[65vh] object-contain w-full" />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-2">{previewPhoto.title}</h3>
              {previewPhoto.desc ? (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{previewPhoto.desc}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">No description provided.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "Too close" alert */}
      {isClose && votedId && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'rgba(255, 200, 87, 0.1)',
            border: '1px solid rgba(255, 200, 87, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <span style={{ fontSize: '18px' }}>🔥</span>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#ffc857', margin: 0 }}>
            It&apos;s neck and neck! Less than 5% separates them.
          </p>
        </div>
      )}

      {/* Battle cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ─── Competitor 1 ─── */}
        <BattleCard
          name={p1Name}
          photo={p1Photo}
          desc={p1Desc}
          percent={p1Percent}
          isVoted={votedId === p1.id}
          isOtherVoted={!!votedId && votedId !== p1.id}
          cornerLabel="RED CORNER"
          cornerColor="var(--color-accent-red)"
          cornerBg="rgba(255,87,87,0.15)"
          percentColor="var(--color-accent-red)"
          canVote={canVote}
          voting={voting}
          showConfetti={confettiSide === 'p1'}
          onVote={() => handleVote(p1.id, 'p1')}
          onPreview={() => setPreviewPhoto({ url: p1Photo, title: p1Name, desc: p1Desc })}
          voteLabel="Vote Red Corner 🥊"
          votedLabel="✓ Voted Red Corner"
          glow="rgba(255,87,87,0.2)"
        />

        {/* ─── Competitor 2 ─── */}
        <BattleCard
          name={p2Name}
          photo={p2Photo}
          desc={p2Desc}
          percent={p2Percent}
          isVoted={votedId === p2.id}
          isOtherVoted={!!votedId && votedId !== p2.id}
          cornerLabel="BLUE CORNER"
          cornerColor="var(--color-accent-green)"
          cornerBg="rgba(0,229,160,0.15)"
          percentColor="var(--color-accent-green)"
          canVote={canVote}
          voting={voting}
          showConfetti={confettiSide === 'p2'}
          onVote={() => handleVote(p2.id, 'p2')}
          onPreview={() => setPreviewPhoto({ url: p2Photo, title: p2Name, desc: p2Desc })}
          voteLabel="Vote Blue Corner 🥊"
          votedLabel="✓ Voted Blue Corner"
          glow="rgba(0,229,160,0.2)"
        />
      </div>

      {/* ── Versus split bar ── */}
      <VersusBar
        p1Name={p1Name}
        p2Name={p2Name}
        p1Percent={p1Percent}
        p2Percent={p2Percent}
        total={totals.total}
        voted={!!votedId}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface BattleCardProps {
  name: string;
  photo: string;
  desc?: string;
  percent: number;
  isVoted: boolean;
  isOtherVoted: boolean;
  cornerLabel: string;
  cornerColor: string;
  cornerBg: string;
  percentColor: string;
  canVote: boolean;
  voting: boolean;
  showConfetti: boolean;
  onVote: () => void;
  onPreview: () => void;
  voteLabel: string;
  votedLabel: string;
  glow: string;
}

function BattleCard({
  name, photo, desc, percent,
  isVoted, isOtherVoted,
  cornerLabel, cornerColor, cornerBg, percentColor,
  canVote, voting, showConfetti,
  onVote, onPreview,
  voteLabel, votedLabel, glow,
}: BattleCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    // Ripple effect
    const btn = buttonRef.current;
    if (btn) {
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => { if (btn) btn.style.transform = 'scale(1)'; }, 150);
    }
    onVote();
  };

  return (
    <div
      style={{
        background: isVoted ? cornerBg : 'var(--color-surface-800)',
        border: `1px solid ${isVoted ? cornerColor : 'var(--color-surface-600)'}`,
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: isVoted ? `0 0 32px ${glow}, 0 8px 24px rgba(0,0,0,0.3)` : '0 4px 16px rgba(0,0,0,0.2)',
        opacity: isOtherVoted ? 0.6 : 1,
      }}
    >
      {/* Confetti overlay */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '20px', overflow: 'hidden', pointerEvents: 'none' }}>
        <ConfettiBurst active={showConfetti} color={cornerColor} originX={0.5} originY={0.6} />
      </div>

      {/* "Your Vote" ribbon */}
      {isVoted && (
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: cornerColor,
            color: cornerColor === 'var(--color-accent-green)' ? '#0b0d12' : 'white',
            fontSize: '9px',
            fontWeight: '800',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '4px 14px',
            borderRadius: '0 0 10px 10px',
            animation: 'cardWin 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          YOUR VOTE ✓
        </div>
      )}

      {/* Photo */}
      <div
        onClick={onPreview}
        style={{
          width: '100%',
          maxWidth: '240px',
          aspectRatio: '1/1',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: '16px',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          border: `1px solid ${isVoted ? cornerColor + '40' : 'rgba(255,255,255,0.06)'}`,
          transition: 'transform 0.2s',
        }}
        className="group"
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
            className="group-hover:scale-105"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--color-surface-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '40px' }}>🎭</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)' }} />
        {/* Corner badge */}
        <span
          style={{
            position: 'absolute', bottom: '10px', left: '10px',
            fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em',
            color: cornerColor === 'var(--color-accent-green)' ? '#0b0d12' : 'white',
            background: cornerColor, padding: '3px 8px', borderRadius: '6px',
            textTransform: 'uppercase',
          }}
        >
          {cornerLabel}
        </span>
        {/* View hint */}
        <span
          style={{
            position: 'absolute', top: '8px', right: '8px',
            fontSize: '10px', background: 'rgba(0,0,0,0.6)', color: '#d1d5db',
            padding: '3px 8px', borderRadius: '20px', backdropFilter: 'blur(4px)',
            opacity: 0, transition: 'opacity 0.2s',
          }}
          className="group-hover:opacity-100"
        >
          🔍 View
        </span>
      </div>

      {/* Name */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '800',
          color: 'white',
          marginBottom: '8px',
          lineHeight: '1.2',
        }}
      >
        {name}
      </h3>

      {/* Description */}
      {desc && (
        <p
          style={{
            fontSize: '12px',
            color: 'rgb(156,163,175)',
            lineHeight: '1.5',
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'left',
            width: '100%',
            background: 'var(--color-surface-900)',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {desc}
        </p>
      )}

      {/* Percentage */}
      <div style={{ marginBottom: '16px' }}>
        <span
          style={{
            fontSize: '38px',
            fontWeight: '900',
            color: percentColor,
            lineHeight: '1',
            display: 'block',
            transition: 'all 0.5s ease',
            letterSpacing: '-0.02em',
          }}
        >
          {formatPercentage(percent)}
        </span>
        <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Current Share
        </span>
      </div>

      {/* Vote button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={!canVote && !isVoted}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          fontSize: '12px',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          border: 'none',
          cursor: canVote ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          background: isVoted
            ? cornerColor
            : canVote
            ? cornerBg
            : 'var(--color-surface-700)',
          color: isVoted
            ? (cornerColor === 'var(--color-accent-green)' ? '#0b0d12' : 'white')
            : canVote
            ? cornerColor
            : 'rgb(107,114,128)',
          outline: canVote ? `1px solid ${cornerColor}40` : 'none',
          boxShadow: isVoted ? `0 4px 16px ${glow}` : 'none',
        }}
        onMouseEnter={(e) => {
          if (canVote) {
            (e.currentTarget as HTMLButtonElement).style.background = cornerColor;
            (e.currentTarget as HTMLButtonElement).style.color = cornerColor === 'var(--color-accent-green)' ? '#0b0d12' : 'white';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px ${glow}`;
          }
        }}
        onMouseLeave={(e) => {
          if (canVote && !isVoted) {
            (e.currentTarget as HTMLButtonElement).style.background = cornerBg;
            (e.currentTarget as HTMLButtonElement).style.color = cornerColor;
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }
        }}
      >
        {voting ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            Casting...
          </span>
        ) : isVoted ? (
          votedLabel
        ) : (
          voteLabel
        )}
      </button>
    </div>
  );
}

// ── Versus split bar ──────────────────────────────────────────────────────────
interface VersusBarProps {
  p1Name: string;
  p2Name: string;
  p1Percent: number;
  p2Percent: number;
  total: number;
  voted: boolean;
}

function VersusBar({ p1Name, p2Name, p1Percent, p2Percent, total, voted }: VersusBarProps) {
  return (
    <div
      style={{
        background: 'var(--color-surface-800)',
        border: '1px solid var(--color-surface-600)',
        borderRadius: '16px',
        padding: '16px 20px',
      }}
    >
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent-red)', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-accent-red)' }}>
            {p1Name}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-accent-red)' }}>
            {formatPercentage(p1Percent)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-accent-green)' }}>
            {formatPercentage(p2Percent)}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-accent-green)' }}>
            {p2Name}
          </span>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent-green)', display: 'inline-block' }} />
        </div>
      </div>

      {/* Bar */}
      <div
        style={{
          height: '20px',
          width: '100%',
          borderRadius: '99px',
          overflow: 'hidden',
          display: 'flex',
          background: 'var(--color-surface-900)',
          border: '1px solid var(--color-surface-600)',
          padding: '2px',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: '99px 0 0 99px',
            background: 'linear-gradient(90deg, #ff3b3b, var(--color-accent-red))',
            transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
            width: `${p1Percent}%`,
          }}
        />
        <div
          style={{
            height: '100%',
            borderRadius: '0 99px 99px 0',
            background: 'linear-gradient(90deg, var(--color-accent-green), #00ff8f)',
            transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
            width: `${p2Percent}%`,
          }}
        />
      </div>

      {/* Total votes */}
      {total > 0 && (
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgb(107,114,128)', marginTop: '8px', fontWeight: '600' }}>
          {Math.round(total).toLocaleString()} {Math.round(total) === 1 ? 'vote' : 'votes'} cast
          {!voted && ' · Click a card to vote'}
        </p>
      )}
    </div>
  );
}
