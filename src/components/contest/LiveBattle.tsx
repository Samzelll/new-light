"use client";

import { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { formatPercentage } from '@/utils/formatters';
import { supabase } from '@/services/supabase';

interface LiveBattleProps {
  contestId: string;
  participants: any[];
  userTrustScore: number;
}

export function LiveBattle({ contestId, participants, userTrustScore }: LiveBattleProps) {
  const { isAuthenticated } = useAuth();
  const { voteInGroup } = useVote();
  const [votes, setVotes] = useState<any[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; desc?: string } | null>(null);

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
    if (totals.total === 0) return 50;
    return ((totals[partId] || 0) / totals.total) * 100;
  };

  if (participants.length < 2) {
    return (
      <div className="card text-center py-10 bg-surface-800 border-surface-700">
        <div className="text-3xl mb-2">⚔️</div>
        <h3 className="text-white font-bold text-lg mb-1">Battle Match Configuration</h3>
        <p className="text-gray-400 text-xs max-w-sm mx-auto">
          {participants.length === 1
            ? '1 competitor is ready. Add a second competitor using Creator Options below to launch the 1v1 battle match!'
            : 'No competitors added yet. Use the Creator Options below to add both battle competitors with photos and item descriptions.'}
        </p>
      </div>
    );
  }

  const p1 = participants[0];
  const p2 = participants[1];

  const p1Name = p1.submission_data?.name || p1.profiles?.display_name || p1.profiles?.username || 'Competitor 1';
  const p2Name = p2.submission_data?.name || p2.profiles?.display_name || p2.profiles?.username || 'Competitor 2';

  const p1Photo = getPublicUrl('submissions', p1.submission_data?.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600');
  const p2Photo = getPublicUrl('submissions', p2.submission_data?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600');

  const p1Desc = p1.submission_data?.description;
  const p2Desc = p2.submission_data?.description;

  const p1Percent = getPercent(p1.id);
  const p2Percent = getPercent(p2.id);

  return (
    <div className="space-y-8">
      {/* Lightbox / High Res Photo View */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-2xl w-full bg-surface-800 border border-surface-600 rounded-2xl overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white font-bold flex items-center justify-center hover:bg-black/80"
            >
              ✕
            </button>
            <div className="max-h-[60vh] bg-black overflow-hidden flex items-center justify-center">
              <img src={previewPhoto.url} alt={previewPhoto.title} className="max-h-[60vh] object-contain w-full" />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-2">{previewPhoto.title}</h3>
              {previewPhoto.desc ? (
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{previewPhoto.desc}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">No description provided for this item.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Challenger 1 */}
        <div 
          className={`card bg-surface-800 border-surface-600 p-6 flex flex-col items-center justify-between text-center relative ${
            votedId === p1.id ? 'border-accent-red ring-2 ring-accent-red/30' : ''
          }`}
        >
          <div className="w-full flex flex-col items-center">
            <div 
              onClick={() => setPreviewPhoto({ url: p1Photo, title: p1Name, desc: p1Desc })}
              className="aspect-square w-full max-w-[260px] rounded-2xl bg-surface-900 border border-surface-700 overflow-hidden mb-4 relative shadow-lg group cursor-pointer"
            >
              <img src={p1Photo} alt={p1Name} loading="lazy" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
              <span className="absolute bottom-3 left-3 text-[10px] font-extrabold bg-accent-red text-white px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
                RED CORNER
              </span>
              <span className="absolute top-3 right-3 text-[10px] bg-black/60 text-gray-200 px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 View Photo
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white mb-2">{p1Name}</h3>
            
            {p1Desc && (
              <p className="text-xs text-gray-300 mb-4 px-2 line-clamp-3 leading-relaxed bg-surface-900/60 p-2.5 rounded-lg border border-surface-700/50 w-full text-left">
                {p1Desc}
              </p>
            )}

            <div className="my-2">
              <span className="text-3xl font-black text-accent-red tracking-tight">{formatPercentage(p1Percent)}</span>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mt-0.5">Current Votes</span>
            </div>
          </div>

          <button
            onClick={() => handleVote(p1.id)}
            disabled={!isAuthenticated || !!votedId || voting}
            className={`w-full mt-4 btn text-xs py-3 font-extrabold uppercase tracking-wider transition-all ${
              votedId === p1.id
                ? 'bg-accent-red text-white'
                : !votedId && isAuthenticated
                ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white border border-accent-red/40'
                : 'bg-surface-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {votedId === p1.id ? '✓ Voted Red Corner' : votedId ? 'Vote Recorded' : 'Vote Red Corner 🥊'}
          </button>
        </div>

        {/* Challenger 2 */}
        <div 
          className={`card bg-surface-800 border-surface-600 p-6 flex flex-col items-center justify-between text-center relative ${
            votedId === p2.id ? 'border-accent-green ring-2 ring-accent-green/30' : ''
          }`}
        >
          <div className="w-full flex flex-col items-center">
            <div 
              onClick={() => setPreviewPhoto({ url: p2Photo, title: p2Name, desc: p2Desc })}
              className="aspect-square w-full max-w-[260px] rounded-2xl bg-surface-900 border border-surface-700 overflow-hidden mb-4 relative shadow-lg group cursor-pointer"
            >
              <img src={p2Photo} alt={p2Name} loading="lazy" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
              <span className="absolute bottom-3 right-3 text-[10px] font-extrabold bg-accent-green text-surface-900 px-2.5 py-1 rounded-md uppercase tracking-wider shadow">
                BLUE CORNER
              </span>
              <span className="absolute top-3 left-3 text-[10px] bg-black/60 text-gray-200 px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 View Photo
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-white mb-2">{p2Name}</h3>
            
            {p2Desc && (
              <p className="text-xs text-gray-300 mb-4 px-2 line-clamp-3 leading-relaxed bg-surface-900/60 p-2.5 rounded-lg border border-surface-700/50 w-full text-left">
                {p2Desc}
              </p>
            )}

            <div className="my-2">
              <span className="text-3xl font-black text-accent-green tracking-tight">{formatPercentage(p2Percent)}</span>
              <span className="block text-[10px] uppercase font-bold text-gray-400 mt-0.5">Current Votes</span>
            </div>
          </div>

          <button
            onClick={() => handleVote(p2.id)}
            disabled={!isAuthenticated || !!votedId || voting}
            className={`w-full mt-4 btn text-xs py-3 font-extrabold uppercase tracking-wider transition-all ${
              votedId === p2.id
                ? 'bg-accent-green text-surface-900'
                : !votedId && isAuthenticated
                ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-surface-900 border border-accent-green/40'
                : 'bg-surface-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {votedId === p2.id ? '✓ Voted Blue Corner' : votedId ? 'Vote Recorded' : 'Vote Blue Corner 🥊'}
          </button>
        </div>
      </div>

      {/* Mid Split Percentage Indicator */}
      <div className="space-y-2 card bg-surface-800 border-surface-700 p-4">
        <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-wider">
          <span className="text-accent-red flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-red"></span>
            {p1Name} ({formatPercentage(p1Percent)})
          </span>
          <span className="text-accent-green flex items-center gap-1.5">
            {p2Name} ({formatPercentage(p2Percent)})
            <span className="w-2.5 h-2.5 rounded-full bg-accent-green"></span>
          </span>
        </div>
        <div className="h-5 w-full rounded-full overflow-hidden flex bg-surface-900 border border-surface-700 shadow-inner p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-accent-red to-accent-red/80 rounded-l-full transition-all duration-500"
            style={{ width: `${p1Percent}%` }}
          />
          <div 
            className="h-full bg-gradient-to-r from-accent-green/80 to-accent-green rounded-r-full transition-all duration-500"
            style={{ width: `${p2Percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
