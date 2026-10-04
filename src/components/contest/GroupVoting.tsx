"use client";

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { Check } from 'lucide-react';

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

  const handleSelect = (participantId: string) => {
    if (hasVoted) return;
    setSelectedId(participantId);
    setConfirmOpen(true);
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
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-2">Cast your vote in this group</h3>
      {hasVoted ? (
        <div className="p-4 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl text-sm">
          ✓ Your vote has been recorded for this group.
        </div>
      ) : (
        <p className="text-gray-400 text-sm">
          Select one participant to cast your vote. All votes are anonymous.
        </p>
      )}

      {error && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 text-accent-red rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className={`card flex flex-col justify-between overflow-hidden relative transition-all duration-200 ${
                hasVoted 
                  ? isVotedFor 
                    ? 'border-brand-500 ring-2 ring-brand-500/50' 
                    : 'opacity-60 border-surface-600'
                  : 'cursor-pointer hover:border-surface-400 hover:shadow-lg'
              }`}
            >
              {/* Submission Image */}
              <div className="relative aspect-square w-full bg-surface-900 rounded-xl overflow-hidden mb-4">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                    No image uploaded
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">
                    {displayName}
                  </span>
                  {p.profiles?.username && (
                    <span className="text-[10px] text-gray-500 font-semibold">
                      @{p.profiles.username}
                    </span>
                  )}
                </div>
                {p.submission_data.description && (
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {p.submission_data.description}
                  </p>
                )}
              </div>

              {/* Status Ribbon */}
              {isVotedFor && (
                <div className="absolute top-3 right-3 bg-brand-600 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded shadow">
                  Your Vote
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && !hasVoted && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-sm bg-surface-800 border border-surface-600 p-6 flex flex-col items-center text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center">
              <Check className="w-6 h-6" strokeWidth={2} />
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white">Confirm your vote</h4>
              <p className="text-gray-400 text-sm mt-2">
                You are about to vote in this group. You can only vote once per group in this stage.
              </p>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn btn-secondary flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVote}
                className="btn btn-primary flex-1"
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
