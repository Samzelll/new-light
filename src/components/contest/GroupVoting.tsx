"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { Check, Maximize2 } from 'lucide-react';
import { PhotoLightbox } from '@/components/common/PhotoLightbox';
import { LazyImage } from '@/components/common/LazyImage';

interface Profile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Participant {
  id: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    photoUrl: string;
    photos?: string[];
    title: string;
    author?: string;
  } | null>(null);

  const handleSelect = (participantId: string) => {
    if (hasVoted) {
      if (votedParticipantId === participantId) {
        handleCancelVote();
      }
      return;
    }
    setSelectedId(participantId);
    setConfirmOpen(true);
  };

  const handleCancelVote = async () => {
    setIsSubmitting(true);
    try {
      const { cancelVote } = await import('@/services/voteService');
      await cancelVote({ contestId, stageId, groupId });
      onVoteSuccess('');
      setSelectedId(null);
    } catch (err: any) {
      console.warn('Cancel vote note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVote = async () => {
    if (!selectedId || !isAuthenticated) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { castVote } = await import('@/services/voteService');
      const { error: voteErr } = await castVote({
        contestId,
        stageId,
        groupId,
        participantId: selectedId,
        trustWeight: trustScore,
      });

      if (voteErr) {
        setError(voteErr);
      } else {
        onVoteSuccess(selectedId);
        setConfirmOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while voting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <h3 className="text-xl font-bold text-ink mb-2 font-display">Cast your vote in this group</h3>
      {hasVoted ? (
        <div className="p-4 bg-accent/15 border border-accent/30 text-accent-soft rounded-xl text-sm flex items-center justify-between gap-3">
          <span>✓ Your vote has been recorded for this group.</span>
          <button
            type="button"
            onClick={handleCancelVote}
            disabled={isSubmitting}
            className="text-xs font-bold text-danger hover:underline shrink-0 transition-colors"
          >
            {isSubmitting ? 'Отмена...' : 'Отменить голос'}
          </button>
        </div>
      ) : (
        <p className="text-muted text-sm">
          Select one participant to cast your vote. All votes are anonymous.
        </p>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Grid: 4 vertically oriented rectangles when 4 participants, maximizing screen presence */}
      <div className={participants.length === 4 ? "grid grid-cols-2 gap-3 sm:gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
        {participants.map((p) => {
          const isSelected = selectedId === p.id;
          const isVotedFor = votedParticipantId === p.id;
          const photoUrl = p.submission_data.photos?.[0] 
            ? getPublicUrl('submissions', p.submission_data.photos[0], { width: 400, quality: 80 })
            : null;
          const displayName = p.profiles?.display_name || p.profiles?.username || 'Anonymous';

          return (
            <div
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`rounded-2xl p-3 bg-surface border flex flex-col justify-between overflow-hidden relative transition-all duration-300 origin-center ${
                (isSelected || isVotedFor) ? 'scale-[0.88] z-10' : ''
              } ${
                hasVoted 
                  ? isVotedFor 
                    ? 'border-accent ring-2 ring-accent/50 shadow-[0_0_25px_rgba(196,165,116,0.3)]' 
                    : 'opacity-60 border-line'
                  : isSelected
                    ? 'border-accent ring-2 ring-accent/50 shadow-[0_0_25px_rgba(196,165,116,0.3)]'
                    : 'border-line cursor-pointer hover:border-line-strong hover:shadow-lg'
              }`}
            >
              {/* Submission Image (Tall vertical rectangle) */}
              <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full bg-surface-2 rounded-xl overflow-hidden mb-3">
                {photoUrl ? (
                  <LazyImage
                    src={photoUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 45vw, 200px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-xs">
                    No image uploaded
                  </div>
                )}

                {/* Inspect Photo Zoom Button */}
                {photoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const submissionPhotos = (p.submission_data.photos || []).map((ph) =>
                        ph.startsWith('http') ? ph : getPublicUrl('submissions', ph, { width: 1200, quality: 85 })
                      );
                      const allPhotos = submissionPhotos.length > 0 ? submissionPhotos : (photoUrl ? [photoUrl] : []);
                      setLightboxData({
                        photoUrl: allPhotos[0] || photoUrl,
                        photos: allPhotos,
                        title: displayName,
                        author: p.profiles?.username ? `@${p.profiles.username}` : undefined,
                      });
                    }}
                    aria-label={`Inspect ${displayName} photo`}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-scrim hover:bg-surface-2 text-ink flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 border border-line"
                  >
                    <Maximize2 size={13} strokeWidth={2.4} />
                  </button>
                )}
              </div>

              {/* Card Footer */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-ink text-xs sm:text-sm truncate font-display">
                    {displayName}
                  </span>
                  {p.profiles?.username && (
                    <span className="text-[10px] text-muted font-semibold truncate ml-1">
                      @{p.profiles.username}
                    </span>
                  )}
                </div>
                {p.submission_data.description && (
                  <p className="text-muted text-[11px] line-clamp-2">
                    {p.submission_data.description}
                  </p>
                )}
              </div>

              {/* Status Ribbon */}
              {isVotedFor && (
                <div className="absolute top-3 left-3 bg-accent text-on-accent font-bold text-[9px] uppercase px-2 py-0.5 rounded shadow">
                  Your Vote
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo Lightbox */}
      {lightboxData && (
        <PhotoLightbox
          isOpen={Boolean(lightboxData)}
          onClose={() => setLightboxData(null)}
          photoUrl={lightboxData.photoUrl}
          photos={lightboxData.photos}
          title={lightboxData.title}
          author={lightboxData.author}
          category="Participant Submission"
        />
      )}

      {/* Confirmation Modal */}
      {confirmOpen && !hasVoted && (
        <div className="fixed inset-0 bg-scrim backdrop-blur-xs flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-surface-2 border border-line rounded-2xl p-6 flex flex-col items-center text-center space-y-6 text-ink">
            <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center">
              <Check className="w-6 h-6" strokeWidth={2} />
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-ink font-display">Confirm your vote</h4>
              <p className="text-muted text-sm mt-2">
                You are about to vote in this group. You can only vote once per group in this stage.
              </p>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-surface border border-line-strong text-ink hover:bg-surface-2 font-bold text-sm transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVote}
                className="flex-1 py-2.5 px-4 rounded-xl bg-accent-solid hover:bg-accent-hover text-white font-bold text-sm transition-colors shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Casting...' : 'Vote Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
