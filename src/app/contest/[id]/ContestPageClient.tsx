"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getContestById, Contest, updateContestStatus } from '@/services/contestService';
import { getParticipants, Participant, addBattleParticipant, deleteParticipant } from '@/services/participantService';
import { castVote } from '@/services/voteService';
import { supabase } from '@/services/supabase';
import { BattleVoteView } from '@/components/contest/BattleVoteView';
import { ContestPage as RegistrationContestPage } from '@/components/contest/RegistrationContestPage';

const LiveBattle = dynamic(
  () => import('@/components/contest/LiveBattle').then((mod) => mod.LiveBattle),
  {
    loading: () => (
      <div className="card bg-surface-800 border-surface-600 p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-surface-700 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-64 bg-surface-700 rounded-xl" />
          <div className="h-64 bg-surface-700 rounded-xl" />
        </div>
      </div>
    ),
    ssr: false,
  }
);


function feedListingLabel(value: string) {
  switch (value) {
    case 'approved': return <span className="badge bg-accent-green/20 text-accent-green border-accent-green/30">Approved</span>;
    case 'pending': return <span className="badge bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</span>;
    case 'rejected': return <span className="badge bg-red-500/20 text-red-400 border-red-500/30">Rejected</span>;
    default: return <span className="badge bg-surface-700 text-gray-400 border-surface-600">Hidden</span>;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'draft': return <span className="badge bg-surface-700 text-gray-400">Draft</span>;
    case 'registration': return <span className="badge bg-brand-500 text-white shadow-[0_0_10px_rgba(var(--brand-500-rgb),0.5)]">Registration Open</span>;
    case 'active': return <span className="badge bg-accent-blue text-white shadow-[0_0_10px_rgba(var(--accent-blue-rgb),0.5)] font-bold">Active Voting</span>;
    case 'paused': return <span className="badge bg-yellow-500 text-black font-extrabold">⏸️ Paused / Приостановлен</span>;
    case 'blocked': return <span className="badge bg-red-600 text-white font-extrabold shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse">⚠️ Caution / Заблокирован</span>;
    case 'completed': return <span className="badge bg-accent-green text-surface-900 font-bold">Completed</span>;
    case 'cancelled': return <span className="badge bg-red-500 text-white">Cancelled</span>;
    default: return <span className="badge">{status}</span>;
  }
}

export default function ContestPageClient({ id: propId }: { id?: string }) {
  const routeParams = useParams();
  const id = (typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : propId) || '';

  const { user, isAuthenticated } = useAuth();

  const [contest, setContest] = useState<Contest | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<{ id: string; participant_id: string; voter_id: string }[]>([]);
  const [userVotedParticipantId, setUserVotedParticipantId] = useState<string | null>(null);
  const [submittingVoteId, setSubmittingVoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Creator Battle Competitor modal / inline form state
  const [showAddBattleModal, setShowAddBattleModal] = useState(false);
  const [newBattleCompName, setNewBattleCompName] = useState('');
  const [newBattleCompPhoto, setNewBattleCompPhoto] = useState('');
  const [newBattleCompDesc, setNewBattleCompDesc] = useState('');
  const [addingBattleComp, setAddingBattleComp] = useState(false);

  const isCreator = Boolean(user && contest && (contest.created_by === user.id || user.email === 'samzelenkov@gmail.com'));

  const reloadParticipants = async () => {
    const { data: participantsData } = await getParticipants(id, 'all');
    setParticipants(participantsData || []);
  };

  const handleDeleteCompetitor = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant / competitor?')) return;
    const { success, error: delErr } = await deleteParticipant(participantId);
    if (success) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      await reloadParticipants();
    } else if (delErr) {
      alert(delErr);
    }
  };

  const handleAddBattleCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBattleCompName.trim() || !newBattleCompPhoto.trim()) {
      alert('Please provide both a competitor name and photo image URL.');
      return;
    }
    if (!contest) return;

    setAddingBattleComp(true);
    const { data: newPart, error: addErr } = await addBattleParticipant({
      contestId: contest.id,
      name: newBattleCompName.trim(),
      photoUrl: newBattleCompPhoto.trim(),
      description: newBattleCompDesc.trim(),
    });

    if (addErr) {
      alert(addErr);
    } else {
      setNewBattleCompName('');
      setNewBattleCompPhoto('');
      setNewBattleCompDesc('');
      setShowAddBattleModal(false);
      await reloadParticipants();
    }
    setAddingBattleComp(false);
  };

  const handleChangeStatus = async (newStatus: any) => {
    if (!contest) return;
    const { error: statusErr } = await updateContestStatus(contest.id, newStatus);
    if (statusErr) {
      alert(statusErr);
    } else {
      setContest((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      
      const { data: contestData, error: contestError } = await getContestById(id);
      if (contestError || !contestData) {
        setError(contestError || 'Contest not found');
        setLoading(false);
        return;
      }
      setContest(contestData);

      const { data: participantsData } = await getParticipants(id, 'approved');
      setParticipants(participantsData || []);

      // Fetch votes
      try {
        const { data: votesData } = await supabase
          .from('votes')
          .select('id, participant_id, voter_id')
          .eq('contest_id', id);

        if (votesData) {
          setVotes(votesData);
          if (user) {
            const myVote = votesData.find((v: any) => v.voter_id === user.id);
            if (myVote) setUserVotedParticipantId(myVote.participant_id);
          }
        }
      } catch (err) {
        console.warn('Votes fetch exception:', err);
      }
      
      setLoading(false);
    }
    loadData();
  }, [id, user]);

  const userHasApplied = user ? participants.some((p) => p.user_id === user.id) : false;

  const handleCastVote = async (participantId: string) => {
    if (!isAuthenticated || !user) {
      alert('Please sign in to vote in this contest.');
      return;
    }
    if (userVotedParticipantId) {
      alert('You have already cast your vote in this contest.');
      return;
    }

    setSubmittingVoteId(participantId);
    const { error: voteErr } = await castVote({
      contestId: id,
      stageId: id,
      groupId: id,
      participantId,
      trustWeight: 1.0,
    });

    if (voteErr) {
      alert(voteErr);
    } else {
      setUserVotedParticipantId(participantId);
      setVotes((prev) => [
        ...prev,
        { id: `local_${Date.now()}`, participant_id: participantId, voter_id: user.id },
      ]);
    }
    setSubmittingVoteId(null);
  };

  const totalVotes = votes.length;
  const getParticipantVoteCount = (pId: string) => votes.filter((v) => v.participant_id === pId).length;
  const getParticipantVotePercent = (pId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round((getParticipantVoteCount(pId) / totalVotes) * 100);
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in pb-24">
        <div className="card skeleton h-40"></div>
        <div className="card skeleton h-64"></div>
      </main>
    );
  }

  if (error || !contest) {
    return (
      <main className="max-w-4xl mx-auto p-4 pb-24">
        <div className="card text-center p-8 text-gray-400">
          <div className="text-4xl mb-4">⚠️</div>
          <div>{error || 'Contest not found'}</div>
          <Link href="/" className="btn btn-secondary mt-4 inline-block">Back to Feed</Link>
        </div>
      </main>
    );
  }

  // Registration Open status page (dedicated mobile-first view)
  if (contest.status === 'registration') {
    return (
      <RegistrationContestPage
        contest={contest}
        participants={participants}
        userHasApplied={userHasApplied}
      />
    );
  }

  // Pure 1v1 Battle View (Pinterest-style game-like arena)
  if (contest.type === 'battle') {
    return <BattleVoteView initialContestId={contest.id} />;
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-8 animate-fade-in bg-[#000000] text-[#F9F9F9]">
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#F9F9F9] bg-[#141414] hover:bg-[#222222] border border-[#333333] px-3.5 py-2 rounded-xl transition-all"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Назад в ленту</span>
        </Link>
        <Link
          href="/search"
          aria-label="Поиск"
          className="w-9 h-9 rounded-xl bg-[#141414] hover:bg-[#222222] text-[#F9F9F9] flex items-center justify-center transition-colors border border-[#333333]"
        >
          <Search size={16} strokeWidth={2} />
        </Link>
      </div>

      {/* Contest Header */}
      <div className="card flex flex-col gap-4 relative overflow-hidden bg-surface-800 border-surface-600 p-6 sm:p-8">
        {contest.cover_url && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${contest.cover_url})`, filter: 'blur(20px)' }}
          />
        )}
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center text-xs font-semibold mb-2">
              {statusLabel(contest.status)}
              {contest.feed_listing_status ? feedListingLabel(contest.feed_listing_status) : null}
              <span className="text-gray-400 uppercase tracking-wider">{contest.type} Format</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{contest.title}</h1>
            <p className="text-gray-300 max-w-2xl text-sm sm:text-base leading-relaxed">
              {contest.description || 'No description provided.'}
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {userHasApplied ? (
              <span className="badge bg-accent-green/20 text-accent-green border-accent-green/30 py-2 px-3 text-xs font-bold">
                ✓ Entry Submitted
              </span>
            ) : contest.status === 'active' ? (
              <Link href={`/apply/${contest.id}`} className="btn btn-primary text-xs py-2.5 px-5 font-bold shadow-lg">
                + Register Entry
              </Link>
            ) : null}
            <Link href="/" className="btn btn-secondary text-xs py-2.5 px-4">
              Feed
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 relative z-10 border-t border-surface-700 pt-4 text-xs font-semibold">
          {contest.categories && (
            <span className="badge bg-surface-900 text-gray-300 border-surface-700">
              📁 {contest.categories.name}
            </span>
          )}
          <span className="badge bg-surface-900 text-gray-300 border-surface-700">
            👥 Participants · {participants.length}{contest.max_participants ? ` / ${contest.max_participants}` : ''}
          </span>
          <span className="badge bg-surface-900 text-gray-300 border-surface-700">
            🗳️ Total Votes · {totalVotes}
          </span>
        </div>
      </div>

      {/* Creator Controls Panel */}
      {isCreator && (
        <div className="card bg-surface-800 border-brand-500/40 p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-surface-700 pb-3">
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>🛠️</span> Управление конкурсом (Панель создателя)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Вы можете изменять статус конкурса (активен, приостановлен, заблокирован/осторожно) и управлять участниками.
              </p>
            </div>
            <span className="badge bg-brand-500/20 text-brand-400 border-brand-500/30 text-xs font-bold shrink-0 self-start sm:self-auto">
              Организатор
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
              Статус конкурса:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleChangeStatus('active')}
                className={`btn text-xs py-2 px-3 font-bold ${
                  contest.status === 'active'
                    ? 'bg-accent-blue text-white shadow'
                    : 'bg-surface-700 hover:bg-surface-600 text-gray-300'
                }`}
              >
                ▶️ Активен (Голосование)
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('registration')}
                className={`btn text-xs py-2 px-3 font-bold ${
                  (contest.status as string) === 'registration'
                    ? 'bg-brand-600 text-white shadow'
                    : 'bg-surface-700 hover:bg-surface-600 text-gray-300'
                }`}
              >
                📝 Открыта регистрация
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('paused')}
                className={`btn text-xs py-2 px-3 font-bold ${
                  contest.status === 'paused'
                    ? 'bg-yellow-500 text-black shadow'
                    : 'bg-surface-700 hover:bg-yellow-500/20 hover:text-yellow-300 text-gray-300'
                }`}
              >
                ⏸️ Приостановить (Paused)
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('blocked')}
                className={`btn text-xs py-2 px-3 font-bold ${
                  contest.status === 'blocked'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-surface-700 hover:bg-red-500/20 hover:text-red-300 text-gray-300'
                }`}
              >
                ⚠️ Заблокировать / Осторожно (Blocked)
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('completed')}
                className={`btn text-xs py-2 px-3 font-bold ${
                  contest.status === 'completed'
                    ? 'bg-accent-green text-surface-900 shadow'
                    : 'bg-surface-700 hover:bg-surface-600 text-gray-300'
                }`}
              >
                🏁 Завершен
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner: Blocked / Caution */}
      {contest.status === 'blocked' && (
        <div className="card bg-red-500/15 border-red-500/40 p-5 flex items-start gap-3.5 text-red-200 shadow-xl">
          <span className="text-3xl shrink-0">⚠️</span>
          <div>
            <h4 className="font-extrabold text-red-400 text-sm uppercase tracking-wide">
              ВНИМАНИЕ: КОНКУРС ЗАБЛОКИРОВАН / «ОСТОРОЖНО»
            </h4>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
              Этот конкурс заблокирован или приостановлен администрацией/создателем. Прием заявок и голосование недоступны. Он скрыт из общей ленты и доступен только по прямому поиску или в избранном с плашкой «⚠️ Осторожно».
            </p>
          </div>
        </div>
      )}

      {/* Warning Banner: Paused */}
      {contest.status === 'paused' && (
        <div className="card bg-yellow-500/15 border-yellow-500/40 p-5 flex items-start gap-3.5 text-yellow-200 shadow-xl">
          <span className="text-3xl shrink-0">⏸️</span>
          <div>
            <h4 className="font-extrabold text-yellow-400 text-sm uppercase tracking-wide">
              КОНКУРС ПРИОСТАНОВЛЕН
            </h4>
            <p className="text-xs text-yellow-200/90 mt-1 leading-relaxed">
              Голосование и подача новых заявок временно приостановлены организатором конкурса.
            </p>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Registration Notice */}
          {(contest.status as string) === 'registration' && (
            <div className="card border-brand-500/30 bg-brand-500/10 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">Registration is Open!</h3>
                <p className="text-sm text-gray-300 mt-0.5">Submit your entry now to compete in this contest.</p>
              </div>
              {!userHasApplied ? (
                <Link href={`/apply/${contest.id}`} className="btn btn-primary text-xs px-5 py-2.5 font-bold shrink-0">
                  Register Entry Now →
                </Link>
              ) : (
                <span className="text-xs font-bold text-accent-green">✓ You are entered</span>
              )}
            </div>
          )}

          {/* Battle Format is handled by BattleVoteView */}
          {false && contest && (
            <div className="space-y-6">
              <LiveBattle contestId={(contest as any)?.id || ''} participants={participants} userTrustScore={1.0} />

              {/* Creator Options: Battle Competitors Management */}
              <div className="card bg-surface-800 border-surface-600 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-surface-700 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>⚔️</span> Creator Options: Battle Competitors
                    </h4>
                    <p className="text-xs text-gray-400">
                      Directly add or manage competitors for this 1v1 battle match. ({participants.length} added)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddBattleModal(!showAddBattleModal)}
                    className="btn btn-primary text-xs py-1.5 px-3 font-bold shrink-0 self-start sm:self-auto"
                  >
                    {showAddBattleModal ? 'Close Form' : '+ Add Competitor'}
                  </button>
                </div>

                {showAddBattleModal && (
                  <form onSubmit={handleAddBattleCompetitor} className="p-4 rounded-xl bg-surface-900 border border-brand-500/30 space-y-4 animate-fade-in">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-brand-400">New Battle Competitor Entry</h5>
                    
                    <div>
                      <label className="label text-[11px] text-gray-400 block mb-1 font-semibold">Item / Competitor Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Red Corner Fighter / Item A"
                        value={newBattleCompName}
                        onChange={(e) => setNewBattleCompName(e.target.value)}
                        className="input text-xs py-2"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="label text-[11px] text-gray-400 block font-semibold">Competitor Photo *</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5 font-medium">
                          <span>📷</span> Upload Image File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (uploadEvent) => {
                                  const dataUrl = uploadEvent.target?.result as string;
                                  if (dataUrl) setNewBattleCompPhoto(dataUrl);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <span className="text-[10px] text-gray-500 uppercase font-semibold">or paste URL:</span>
                      </div>

                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={newBattleCompPhoto}
                        onChange={(e) => setNewBattleCompPhoto(e.target.value)}
                        className="input text-xs py-2 font-mono text-[11px]"
                        required
                      />

                      {/* Sample photo presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-gray-400 self-center">Sample Photos:</span>
                        {[
                          { label: '🏋️ Combat', url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600' },
                          { label: '👟 Sneakers', url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600' },
                          { label: '🎮 Gaming', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600' },
                          { label: '🍕 Gourmet', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setNewBattleCompPhoto(preset.url)}
                            className="px-2 py-0.5 rounded text-[10px] bg-surface-700 hover:bg-surface-600 text-gray-300 font-medium"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {newBattleCompPhoto && (
                      <div className="aspect-square w-32 rounded-xl overflow-hidden bg-surface-900 border border-surface-700 relative shadow-inner">
                        <img src={newBattleCompPhoto} alt="Preview" className="object-cover w-full h-full" />
                      </div>
                    )}

                    <div>
                      <label className="label text-[11px] text-gray-400 block mb-1 font-semibold">Item Description / Story / Stats</label>
                      <textarea
                        rows={3}
                        placeholder="Describe key features, backstory, specs or stats of this competitor..."
                        value={newBattleCompDesc}
                        onChange={(e) => setNewBattleCompDesc(e.target.value)}
                        className="input text-xs py-2 resize-y"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBattleModal(false)}
                        className="btn btn-secondary text-xs py-1.5 px-3 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary text-xs py-1.5 px-4 font-bold"
                        disabled={addingBattleComp}
                      >
                        {addingBattleComp ? 'Adding Competitor...' : 'Add Competitor Now'}
                      </button>
                    </div>
                  </form>
                )}

                {/* List of currently added competitors */}
                {participants.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Current Competitors List ({participants.length})</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {participants.map((p, i) => {
                        const name = p.submission_data?.name || `Competitor ${i + 1}`;
                        const photo = p.submission_data?.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500';
                        const desc = p.submission_data?.description;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-900 border border-surface-700 gap-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img src={photo} alt={name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-surface-700" />
                              <div className="truncate">
                                <h6 className="font-bold text-white text-xs truncate">{name}</h6>
                                {desc && <p className="text-[11px] text-gray-400 truncate">{desc}</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteCompetitor(p.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1 hover:bg-red-500/10 rounded transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Standard Participants & Voting */}
          {true && (
            <div className="card bg-surface-800 border-surface-600 p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-surface-700 pb-4">
                <h3 className="text-xl font-bold text-white">
                  Contest Entries
                </h3>
                <span className="text-xs font-semibold text-gray-400">
                  {participants.length} total entries · {totalVotes} votes cast
                </span>
              </div>

              {userVotedParticipantId && (
                <div className="p-3 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>✓</span> You have voted in this contest. Votes are updated live!
                </div>
              )}

              {participants.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-surface-600 rounded-xl bg-surface-900/50 space-y-3">
                  <div className="text-4xl text-surface-400">📷</div>
                  <p className="text-gray-400 text-sm">No entries submitted yet.</p>
                  <Link href={`/apply/${contest.id}`} className="btn btn-primary text-xs inline-block py-2 px-4 font-bold">
                    Be the First to Apply!
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {participants.map((p) => {
                    const photoUrl = p.submission_data.photos?.[0];
                    const name = p.profiles?.display_name || p.profiles?.username || 'Participant';
                    const isVotedFor = userVotedParticipantId === p.id;
                    const count = getParticipantVoteCount(p.id);
                    const percent = getParticipantVotePercent(p.id);

                    return (
                      <div
                        key={p.id}
                        className={`card bg-surface-900 border p-4 space-y-3 flex flex-col justify-between transition-all ${
                          isVotedFor
                            ? 'border-brand-500 ring-2 ring-brand-500/40'
                            : 'border-surface-700 hover:border-surface-500'
                        }`}
                      >
                        {/* Image */}
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-surface-800 border border-surface-700">
                          {photoUrl ? (
                            <img src={photoUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                              No Photo
                            </div>
                          )}

                          {isVotedFor && (
                            <div className="absolute top-2 right-2 bg-brand-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full shadow-lg">
                              Your Vote
                            </div>
                          )}
                        </div>

                        {/* Name & details */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-bold text-white text-sm truncate">{name}</span>
                            {isCreator ? (
                              <button
                                onClick={() => handleDeleteCompetitor(p.id)}
                                className="text-[11px] text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 hover:bg-red-500/10 rounded transition-colors shrink-0"
                              >
                                Remove
                              </button>
                            ) : p.profiles?.username ? (
                              <span className="text-xs text-gray-400 truncate">@{p.profiles.username}</span>
                            ) : null}
                          </div>
                          {p.submission_data.description && (
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {p.submission_data.description}
                            </p>
                          )}
                        </div>

                        {/* Vote bar & Vote Button */}
                        <div className="pt-2 border-t border-surface-800 space-y-2">
                          <div className="flex justify-between items-center text-xs text-gray-300 font-semibold">
                            <span>{count} votes</span>
                            <span>{percent}%</span>
                          </div>

                          <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden border border-surface-700">
                            <div
                              className="bg-brand-500 h-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {(contest.status === 'active' || (contest.status as string) === 'registration') && (
                            <button
                              onClick={() => handleCastVote(p.id)}
                              disabled={!!userVotedParticipantId || submittingVoteId === p.id}
                              className={`btn w-full py-2 text-xs font-bold transition-all ${
                                isVotedFor
                                  ? 'bg-brand-600 text-white cursor-default'
                                  : userVotedParticipantId
                                  ? 'btn-secondary opacity-50 cursor-not-allowed'
                                  : 'btn-primary'
                              }`}
                            >
                              {submittingVoteId === p.id
                                ? 'Casting Vote...'
                                : isVotedFor
                                ? '✓ Voted'
                                : 'Vote for Entry'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card bg-surface-800 border-surface-600 p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Rules & Guidelines</h3>
            <p className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
              {contest.rules || 'No custom rules defined.'}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
