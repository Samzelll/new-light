"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { ConfettiBurst } from '@/components/ui/ConfettiBurst';
import { useToast } from '@/components/ui/Toast';

interface Profile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Participant {
  id: string;
  name?: string;
  submission_data: {
    photos?: string[];
    description?: string;
    social_links?: Record<string, string>;
  };
  profiles?: Profile | null;
}

interface GroupVotingProps {
  contestId: string;
  stageId: string;
  groupId: string;
  participants: Participant[];
  hasVoted: boolean;
  votedParticipantId: string | null;
  onVoteSuccess: (votedId: string) => void;
  trustScore: number;
}

export function GroupVoting({
  contestId,
  stageId,
  groupId,
  participants,
  hasVoted,
  votedParticipantId,
  onVoteSuccess,
  trustScore,
}: GroupVotingProps) {
  const { isAuthenticated } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confettiId, setConfettiId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (participantId: string) => {
    if (hasVoted || isSubmitting) return;

    if (!isAuthenticated) {
      toastInfo('Sign in to cast your vote and build your reputation', '🔒');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { castVote } = await import('@/services/voteService');
      const { error: voteErr } = await castVote({
        contestId,
        stageId,
        groupId,
        participantId,
        trustWeight: trustScore,
      });

      if (voteErr) {
        setError(voteErr);
        toastError(voteErr);
      } else {
        setConfettiId(participantId);
        setTimeout(() => setConfettiId(null), 2500);
        onVoteSuccess(participantId);
        toastSuccess('Your vote has been recorded!', '⚡');
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred while voting.';
      setError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: 'white',
            margin: 0,
          }}
        >
          {hasVoted ? '✓ You voted in this group' : 'Cast your vote'}
        </h3>
        {!hasVoted && (
          <span
            style={{
              fontSize: '11px',
              color: 'rgb(107,114,128)',
              fontWeight: '500',
            }}
          >
            Anonymous · one vote per group
          </span>
        )}
      </div>

      {/* Success banner */}
      {hasVoted && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: 'rgba(0, 229, 160, 0.08)',
            border: '1px solid rgba(0, 229, 160, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-accent-green)', margin: 0 }}>
              Vote recorded!
            </p>
            <p style={{ fontSize: '11px', color: 'rgb(107,114,128)', margin: '2px 0 0' }}>
              Results update in real time as others vote.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '14px',
            background: 'rgba(255, 87, 87, 0.08)',
            border: '1px solid rgba(255, 87, 87, 0.25)',
            fontSize: '13px',
            color: 'var(--color-accent-red)',
            fontWeight: '500',
          }}
        >
          {error}
        </div>
      )}

      {/* Participant grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '14px',
        }}
      >
        {participants.map((p) => {
          const isVotedFor = votedParticipantId === p.id;
          const photoUrl = p.submission_data?.photos?.[0]
            ? getPublicUrl('submissions', p.submission_data.photos[0], { width: 400, quality: 80 })
            : null;
          const displayName = p.name || p.profiles?.display_name || p.profiles?.username || 'Anonymous';
          const showConfetti = confettiId === p.id;

          return (
            <GroupCard
              key={p.id}
              participantId={p.id}
              displayName={displayName}
              username={p.profiles?.username || null}
              photoUrl={photoUrl}
              description={p.submission_data?.description}
              isVotedFor={isVotedFor}
              hasVoted={hasVoted}
              isSubmitting={isSubmitting}
              showConfetti={showConfetti}
              onVote={handleVote}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupCard sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface GroupCardProps {
  participantId: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  description?: string;
  isVotedFor: boolean;
  hasVoted: boolean;
  isSubmitting: boolean;
  showConfetti: boolean;
  onVote: (id: string) => void;
}

function GroupCard({
  participantId, displayName, username, photoUrl, description,
  isVotedFor, hasVoted, isSubmitting, showConfetti, onVote,
}: GroupCardProps) {
  const canInteract = !hasVoted && !isSubmitting;

  return (
    <div
      onClick={() => canInteract && onVote(participantId)}
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        background: isVotedFor
          ? 'linear-gradient(145deg, rgba(0,229,160,0.12), rgba(0,229,160,0.04))'
          : 'var(--color-surface-800)',
        border: `1.5px solid ${isVotedFor ? 'var(--color-accent-green)' : hasVoted ? 'var(--color-surface-700)' : 'var(--color-surface-600)'}`,
        cursor: canInteract ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        opacity: hasVoted && !isVotedFor ? 0.55 : 1,
        boxShadow: isVotedFor
          ? '0 0 24px rgba(0,229,160,0.2), 0 8px 24px rgba(0,0,0,0.3)'
          : '0 4px 16px rgba(0,0,0,0.2)',
        transform: isVotedFor ? 'scale(1.02)' : 'scale(1)',
      }}
      className={canInteract ? 'group' : ''}
      onMouseEnter={(e) => {
        if (canInteract) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.01)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-brand-400)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(56,97,255,0.2), 0 8px 24px rgba(0,0,0,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (canInteract && !isVotedFor) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-600)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        }
      }}
    >
      {/* Confetti */}
      <ConfettiBurst active={showConfetti} color="var(--color-accent-green)" originX={0.5} originY={0.4} />

      {/* Photo */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1/1',
          background: 'var(--color-surface-900)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.35s ease',
            }}
            className="group-hover:scale-105"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
            }}
          >
            🎭
          </div>
        )}
        {/* Gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)',
          }}
        />

        {/* Voted badge */}
        {isVotedFor && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'var(--color-accent-green)',
              color: '#0b0d12',
              fontSize: '9px',
              fontWeight: '900',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: '6px',
              animation: 'cardWin 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            YOUR VOTE ✓
          </div>
        )}

        {/* Hover vote hint */}
        {canInteract && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(56,97,255,0.0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            className="group-hover:bg-brand-600/20"
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: 'white',
                background: 'rgba(0,0,0,0.6)',
                padding: '6px 14px',
                borderRadius: '20px',
                backdropFilter: 'blur(4px)',
                opacity: 0,
                transition: 'opacity 0.2s',
                letterSpacing: '0.05em',
              }}
              className="group-hover:opacity-100"
            >
              Vote →
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px' }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: '700',
            color: isVotedFor ? 'var(--color-accent-green)' : 'white',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </p>
        {username && (
          <p
            style={{
              fontSize: '10px',
              color: 'rgb(107,114,128)',
              margin: '2px 0 0',
              fontWeight: '500',
            }}
          >
            @{username}
          </p>
        )}
        {description && (
          <p
            style={{
              fontSize: '11px',
              color: 'rgb(107,114,128)',
              margin: '6px 0 0',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.4',
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
