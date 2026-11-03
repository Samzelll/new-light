"use client";

import { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/hooks/useAuth';
import { getPublicUrl } from '@/services/storageService';
import { formatPercentage } from '@/utils/formatters';
import { supabase } from '@/services/supabase';
import { LazyImage } from '@/components/common/LazyImage';

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
  const [voteToast, setVoteToast] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; desc?: string } | null>(null);

  const showToast = (msg: string) => {
    setVoteToast(msg);
    setTimeout(() => setVoteToast(null), 3000);
  };

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
      showToast('Vote counted!');
    } else {
      showToast(error);
    }
    setVoting(false);
  };

  const getPercent = (partId: string) => {
    if (totals.total === 0) return 50;
    return ((totals[partId] || 0) / totals.total) * 100;
  };

  if (participants.length < 2) {
    return (
      <div className="rounded-2xl text-center py-10 bg-surface border border-line text-ink font-sans">
        <div className="text-3xl mb-2">⚔️</div>
        <h3 className="text-ink font-bold text-lg mb-1 font-display">Battle Match Configuration</h3>
        <p className="text-muted text-xs max-w-sm mx-auto">
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
    <div className="space-y-8 relative font-sans">
      {voteToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-2 border border-accent text-accent text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
          {voteToast}
        </div>
      )}
      {/* Lightbox / High Res Photo View */}
      {previewPhoto && (
        <div 
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-scrim backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="max-w-2xl w-full bg-surface-2 border border-line rounded-2xl overflow-hidden shadow-2xl relative text-ink"
          >
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface text-ink font-bold flex items-center justify-center hover:bg-surface-2 border border-line"
            >
              ✕
            </button>
            <div className="max-h-[60vh] bg-bg overflow-hidden flex items-center justify-center relative min-h-[200px]">
              <LazyImage src={previewPhoto.url} alt={previewPhoto.title} fill className="object-contain" priority sizes="100vw" />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-bold text-ink mb-2 font-display">{previewPhoto.title}</h3>
              {previewPhoto.desc ? (
                <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{previewPhoto.desc}</p>
              ) : (
                <p className="text-xs text-faint italic">No description provided for this item.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Challenger 1 */}
        <div 
          className={`rounded-2xl bg-surface border p-6 flex flex-col items-center justify-between text-center relative transition-all duration-300 origin-center ${
            votedId === p1.id ? 'scale-[0.88] border-side-a ring-2 ring-side-a/50 shadow-lg shadow-side-a/20 z-10' : 'border-line'
          }`}
        >
          <div className="w-full flex flex-col items-center">
            <div 
              onClick={() => setPreviewPhoto({ url: p1Photo, title: p1Name, desc: p1Desc })}
              className="aspect-square w-full max-w-[260px] rounded-2xl bg-surface-2 border border-line overflow-hidden mb-4 relative shadow-lg group cursor-pointer"
            >
              <LazyImage src={p1Photo} alt={p1Name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="260px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
              {votedId === p1.id && (
                <span className="absolute bottom-3 left-3 text-[10px] font-bold bg-side-a text-on-accent px-2.5 py-1 rounded-md uppercase tracking-wider shadow flex items-center gap-1 backdrop-blur-xs">
                  <span>✓ Selected</span>
                  <span className="border-l border-on-accent/30 pl-1">{formatPercentage(p1Percent)}</span>
                </span>
              )}
              <span className="absolute top-3 right-3 text-[10px] bg-scrim text-ink px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-line">
                🔍 View Photo
              </span>
            </div>

            <h3 className="text-xl font-bold text-ink mb-2 font-display">{p1Name}</h3>
            
            {p1Desc && (
              <p className="text-xs text-muted mb-4 px-2 line-clamp-3 leading-relaxed bg-surface-2 p-2.5 rounded-lg border border-line w-full text-left">
                {p1Desc}
              </p>
            )}

            <div className="my-2">
              <span className={`text-3xl font-bold tracking-tight font-display ${votedId === p1.id ? 'text-side-a' : 'text-ink'}`}>
                {formatPercentage(p1Percent)}
              </span>
              <span className="block text-[10px] uppercase font-bold text-muted mt-0.5">Current Votes</span>
            </div>
          </div>

          <button
            onClick={() => handleVote(p1.id)}
            disabled={!isAuthenticated || !!votedId || voting}
            className={`w-full mt-4 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              votedId === p1.id
                ? 'bg-side-a text-on-accent'
                : !votedId && isAuthenticated
                ? 'bg-accent-solid hover:bg-accent-hover text-white shadow-md'
                : 'bg-surface-2 text-faint border border-line cursor-not-allowed'
            }`}
          >
            {votedId === p1.id ? '✓ Selected' : votedId ? 'Vote Recorded' : 'Vote for Competitor'}
          </button>
        </div>

        {/* Challenger 2 */}
        <div 
          className={`rounded-2xl bg-surface border p-6 flex flex-col items-center justify-between text-center relative transition-all duration-300 origin-center ${
            votedId === p2.id ? 'scale-[0.88] border-side-b ring-2 ring-side-b/50 shadow-lg shadow-side-b/20 z-10' : 'border-line'
          }`}
        >
          <div className="w-full flex flex-col items-center">
            <div 
              onClick={() => setPreviewPhoto({ url: p2Photo, title: p2Name, desc: p2Desc })}
              className="aspect-square w-full max-w-[260px] rounded-2xl bg-surface-2 border border-line overflow-hidden mb-4 relative shadow-lg group cursor-pointer"
            >
              <LazyImage src={p2Photo} alt={p2Name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="260px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
              {votedId === p2.id && (
                <span className="absolute bottom-3 right-3 text-[10px] font-bold bg-side-b text-on-side-b px-2.5 py-1 rounded-md uppercase tracking-wider shadow flex items-center gap-1 backdrop-blur-xs">
                  <span>✓ Selected</span>
                  <span className="border-l border-on-side-b/30 pl-1">{formatPercentage(p2Percent)}</span>
                </span>
              )}
              <span className="absolute top-3 left-3 text-[10px] bg-scrim text-ink px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity border border-line">
                🔍 View Photo
              </span>
            </div>

            <h3 className="text-xl font-bold text-ink mb-2 font-display">{p2Name}</h3>
            
            {p2Desc && (
              <p className="text-xs text-muted mb-4 px-2 line-clamp-3 leading-relaxed bg-surface-2 p-2.5 rounded-lg border border-line w-full text-left">
                {p2Desc}
              </p>
            )}

            <div className="my-2">
              <span className={`text-3xl font-bold tracking-tight font-display ${votedId === p2.id ? 'text-side-b' : 'text-ink'}`}>
                {formatPercentage(p2Percent)}
              </span>
              <span className="block text-[10px] uppercase font-bold text-muted mt-0.5">Current Votes</span>
            </div>
          </div>

          <button
            onClick={() => handleVote(p2.id)}
            disabled={!isAuthenticated || !!votedId || voting}
            className={`w-full mt-4 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              votedId === p2.id
                ? 'bg-side-b text-on-side-b'
                : !votedId && isAuthenticated
                ? 'bg-accent-solid hover:bg-accent-hover text-white shadow-md'
                : 'bg-surface-2 text-faint border border-line cursor-not-allowed'
            }`}
          >
            {votedId === p2.id ? '✓ Selected' : votedId ? 'Vote Recorded' : 'Vote for Competitor'}
          </button>
        </div>
      </div>

      {/* Mid Split Percentage Indicator */}
      <div className="rounded-2xl bg-surface border border-line p-3.5 text-ink">
        <div className="flex justify-between items-center text-xs font-bold tracking-wide">
          <span className={`flex items-center gap-1.5 ${votedId === p1.id ? 'text-side-a' : 'text-muted'}`}>
            <span className={`w-2 h-2 rounded-full ${votedId === p1.id ? 'bg-side-a' : 'bg-line-strong'}`}></span>
            {p1Name} · {formatPercentage(p1Percent)}
          </span>
          <span className={`flex items-center gap-1.5 ${votedId === p2.id ? 'text-side-b' : 'text-muted'}`}>
            {formatPercentage(p2Percent)} · {p2Name}
            <span className={`w-2 h-2 rounded-full ${votedId === p2.id ? 'bg-side-b' : 'bg-line-strong'}`}></span>
          </span>
        </div>
      </div>
    </div>
  );
}
