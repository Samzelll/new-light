"use client";

import { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { formatPercentage } from '@/utils/formatters';
import { supabase } from '@/services/supabase';

interface LiveRaceProps {
  contestId: string;
  participants: any[];
  userTrustScore: number;
}

export function LiveRace({ contestId, participants, userTrustScore }: LiveRaceProps) {
  const { isAuthenticated } = useAuth();
  const { voteInGroup } = useVote();
  const [votes, setVotes] = useState<any[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  // Load existing votes for this contest
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

  // Subscribe to live votes
  useRealtime('votes', `contest_id=eq.${contestId}`, (payload) => {
    if (payload.new) {
      setVotes((prev) => [...prev, payload.new]);
    }
  });

  // Calculate percentages
  const totals = votes.reduce(
    (acc, vote) => {
      const weight = Number(vote.trust_weight) || 1.0;
      acc.total += weight;
      acc[vote.participant_id] = (acc[vote.participant_id] || 0) + weight;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const handleVote = async (participantId: string) => {
    if (!isAuthenticated || votedId || voting) return;
    setVoting(true);
    const { error } = await voteInGroup(contestId, contestId, contestId, participantId, userTrustScore);
    if (!error) {
      setVotedId(participantId);
    } else {
      alert(error);
    }
    setVoting(false);
  };

  const getPercent = (partId: string) => {
    if (totals.total === 0) return 0;
    return ((totals[partId] || 0) / totals.total) * 100;
  };

  // Map participants with live rankings
  const rankedParticipants = participants
    .map((p) => ({
      ...p,
      percentage: getPercent(p.id),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white mb-2">Live Race Standings</h3>
      <p className="text-gray-400 text-sm">
        Click on any participant row to cast your vote. Leaderboard updates instantly in real time.
      </p>

      <div className="space-y-4">
        {rankedParticipants.map((p, index) => {
          const name = p.profiles?.display_name || p.profiles?.username || 'Anonymous';
          const avatarUrl = p.profiles?.avatar_url ? getPublicUrl('avatars', p.profiles.avatar_url, { width: 80, quality: 80 }) : null;
          const isVotedFor = votedId === p.id;

          return (
            <div 
              key={p.id}
              onClick={() => handleVote(p.id)}
              className={`card bg-surface-800 border-surface-700 flex flex-col p-4 space-y-3 relative overflow-hidden transition-all duration-200 select-none ${
                !votedId && isAuthenticated ? 'cursor-pointer hover:border-brand-500 hover:shadow-lg' : ''
              } ${isVotedFor ? 'border-brand-500 ring-2 ring-brand-500/30' : ''}`}
            >
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  {/* Position number */}
                  <span className="font-black text-white text-base w-6 text-center">
                    #{index + 1}
                  </span>

                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={name} 
                      className="w-10 h-10 rounded-full object-cover border border-surface-600" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-600 flex items-center justify-center font-bold text-white text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-white text-sm">{name}</h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold text-white">
                    {formatPercentage(p.percentage)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar w-full">
                <div 
                  className={`progress-bar-fill transition-all duration-500 ${isVotedFor ? 'bg-accent-green' : 'bg-brand-500'}`}
                  style={{ width: `${p.percentage}%` }}
                />
              </div>

              {isVotedFor && (
                <div className="absolute top-2 right-2 bg-brand-600 text-white font-bold text-[8px] uppercase px-1.5 py-0.5 rounded shadow">
                  Voted
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
