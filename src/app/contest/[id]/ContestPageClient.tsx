"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, MoreHorizontal, Check, Trash2, X, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getContestById, Contest, updateContestStatus } from '@/services/contestService';
import { getParticipants, Participant, addBattleParticipant, deleteParticipant } from '@/services/participantService';
import { castVote, cancelVote } from '@/services/voteService';
import { supabase } from '@/services/supabase';
import { BattleVoteView } from '@/components/contest/BattleVoteView';
import { ContestPage as RegistrationContestPage } from '@/components/contest/RegistrationContestPage';
import { PhotoLightbox } from '@/components/common/PhotoLightbox';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import {
  getPersistedBattleVotes,
  persistBattleVote,
  removePersistedBattleVote,
  getBattle,
} from '@/services/battleDataService';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80';

const DEFAULT_RULES_RU = [
  'Принимаются только пейзажные фото без сильной обработки',
  'Один голос на конкурс, его можно изменить',
  'Голосование бессрочное, работы можно добавлять в любое время',
];

const DEFAULT_RULES_EN = [
  'Only original landscape photos without heavy post-processing are accepted',
  'One vote per contest; can be changed or undone at any time',
  'Ongoing continuous contest: new entries can be added anytime',
];

const DEFAULT_BATTLE_RULES_RU = [
  '1v1 дуэль двух участников в реальном времени',
  'Один голос на дуэль, его можно изменить в любой момент',
  'Статистика и процентный перевес обновляются мгновенно',
];

const DEFAULT_BATTLE_RULES_EN = [
  'Real-time 1v1 duel between two competitors',
  'One vote per duel; can be changed or undone at any time',
  'Live percentages and split update instantly',
];

export default function ContestPageClient({ id: propId }: { id?: string }) {
  const router = useRouter();
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showArenaView, setShowArenaView] = useState(false);

  // Creator direct competitor modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPhoto, setNewCompPhoto] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');
  const [addingComp, setAddingComp] = useState(false);

  const [lightboxData, setLightboxData] = useState<{
    photoUrl: string;
    photos?: string[];
    title: string;
    author?: string;
    authorAvatar?: string;
    authorBio?: string;
    category?: string;
    isSelected?: boolean;
    percentage?: number | string;
    onVote?: () => void;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const isCreator = Boolean(
    user && contest && (contest.created_by === user.id || user.email === 'samzelenkov@gmail.com')
  );

  // Detect Russian/Cyrillic content for adaptive copy matching user screenshots
  const isRu = useMemo(() => {
    if (!contest) return false;
    return /[а-яё]/i.test(contest.title + ' ' + (contest.description || ''));
  }, [contest]);

  const reloadParticipants = async () => {
    const { data: participantsData } = await getParticipants(id, 'all');
    if (participantsData && participantsData.length > 0) {
      setParticipants(participantsData);
    }
  };

  const handleDeleteCompetitor = async (participantId: string) => {
    const { success, error: delErr } = await deleteParticipant(participantId);
    if (success) {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
      await reloadParticipants();
      showToast(isRu ? 'Работа удалена' : 'Entry removed.');
    } else if (delErr) {
      showToast(delErr);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompPhoto.trim()) {
      showToast(isRu ? 'Укажите название и ссылку на фото' : 'Please provide name and photo URL.');
      return;
    }
    if (!contest) return;

    setAddingComp(true);
    const { error: addErr } = await addBattleParticipant({
      contestId: contest.id,
      name: newCompName.trim(),
      photoUrl: newCompPhoto.trim(),
      description: newCompDesc.trim(),
    });

    if (addErr) {
      showToast(addErr);
    } else {
      setNewCompName('');
      setNewCompPhoto('');
      setNewCompDesc('');
      setShowAddModal(false);
      showToast(isRu ? 'Работа успешно добавлена!' : 'Competitor added successfully!');
      await reloadParticipants();
    }
    setAddingComp(false);
  };

  const handleChangeStatus = async (newStatus: any) => {
    if (!contest) return;
    const { error: statusErr } = await updateContestStatus(contest.id, newStatus);
    if (statusErr) {
      showToast(statusErr);
    } else {
      setContest((prev) => (prev ? { ...prev, status: newStatus } : null));
      showToast(isRu ? `Статус обновлен на: ${newStatus}` : `Status updated to ${newStatus}`);
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
      let currentParts = participantsData || [];

      // For battle contests, enrich or synthesize competitors if participant records are empty/fewer than 2
      if (contestData.type === 'battle') {
        try {
          const battleData = await getBattle(id);
          if (battleData) {
            if (battleData.userVotedId) {
              setUserVotedParticipantId(battleData.userVotedId);
            }
            if (currentParts.length < 2 && battleData.competitors?.length >= 2) {
              const syntheticParts: Participant[] = battleData.competitors.map((c) => ({
                id: c.id,
                contest_id: id,
                user_id: c.id,
                submission_data: {
                  name: c.name,
                  photos: c.photos || (c.photoUrl ? [c.photoUrl] : []),
                  description: c.authorBio || '',
                  votes: c.votes,
                },
                status: 'approved',
                admin_note: null,
                submitted_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }));
              currentParts = syntheticParts;
            }
          }
        } catch (bErr) {
          console.warn('Battle data fetch note:', bErr);
        }
      }

      setParticipants(currentParts);

      // Fetch votes
      try {
        const { data: votesData } = await supabase
          .from('votes')
          .select('id, participant_id, voter_id')
          .eq('contest_id', id);

        let initialVotes = votesData || [];

        // Check user session
        if (user && initialVotes.length > 0) {
          const myVote = initialVotes.find((v: any) => v.voter_id === user.id);
          if (myVote) setUserVotedParticipantId(myVote.participant_id);
        }

        // Check local persisted votes (including battle persistent storage)
        try {
          const persisted = getPersistedBattleVotes();
          const localVote = persisted[id] || (typeof window !== 'undefined' ? localStorage.getItem(`contest_vote_${id}`) : null);
          if (localVote) {
            setUserVotedParticipantId(localVote);
            if (!initialVotes.some((v: any) => v.participant_id === localVote)) {
              initialVotes = [...initialVotes, { id: `local_p_${Date.now()}`, participant_id: localVote, voter_id: user?.id || 'guest' }];
            }
          }
        } catch {}

        setVotes(initialVotes);
      } catch (err) {
        console.warn('Votes fetch exception:', err);
      }

      setLoading(false);
    }
    loadData();
  }, [id, user]);

  const userHasApplied = user ? participants.some((p) => p.user_id === user.id) : false;

  const handleToggleVote = async (participantId: string) => {
    if (!isAuthenticated || !user) {
      showToast(isRu ? 'Войдите в аккаунт, чтобы проголосовать' : 'Please sign in to vote.');
      return;
    }

    // Tapping on your own vote removes it
    if (userVotedParticipantId === participantId) {
      setSubmittingVoteId(participantId);
      try {
        await cancelVote({ contestId: id });
      } catch (err) {
        console.warn('Cancel vote error:', err);
      }
      removePersistedBattleVote(id);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`contest_vote_${id}`);
      }
      setUserVotedParticipantId(null);
      setVotes((prev) => prev.filter((v) => v.voter_id !== user.id && v.participant_id !== participantId));
      setSubmittingVoteId(null);
      showToast(isRu ? 'Голос отменён' : 'Vote removed.');
      return;
    }

    // Otherwise, change or cast vote
    setSubmittingVoteId(participantId);
    if (userVotedParticipantId) {
      try {
        await cancelVote({ contestId: id });
      } catch {}
    }

    persistBattleVote(id, participantId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`contest_vote_${id}`, participantId);
    }

    const { error: voteErr } = await castVote({
      contestId: id,
      stageId: id,
      groupId: id,
      participantId,
      trustWeight: 1.0,
    });

    if (voteErr && !voteErr.toLowerCase().includes('duplicate')) {
      showToast(voteErr);
    } else {
      setUserVotedParticipantId(participantId);
      setVotes((prev) => [
        ...prev.filter((v) => v.voter_id !== user.id),
        { id: `local_${Date.now()}`, participant_id: participantId, voter_id: user.id },
      ]);
      const targetP = participants.find((p) => p.id === participantId);
      const name = targetP?.submission_data?.name || targetP?.profiles?.display_name || 'Participant';
      showToast(isRu ? `Голос за «${name}» учтён!` : `Vote for ${name} recorded!`);
    }
    setSubmittingVoteId(null);
  };

  const getParticipantVoteCount = useCallback((pId: string) => {
    const direct = votes.filter((v) => v.participant_id === pId).length;
    if (direct > 0) return direct;
    const participant = participants.find((p) => p.id === pId);
    return Number((participant?.submission_data as any)?.votes ?? 0);
  }, [votes, participants]);

  const totalVotes = useMemo(() => {
    const directTotal = votes.length;
    if (directTotal > 0) return directTotal;
    const seedTotal = participants.reduce(
      (acc, p) => acc + Number((p.submission_data as any)?.votes ?? 0),
      0
    );
    return seedTotal;
  }, [votes, participants]);

  const getParticipantVotePercent = useCallback((pId: string) => {
    const count = getParticipantVoteCount(pId);
    if (totalVotes === 0) {
      return participants.length > 0 ? Math.round(100 / participants.length) : 0;
    }
    return Math.round((count / totalVotes) * 100);
  }, [getParticipantVoteCount, totalVotes, participants.length]);

  // Sorted by percentage descending
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const pB = getParticipantVotePercent(b.id);
      const pA = getParticipantVotePercent(a.id);
      if (pB !== pA) return pB - pA;
      return b.id.localeCompare(a.id);
    });
  }, [participants, getParticipantVotePercent]);

  const INITIAL_LIMIT = 6;
  const displayedParticipants = showAllEntries
    ? sortedParticipants
    : sortedParticipants.slice(0, INITIAL_LIMIT);

  // Extract up to 3 rules from contest.rules or provide format-specific defaults
  const rulesList = useMemo(() => {
    if (contest?.rules && contest.rules.trim()) {
      const splitLines = contest.rules
        .split(/\n+/)
        .map((r) => r.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter(Boolean);
      if (splitLines.length > 0) {
        return splitLines.slice(0, 3);
      }
    }
    if (contest?.type === 'battle') {
      return isRu ? DEFAULT_BATTLE_RULES_RU : DEFAULT_BATTLE_RULES_EN;
    }
    return isRu ? DEFAULT_RULES_RU : DEFAULT_RULES_EN;
  }, [contest?.rules, contest?.type, isRu]);

  const votedParticipant = useMemo(() => {
    if (!userVotedParticipantId) return null;
    return participants.find((p) => p.id === userVotedParticipantId) || null;
  }, [userVotedParticipantId, participants]);

  const votedParticipantName = useMemo(() => {
    if (!votedParticipant) return '';
    return (
      votedParticipant.submission_data?.name ||
      votedParticipant.profiles?.display_name ||
      votedParticipant.profiles?.username ||
      'Участник'
    );
  }, [votedParticipant]);

  const handleToggleSubscribe = () => {
    setIsSubscribed((prev) => {
      const next = !prev;
      showToast(
        next
          ? (isRu ? 'Вы подписались на обновления' : 'Subscribed to updates')
          : (isRu ? 'Подписка отменена' : 'Unsubscribed')
      );
      return next;
    });
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d110e] text-[#eef2ec] max-w-lg mx-auto p-4 space-y-4 animate-fade-in font-['Onest',sans-serif]">
        <div className="w-full h-[280px] bg-[#161c17] rounded-[18px] animate-pulse" />
        <div className="h-8 w-3/4 bg-[#161c17] rounded-[14px] animate-pulse" />
        <div className="h-20 bg-[#161c17] rounded-[18px] animate-pulse" />
      </main>
    );
  }

  if (error || !contest) {
    return (
      <main className="min-h-screen bg-[#0d110e] text-[#eef2ec] max-w-lg mx-auto p-6 flex flex-col items-center justify-center text-center font-['Onest',sans-serif]">
        <div className="w-16 h-16 rounded-full bg-[#161c17] border border-[#232b24] flex items-center justify-center text-2xl mb-4">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-[#eef2ec]">
          {error || (isRu ? 'Конкурс не найден' : 'Contest not found')}
        </h2>
        <button
          onClick={handleGoBack}
          className="mt-6 px-5 py-2.5 rounded-[18px] bg-[#161c17] border border-[#232b24] text-xs font-bold text-[#eef2ec] hover:bg-[#232b24] transition-colors"
        >
          {isRu ? 'Вернуться назад' : 'Go back'}
        </button>
      </main>
    );
  }

  // Interactive Fullscreen Duel Arena (rendered when user clicks "Enter Battle Arena")
  if (showArenaView && contest.type === 'battle') {
    return (
      <BattleVoteView
        initialContestId={contest.id}
        onBack={() => {
          setShowArenaView(false);
          // Refresh user vote from persisted storage
          try {
            const persisted = getPersistedBattleVotes();
            const localVote = persisted[id] || (typeof window !== 'undefined' ? localStorage.getItem(`contest_vote_${id}`) : null);
            if (localVote) {
              setUserVotedParticipantId(localVote);
            }
          } catch {}
        }}
      />
    );
  }

  // Registration Open state (dedicated view for registration tournaments)
  if (contest.status === 'registration') {
    return (
      <RegistrationContestPage
        contest={contest}
        participants={participants}
        userHasApplied={userHasApplied}
      />
    );
  }

  const coverUrl =
    contest.cover_url ||
    (participants[0]?.submission_data?.photos?.[0]
      ? resolveImageUrl(participants[0].submission_data.photos[0], 'submissions')
      : DEFAULT_COVER);

  return (
    <main className="min-h-screen bg-[#0d110e] text-[#eef2ec] font-['Onest',sans-serif] selection:bg-[#3fc27a]/30 pb-28">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#161c17] border border-[#3fc27a]/50 text-[#3fc27a] text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      <div className="max-w-lg mx-auto relative">
        {/* 1. Full-bleed cover image (~280px tall) */}
        <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden bg-[#161c17]">
          <Image
            src={coverUrl}
            alt={contest.title}
            fill
            priority
            unoptimized={shouldBeUnoptimized(coverUrl)}
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 512px"
            referrerPolicy="no-referrer"
          />

          {/* Bottom gradient fade into page background #0d110e */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d110e] via-[#0d110e]/60 to-black/25 pointer-events-none" />

          {/* Cover overlay buttons (no separate top bar) */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pt-safe">
            {/* Back button */}
            <button
              type="button"
              onClick={handleGoBack}
              aria-label={isRu ? 'Назад' : 'Back'}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#eef2ec] transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
            </button>

            {/* Right buttons: Bookmark & Manage */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSubscribe}
                aria-label={isRu ? 'Подписаться' : 'Subscribe'}
                className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                  isSubscribed
                    ? 'bg-[#3fc27a]/20 border-[#3fc27a]/40 text-[#3fc27a]'
                    : 'bg-black/40 hover:bg-black/60 border-white/10 text-[#eef2ec]'
                }`}
              >
                <Bookmark size={18} strokeWidth={2.4} className={isSubscribed ? 'fill-[#3fc27a]' : ''} />
              </button>

              {isCreator && (
                <button
                  type="button"
                  onClick={() => setShowStatusSheet(true)}
                  aria-label={isRu ? 'Управление конкурсом' : 'Manage contest'}
                  className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-[#eef2ec] transition-colors"
                >
                  <MoreHorizontal size={18} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Header block overlapping cover bottom (-mt-8) */}
        <div className="-mt-8 relative z-10 px-4 space-y-4">
          <div>
            {/* Small status line with pulsing green dot */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#3fc27a]">
              <span className="w-2 h-2 rounded-full bg-[#3fc27a] animate-pulse shrink-0" />
              <span>
                {contest.type === 'battle'
                  ? (isRu ? 'Голосование идёт · 1v1 баттл' : 'Voting is live · 1v1 Battle')
                  : (isRu ? 'Голосование идёт · вечный конкурс' : 'Voting is live · Eternal contest')}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[30px] font-extrabold text-[#eef2ec] leading-tight tracking-tight mt-1.5">
              {contest.title}
            </h1>

            {/* Description */}
            {contest.description && (
              <p className="text-[#8d998f] text-sm leading-relaxed line-clamp-2 mt-1">
                {contest.description}
              </p>
            )}
          </div>

          {/* 3. Compact stats strip (3 cells) */}
          <div className="rounded-[18px] bg-[#161c17] border border-[#232b24] p-3.5 grid grid-cols-3 divide-x divide-[#232b24]">
            {/* Cell 1: Participants with thin green progress bar */}
            <div className="px-3 flex flex-col justify-between">
              <div>
                <div className="text-base sm:text-lg font-extrabold text-[#eef2ec] tabular-nums">
                  {contest.type === 'battle'
                    ? `${participants.length} / 2`
                    : `${participants.length} / ${contest.max_participants || 50}`}
                </div>
                <div className="text-[11px] text-[#8d998f] mt-0.5">
                  {isRu ? 'участников' : 'participants'}
                </div>
              </div>
              <div className="w-full h-1 bg-[#232b24] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-[#3fc27a] rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      contest.type === 'battle'
                        ? '100%'
                        : `${Math.min(
                            100,
                            Math.max(4, Math.round((participants.length / (contest.max_participants || 50)) * 100))
                          )}%`
                    }`,
                  }}
                />
              </div>
            </div>

            {/* Cell 2: Contest format */}
            <div className="px-3 flex flex-col justify-center">
              <div className="text-base sm:text-lg font-extrabold text-[#eef2ec]">
                {contest.type === 'battle'
                  ? (isRu ? '1v1 Баттл' : '1v1 Battle')
                  : (isRu ? 'Вечный' : 'Eternal')}
              </div>
              <div className="text-[11px] text-[#8d998f] mt-0.5">
                {isRu ? 'формат' : 'format'}
              </div>
            </div>

            {/* Cell 3: Rating mode */}
            <div className="px-3 flex flex-col justify-center">
              <div className="text-base sm:text-lg font-extrabold text-[#eef2ec]">
                Live
              </div>
              <div className="text-[11px] text-[#8d998f] mt-0.5">
                {isRu ? 'рейтинг' : 'rating'}
              </div>
            </div>
          </div>

          {/* 4. Rules: max 3 bullet lines with green check marks */}
          <div className="space-y-2 py-0.5">
            {rulesList.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-[#eef2ec] leading-snug">
                <Check size={16} className="text-[#3fc27a] shrink-0 mt-0.5" strokeWidth={2.8} />
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* 5. Primary CTA row */}
          <div className="flex items-center gap-3 pt-1">
            {contest.type === 'battle' ? (
              <button
                type="button"
                onClick={() => setShowArenaView(true)}
                className="flex-1 h-[50px] rounded-[18px] bg-[#e2622a] hover:bg-[#d0541f] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <span className="text-base">⚔️</span>
                <span>{isRu ? 'Перейти в арену баттла' : 'Enter Battle Arena'}</span>
              </button>
            ) : (
              <Link
                href={`/apply/${contest.id}`}
                className="flex-1 h-[50px] rounded-[18px] bg-[#e2622a] hover:bg-[#d0541f] active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center transition-all shadow-md"
              >
                {isRu ? 'Добавить работу' : 'Add entry'}
              </Link>
            )}

            <button
              type="button"
              onClick={handleToggleSubscribe}
              className={`h-[50px] px-6 rounded-[18px] border text-sm font-semibold transition-all shrink-0 ${
                isSubscribed
                  ? 'bg-[#3fc27a]/15 border-[#3fc27a]/40 text-[#3fc27a]'
                  : 'bg-[#161c17] hover:bg-[#1f2720] border-[#232b24] text-[#eef2ec]'
              }`}
            >
              {isSubscribed ? (isRu ? 'Вы подписаны' : 'Subscribed') : (isRu ? 'Подписаться' : 'Subscribe')}
            </button>
          </div>

          {/* 6. Live Head-to-Head Duel Statistics Bar (for Battles) */}
          {contest.type === 'battle' && displayedParticipants.length >= 2 && (
            <div className="rounded-[18px] bg-[#161c17] border border-[#232b24] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#8d998f] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3fc27a] animate-pulse" />
                  <span>{isRu ? 'Текущий перевес голосов' : 'Live Vote Split'}</span>
                </span>
                <span className="text-[11px] text-[#8d998f] tabular-nums font-medium">
                  {totalVotes > 0
                    ? (isRu ? `Всего голосов: ${totalVotes}` : `Total votes: ${totalVotes}`)
                    : (isRu ? 'Прямой эфир' : 'Live duel')}
                </span>
              </div>

              {/* Dual percentage split bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#eef2ec]">
                  <span className="truncate max-w-[45%] text-[#3fc27a]">
                    {displayedParticipants[0]?.submission_data?.name || (isRu ? 'Участник 1' : 'Competitor 1')} ({getParticipantVotePercent(displayedParticipants[0]?.id)}%)
                  </span>
                  <span className="text-[11px] text-[#8d998f] uppercase font-mono px-1">VS</span>
                  <span className="truncate max-w-[45%] text-right text-[#eef2ec]">
                    ({getParticipantVotePercent(displayedParticipants[1]?.id)}%) {displayedParticipants[1]?.submission_data?.name || (isRu ? 'Участник 2' : 'Competitor 2')}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-[#232b24] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#3fc27a] transition-all duration-500 rounded-l-full"
                    style={{ width: `${getParticipantVotePercent(displayedParticipants[0]?.id)}%` }}
                  />
                  <div
                    className="h-full bg-[#354337] transition-all duration-500 rounded-r-full"
                    style={{ width: `${getParticipantVotePercent(displayedParticipants[1]?.id)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 7. Popular entries / Competitors section */}
          <div className="pt-2 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-[#eef2ec] tracking-tight">
                {contest.type === 'battle'
                  ? (isRu ? 'Участники баттла' : 'Battle competitors')
                  : (isRu ? 'Популярные работы' : 'Popular entries')}
              </h2>
              <span className="text-xs text-[#8d998f] font-medium">
                {isRu ? 'Рейтинг сообщества' : 'Community rating'}
              </span>
            </div>

            {/* Inline note if user has voted */}
            {votedParticipant && (
              <div className="rounded-[18px] bg-[#122418] border border-[#3fc27a]/30 text-[#3fc27a] p-3.5 text-xs font-medium leading-relaxed animate-fade-in flex items-center justify-between gap-2">
                <span>
                  {isRu
                    ? `Вы проголосовали за «${votedParticipantName}». Нажмите ещё раз, чтобы отменить.`
                    : `You voted for «${votedParticipantName}». Tap again to undo.`}
                </span>
              </div>
            )}

            {/* Entries empty state */}
            {participants.length === 0 ? (
              <div className="p-8 text-center rounded-[18px] bg-[#161c17] border border-[#232b24] space-y-3">
                <div className="text-3xl">📷</div>
                <p className="text-xs text-[#8d998f]">
                  {isRu ? 'В конкурсе пока нет работ' : 'No entries submitted yet.'}
                </p>
                <Link
                  href={`/apply/${contest.id}`}
                  className="inline-block px-4 py-2 rounded-full bg-[#e2622a] text-white text-xs font-bold shadow"
                >
                  {isRu ? 'Добавить первую работу' : 'Submit first entry'}
                </Link>
              </div>
            ) : (
              /* Compact Ranked List (~80px per row) */
              <div className="space-y-2.5">
                {displayedParticipants.map((p, idx) => {
                  const rank = idx + 1;
                  const isVoted = userVotedParticipantId === p.id;
                  const percent = getParticipantVotePercent(p.id);
                  const rawPhoto = p.submission_data?.photos?.[0];
                  const photoUrl = rawPhoto
                    ? resolveImageUrl(rawPhoto, 'submissions')
                    : 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400';
                  const name =
                    p.submission_data?.name ||
                    p.profiles?.display_name ||
                    p.profiles?.username ||
                    (isRu ? `Участник ${rank}` : `Participant ${rank}`);
                  const desc = p.submission_data?.description || '';
                  const isExpanded = expandedRowId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setExpandedRowId(isExpanded ? null : p.id)}
                      className={`rounded-[18px] bg-[#161c17] border p-3 flex items-center gap-3 transition-colors cursor-pointer select-none ${
                        isVoted ? 'border-[#3fc27a]' : 'border-[#232b24] hover:border-[#333d34]'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-5 text-center shrink-0">
                        <span className={`text-sm font-extrabold ${isVoted ? 'text-[#3fc27a]' : 'text-[#8d998f]'}`}>
                          {rank}
                        </span>
                      </div>

                      {/* 64x64 Rounded Thumbnail */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const submissionPhotos =
                            p.submission_data?.photos && p.submission_data.photos.length > 0
                              ? p.submission_data.photos.map((ph: string) => resolveImageUrl(ph, 'submissions'))
                              : [photoUrl];
                          setLightboxData({
                            photoUrl,
                            photos: submissionPhotos,
                            title: name,
                            author: p.profiles?.username ? `@${p.profiles.username}` : undefined,
                            authorAvatar: p.profiles?.avatar_url
                              ? resolveImageUrl(p.profiles.avatar_url, 'avatars')
                              : undefined,
                            authorBio: desc,
                            category: contest.title,
                            isSelected: isVoted,
                            percentage: percent,
                            onVote: () => handleToggleVote(p.id),
                          });
                        }}
                        className="w-16 h-16 rounded-[12px] overflow-hidden shrink-0 relative bg-black/40 border border-[#232b24] hover:opacity-90 transition-opacity"
                      >
                        <Image
                          src={photoUrl}
                          alt={name}
                          fill
                          unoptimized={shouldBeUnoptimized(photoUrl)}
                          className="object-cover"
                          sizes="64px"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Name / Caption / Thin Progress Bar */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="text-sm font-bold text-[#eef2ec] truncate">
                          {name}
                        </div>
                        {desc ? (
                          <p
                            className={`text-xs text-[#8d998f] mt-0.5 leading-snug transition-all ${
                              isExpanded ? 'line-clamp-5' : 'line-clamp-1'
                            }`}
                          >
                            {desc}
                          </p>
                        ) : null}

                        {/* Thin progress bar */}
                        <div className="w-full h-1 bg-[#232b24] rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-[#3fc27a] rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Right: Percent + Small Pill Vote Button */}
                      <div className="shrink-0 flex flex-col items-end gap-1.5 pl-1">
                        <span className="text-base font-extrabold text-[#eef2ec] tabular-nums leading-none">
                          {percent}%
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVote(p.id);
                          }}
                          disabled={submittingVoteId === p.id}
                          className={`text-xs font-bold rounded-full px-3 py-1 transition-all active:scale-95 flex items-center gap-1 ${
                            isVoted
                              ? 'bg-[#3fc27a] text-[#0d110e] hover:bg-[#38b06d]'
                              : 'border border-[#3fc27a]/60 text-[#3fc27a] hover:bg-[#3fc27a]/10'
                          }`}
                        >
                          {submittingVoteId === p.id ? (
                            '...'
                          ) : isVoted ? (
                            <span>{isRu ? '✓ Ваш' : '✓ Yours'}</span>
                          ) : (
                            <span>{isRu ? 'Голос' : 'Vote'}</span>
                          )}
                        </button>
                      </div>

                      {/* Small per-row "⋯" menu (owner/creator only) */}
                      {(isCreator || (user && p.user_id === user.id)) && (
                        <div className="shrink-0 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === p.id ? null : p.id);
                            }}
                            aria-label="Actions"
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8d998f] hover:text-[#eef2ec] hover:bg-[#232b24] transition-colors"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuOpenId === p.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 z-30 bg-[#161c17] border border-[#232b24] rounded-xl shadow-xl p-1 min-w-[130px] animate-fade-in"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenId(null);
                                  handleDeleteCompetitor(p.id);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                <span>{isRu ? 'Удалить' : 'Remove'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Battle Arena secondary link */}
            {contest.type === 'battle' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowArenaView(true)}
                  className="w-full py-3.5 rounded-[18px] bg-[#161c17] hover:bg-[#1f2720] border border-[#232b24] text-xs font-bold text-[#3fc27a] hover:text-[#4edb8d] transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚔️</span>
                  <span>{isRu ? 'Найти и свайпать другие баттлы в арене →' : 'Browse and swipe battles in Arena →'}</span>
                </button>
              </div>
            )}

            {/* Show all / Show fewer button (for eternal/standard contests with many entries) */}
            {sortedParticipants.length > INITIAL_LIMIT && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllEntries((prev) => !prev)}
                  className="w-full py-3 rounded-[18px] bg-[#161c17] hover:bg-[#1f2720] border border-[#232b24] text-xs font-bold text-[#eef2ec] transition-colors"
                >
                  {showAllEntries
                    ? (isRu ? 'Свернуть' : 'Show fewer')
                    : (isRu
                        ? `Показать все работы (${sortedParticipants.length})`
                        : `Show all entries (${sortedParticipants.length})`)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Switching Bottom Sheet (Opened from cover "⋯" button) ── */}
      {showStatusSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setShowStatusSheet(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-lg bg-[#161c17] border-t border-[#232b24] rounded-t-[24px] p-6 space-y-4 z-10 animate-fade-in pb-safe">
            <div className="flex items-center justify-between border-b border-[#232b24] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#eef2ec]">
                  {isRu ? 'Статус конкурса' : 'Contest status'}
                </h3>
                <p className="text-xs text-[#8d998f] mt-0.5">
                  {isRu ? 'Панель управления организатора' : 'Organizer management controls'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusSheet(false)}
                className="w-8 h-8 rounded-full bg-[#232b24] flex items-center justify-center text-[#8d998f] hover:text-[#eef2ec]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                {
                  key: 'active',
                  labelRu: 'Активно (голосование)',
                  labelEn: 'Active (Voting)',
                  descRu: 'Открыто для голосования пользователей',
                  descEn: 'Open for live user voting',
                },
                {
                  key: 'registration',
                  labelRu: 'Регистрация открыта',
                  labelEn: 'Registration open',
                  descRu: 'Приём заявок участников',
                  descEn: 'Open for entry submissions',
                },
                {
                  key: 'paused',
                  labelRu: 'Приостановлен (пауза)',
                  labelEn: 'Paused',
                  descRu: 'Временно на паузе',
                  descEn: 'Temporarily on hold',
                },
                {
                  key: 'blocked',
                  labelRu: 'На проверке / скрыт',
                  labelEn: 'Flagged / Caution',
                  descRu: 'Скрыт из общей ленты с плашкой',
                  descEn: 'Unlisted with caution badge',
                },
                {
                  key: 'completed',
                  labelRu: 'Завершён',
                  labelEn: 'Completed',
                  descRu: 'Итоги подведены',
                  descEn: 'Finished and archived',
                },
              ].map((opt) => {
                const isCurrent = contest.status === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      handleChangeStatus(opt.key);
                      setShowStatusSheet(false);
                    }}
                    className={`w-full p-3.5 rounded-[18px] border text-left flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'border-[#3fc27a] bg-[#122418]'
                        : 'border-[#232b24] bg-[#161c17] hover:bg-[#1f2720]'
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-bold ${isCurrent ? 'text-[#3fc27a]' : 'text-[#eef2ec]'}`}>
                        {isRu ? opt.labelRu : opt.labelEn}
                      </div>
                      <div className="text-[11px] text-[#8d998f] mt-0.5">
                        {isRu ? opt.descRu : opt.descEn}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="w-6 h-6 rounded-full bg-[#3fc27a] text-[#0d110e] flex items-center justify-center shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Creator direct add competitor action */}
            <div className="pt-2 border-t border-[#232b24]">
              <button
                type="button"
                onClick={() => {
                  setShowStatusSheet(false);
                  setShowAddModal(true);
                }}
                className="w-full py-3 rounded-[18px] bg-[#232b24] hover:bg-[#2c372d] text-xs font-bold text-[#eef2ec] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>{isRu ? 'Добавить участника напрямую' : 'Directly add competitor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Creator Add Competitor Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-[#161c17] border border-[#232b24] rounded-[24px] p-6 space-y-4 z-10 animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232b24] pb-3">
              <h4 className="text-sm font-extrabold text-[#eef2ec]">
                {isRu ? 'Добавить участника в конкурс' : 'Add competitor to contest'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#232b24] flex items-center justify-center text-[#8d998f] hover:text-[#eef2ec]"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleAddCompetitor} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-[#8d998f] block mb-1">
                  {isRu ? 'Имя участника / название работы *' : 'Name / Title *'}
                </label>
                <input
                  type="text"
                  placeholder={isRu ? 'например, Участник 1' : 'e.g. Challenger 1'}
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#0d110e] border border-[#232b24] text-xs text-[#eef2ec] focus:outline-none focus:border-[#3fc27a]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8d998f] block mb-1">
                  {isRu ? 'Ссылка на фото *' : 'Photo URL *'}
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newCompPhoto}
                  onChange={(e) => setNewCompPhoto(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#0d110e] border border-[#232b24] text-xs text-[#eef2ec] focus:outline-none focus:border-[#3fc27a]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#8d998f] block mb-1">
                  {isRu ? 'Описание работы (необязательно)' : 'Description / Story (optional)'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isRu ? 'Пара слов о кадре...' : 'A few words about the photo...'}
                  value={newCompDesc}
                  onChange={(e) => setNewCompDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[14px] bg-[#0d110e] border border-[#232b24] text-xs text-[#eef2ec] focus:outline-none focus:border-[#3fc27a] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-[14px] bg-[#232b24] text-xs font-semibold text-[#8d998f] hover:text-[#eef2ec]"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={addingComp}
                  className="px-4 py-2 rounded-[14px] bg-[#e2622a] hover:bg-[#d0541f] text-white text-xs font-bold transition-colors"
                >
                  {addingComp ? '...' : (isRu ? 'Добавить' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ── */}
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
          isSelected={lightboxData.isSelected}
          percentage={lightboxData.percentage}
          onVote={lightboxData.onVote}
        />
      )}
    </main>
  );
}
