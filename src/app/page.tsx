"use client";

import React, { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Flame,
  Zap,
  Users,
  Trophy,
  ChevronRight,
  Clock,
  Star,
  Swords,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { useColumns } from '@/hooks/useColumns';
import { useChrome } from '@/components/navigation/ChromeContext';
import { AppHeader, type MainTab } from '@/components/layout/AppHeader';
import { TikTokFeedView } from '@/components/feed/TikTokFeedView';
import { LiveBattleFeedComplete } from '@/components/contest/LiveBattleFeedComplete';
import type { BattleItem } from '@/types/battle';
import { getMoreRecommendedBattles } from '@/services/recommendationService';
import { getContests, getMySubscriptions, Contest } from '@/services/contestService';
import { resolveImageUrl } from '@/services/storageService';
import {
  getAllBattleItems,
  SEED_SAMPLE_BATTLES,
  castVote as castBattleVote,
  cancelBattleVote,
  getPersistedBattleVotes,
} from '@/services/battleDataService';
import { feedService, voteService } from '@/services/mock';
import { cancelVote as cancelContestVote } from '@/services/voteService';
import type { Group } from '@/services/types';
import { PinGrid, type PinItem } from '@/features/pin-grid';
import { LazyImage } from '@/components/common/LazyImage';
import {
  ContestGridSkeleton,
  BattleArenaSkeleton,
  FeedGroupSkeleton,
} from '@/components/common/Skeletons';
import { LazyScrollTrigger } from '@/components/common/LazyScrollTrigger';

// Available categories/tags
const ALL_TAGS = ['Sports', 'Photography', 'Art', 'Design', 'Creative'];

// Contest types
const CONTEST_TYPES = [
  { id: 'battle', label: 'Battles' },
  { id: 'race', label: 'Races' },
  { id: 'standard', label: 'Standard' },
  { id: 'eternal', label: 'Hall of Fame' },
];

// Contest statuses
const CONTEST_STATUSES = [
  { id: 'registration', label: 'Registration' },
  { id: 'active', label: 'Voting' },
  { id: 'completed', label: 'Finished' },
];

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { filtersOpen, closeFilters, setActiveFilterCount } = useChrome();
  const [mounted, setMounted] = useState(false);

  // ── 3 Main Navigation Tabs synced to URL: '/' | '/?tab=feed' | '/?tab=battles' ──
  const tabParam = searchParams.get('tab');
  const mainTab: MainTab =
    tabParam === 'feed' || tabParam === 'battles' ? tabParam : 'contests';

  // Catalog Contests state
  const [contests, setContests] = useState<Contest[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [loadingContests, setLoadingContests] = useState(true);

  // Feed (Groups of 4) state
  const [feedGroups, setFeedGroups] = useState<Group[]>([]);
  const [groupVotes, setGroupVotes] = useState<Record<string, string>>({}); // groupId -> participantId
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Battles state (Dynamic from DB + Seeds)
  const [dbBattles, setDbBattles] = useState<BattleItem[]>([]);
  const [loadingBattles, setLoadingBattles] = useState(false);
  const [extraBattles, setExtraBattles] = useState<BattleItem[]>([]);
  const [battleVotes, setBattleVotes] = useState<Record<string, 'red' | 'green'>>({});
  const [battleOverrides, setBattleOverrides] = useState<Record<string, { redPercent: number; greenPercent: number }>>({});
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'for_you' | 'ending_soon' | 'newest'>('popular');
  const [onlySubscribed, setOnlySubscribed] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['battle', 'race', 'standard', 'eternal']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['registration', 'active', 'completed']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Progressive lazy pagination for Contests list
  const [visibleContestsCount, setVisibleContestsCount] = useState(10);

  // Reset pagination when filter/search/sort change
  useEffect(() => {
    setVisibleContestsCount(10);
  }, [appliedSearch, onlySubscribed, selectedTypes, selectedStatuses, selectedTags, sortBy]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Responsive columns for PinGrid (2 / 3 / 4 / 5)
  const columnsCount = useColumns();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTabChange = useCallback(
    (tab: MainTab) => {
      router.replace(tab === 'contests' ? '/' : `/?tab=${tab}`, {
        scroll: false,
      });
    },
    [router]
  );

  // 1. Load Contests catalog & Subscriptions
  const loadContestsData = useCallback(async () => {
    setLoadingContests(true);
    try {
      const { data } = await getContests({ includePausedOrBlocked: false });
      if (data) setContests(data);

      if (isAuthenticated) {
        const { data: subs } = await getMySubscriptions();
        if (subs) setSubscriptions(subs);
      }
    } catch (err) {
      console.error('Error loading contests:', err);
    } finally {
      setLoadingContests(false);
    }
  }, [isAuthenticated]);

  // 2. Load Battle items from database & seeds
  const loadBattlesData = useCallback(async (isInitial = false) => {
    if (isInitial && dbBattles.length === 0) {
      setLoadingBattles(true);
    }
    try {
      const items = await getAllBattleItems();
      if (items && items.length > 0) {
        setDbBattles(items);
      }
    } catch (err) {
      console.error('Error loading battles:', err);
    } finally {
      if (isInitial) {
        setLoadingBattles(false);
      }
    }
  }, [dbBattles.length]);

  useEffect(() => {
    loadContestsData();
  }, [loadContestsData]);

  // Background route pre-warm: compile & cache /contest/[id] once while user scans the grid
  const prewarmedContestRouteRef = useRef(false);
  useEffect(() => {
    if (prewarmedContestRouteRef.current || contests.length === 0) return;
    prewarmedContestRouteRef.current = true;
    const firstId = contests[0]?.id;
    if (!firstId) return;
    const timer = window.setTimeout(() => {
      router.prefetch(`/contest/${firstId}`);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [contests, router]);

  useEffect(() => {
    loadBattlesData(true);
  }, [loadBattlesData]);

  // Re-sync data when local mock DB is updated (catalog changes only)
  // Per Performance Playbook v2 §7.10: Never refetch battle feed on mockdb:updated.
  // Votes update optimistically in-place with zero re-mounting.
  useEffect(() => {
    const handleDbUpdate = () => {
      loadContestsData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mockdb:updated', handleDbUpdate);
      return () => {
        window.removeEventListener('mockdb:updated', handleDbUpdate);
      };
    }
  }, [loadContestsData]);

  // 2. Load Feed Groups (Groups of 4)
  useEffect(() => {
    async function loadFeedData() {
      setLoadingFeed(true);
      try {
        const groups = await feedService.getNextGroups();
        if (groups && groups.length > 0) {
          setFeedGroups(groups);
          // Restore prior picks
          const initialVotes: Record<string, string> = {};
          groups.forEach((g) => {
            if (g.myPickId) {
              initialVotes[g.id] = g.myPickId;
            }
          });
          setGroupVotes(initialVotes);
        }
      } catch (err) {
        console.error('Error loading feed groups:', err);
      } finally {
        setLoadingFeed(false);
      }
    }
    loadFeedData();
  }, []);

  // Count active filters for header badge
  const activeFilterCount = useMemo(() => {
    return (
      (appliedSearch.trim().length > 0 ? 1 : 0) +
      (onlySubscribed ? 1 : 0) +
      (sortBy !== 'popular' ? 1 : 0) +
      (selectedTypes.length < 4 ? 1 : 0) +
      (selectedStatuses.length < 3 ? 1 : 0) +
      selectedTags.length
    );
  }, [appliedSearch, onlySubscribed, sortBy, selectedTypes, selectedStatuses, selectedTags]);

  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    setActiveFilterCount(activeFilterCount);
  }, [activeFilterCount, setActiveFilterCount]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedSearch('');
    setSortBy('popular');
    setOnlySubscribed(false);
    setSelectedTypes(['battle', 'race', 'standard', 'eternal']);
    setSelectedStatuses(['registration', 'active', 'completed']);
    setSelectedTags([]);
  };

  const handleApplyFilters = () => {
    setAppliedSearch(searchQuery.trim());
    closeFilters();
  };

  // Filtered & sorted contests for Tab 1
  const displayedContests = useMemo(() => {
    let list = [...contests];

    // Search query
    const q = appliedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }

    // Subscriptions only
    if (onlySubscribed && subscriptions.length > 0) {
      list = list.filter((c) => subscriptions.includes(c.id));
    }

    // Types filter
    if (selectedTypes.length < 4) {
      list = list.filter((c) => selectedTypes.includes(c.type));
    }

    // Status filter
    if (selectedStatuses.length < 3) {
      list = list.filter((c) => {
        const s = (c.status as string) === 'voting' ? 'active' : c.status;
        return selectedStatuses.includes(s);
      });
    }

    // Tags / Categories filter
    if (selectedTags.length > 0) {
      list = list.filter((c) => {
        const text = `${c.title} ${c.description}`.toLowerCase();
        return selectedTags.some((tag) => {
          if (tag === 'Sports') return text.includes('sport') || text.includes('tennis');
          if (tag === 'Photography') return text.includes('photo') || text.includes('street') || text.includes('portrait');
          if (tag === 'Art') return text.includes('art') || text.includes('concept');
          if (tag === 'Design') return text.includes('design') || text.includes('architect');
          if (tag === 'Creative') return text.includes('creative') || text.includes('ideas') || text.includes('writing');
          return text.includes(tag.toLowerCase());
        });
      });
    }

    // Sorting
    if (sortBy === 'newest') {
      return list.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    if (sortBy === 'for_you') {
      return list.sort((a, b) => {
        const aSub = subscriptions.includes(a.id);
        const bSub = subscriptions.includes(b.id);
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        if (b.is_featured !== a.is_featured) {
          return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
        }
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    if (sortBy === 'ending_soon') {
      return list.sort((a, b) => {
        const isAVoting = (a.status as string) === 'active' || (a.status as string) === 'voting';
        const isBVoting = (b.status as string) === 'active' || (b.status as string) === 'voting';
        if (isAVoting && !isBVoting) return -1;
        if (!isAVoting && isBVoting) return 1;
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    // Default 'popular': featured first, and within featured / non-featured, newest first!
    return list.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [contests, appliedSearch, onlySubscribed, selectedTypes, selectedStatuses, selectedTags, sortBy, subscriptions]);

  // Progressive lazy batching for Contests catalog
  const paginatedContests = useMemo(() => {
    return displayedContests.slice(0, visibleContestsCount);
  }, [displayedContests, visibleContestsCount]);

  const hasMoreContests = visibleContestsCount < displayedContests.length;

  const handleLoadMoreContests = useCallback(() => {
    setVisibleContestsCount((prev) => Math.min(prev + 8, displayedContests.length));
  }, [displayedContests.length]);

  // Transform paginated contests into Pinterest-style PinItem batch entries
  const contestPins: PinItem[] = useMemo(() => {
    return paginatedContests.map((contest, index) => {
      const isSubscribed = subscriptions.includes(contest.id);
      const isVoting = (contest.status as string) === 'voting' || contest.status === 'active';
      const isNew =
        contest.created_at &&
        Date.now() - new Date(contest.created_at).getTime() < 1000 * 60 * 60 * 48;

      // Realistic dynamic aspect ratio variation for masonry harmony
      const heightVariants = [760, 620, 800, 680, 720, 580];
      const estimatedHeight =
        (contest as any).cover_height || heightVariants[index % heightVariants.length];
      const estimatedWidth = (contest as any).cover_width || 600;

      return {
        id: contest.id,
        photo: contest.cover_url || '',
        title: contest.title,
        subtitle: contest.categories?.name || 'Photography',
        width: estimatedWidth,
        height: estimatedHeight,
        dominantColor: (contest as any).dominantColor || '#1c1917',
        blurDataURL: (contest as any).cover_blur,
        isLive: isVoting,
        badge: isVoting
          ? undefined
          : contest.type === 'battle'
          ? 'Battle'
          : contest.type === 'race'
          ? 'Race'
          : contest.type === 'eternal'
          ? 'Hall of Fame'
          : 'Contest',
        isSubscribed: isSubscribed,
        tag: isNew ? 'NEW' : undefined,
        href: `/contest/${contest.id}`,
        raw: contest,
      };
    });
  }, [paginatedContests, subscriptions]);

  // Contests map for instant lookup across tabs
  const contestsMap = useMemo(() => {
    const map: Record<string, Contest> = {};
    contests.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [contests]);

  // ── Tab 2: Group Voting handler (with unvote / toggle support) ──
  const handleVoteInGroup = async (groupId: string, participantId: string | null) => {
    setActiveGroupId(groupId);
    if (!participantId) {
      setGroupVotes((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      try {
        await cancelContestVote({ contestId: groupId });
      } catch (e) {
        console.warn('Group vote cancel recorded locally:', e);
      }
      return;
    }

    setGroupVotes((prev) => ({ ...prev, [groupId]: participantId }));
    try {
      await voteService.castVote(groupId, participantId);
    } catch (e) {
      console.warn('Vote recorded locally');
    }
  };

  // ── Tab 3: Dynamic Battles data & vote handler ──
  const effectiveBattles = useMemo(() => {
    return dbBattles.length > 0 ? dbBattles : SEED_SAMPLE_BATTLES;
  }, [dbBattles]);

  const allBattles = useMemo(() => {
    const combined = [...effectiveBattles, ...extraBattles];
    return combined.map((b) => {
      const override = battleOverrides[b.id];
      if (!override) return b;
      return {
        ...b,
        red: { ...b.red, percent: override.redPercent },
        green: { ...b.green, percent: override.greenPercent },
      };
    });
  }, [effectiveBattles, extraBattles, battleOverrides]);

  const handleBattleVote = (battleId: string, corner: 'red' | 'green' | null) => {
    setActiveBattleId(battleId);
    if (!corner) {
      setBattleVotes((prev) => {
        const next = { ...prev };
        delete next[battleId];
        return next;
      });
      const targetBattle = allBattles.find((b) => b.id === battleId);
      if (targetBattle && targetBattle.contestId) {
        cancelBattleVote(targetBattle.contestId).catch((e) =>
          console.warn('Battle vote cancel notice:', e)
        );
      }
      return;
    }

    setBattleVotes((prev) => ({
      ...prev,
      [battleId]: corner,
    }));

    const targetBattle = allBattles.find((b) => b.id === battleId);
    if (targetBattle && targetBattle.contestId) {
      const chosenParticipantId = corner === 'red' ? targetBattle.red.id : targetBattle.green.id;
      castBattleVote(targetBattle.contestId, chosenParticipantId).catch((e) =>
        console.warn('Battle vote persist notice:', e)
      );
    }
  };

  const handleLoadMoreBattles = useCallback(() => {
    setExtraBattles((prev) => {
      const existingIds = new Set([...effectiveBattles.map((b) => b.id), ...prev.map((b) => b.id)]);
      const newBatch = getMoreRecommendedBattles(effectiveBattles.length + prev.length, existingIds);
      if (newBatch.length === 0) return prev;
      return [...prev, ...newBatch];
    });
  }, [effectiveBattles]);

  const handleLoadMoreFeed = useCallback(() => {
    setFeedGroups((prev) => {
      if (prev.length === 0) return prev;
      const batchIdx = Math.floor(prev.length / 4) + 1;
      const moreGroups = prev.slice(0, 4).map((g, i) => ({
        ...g,
        id: `${g.id}-stream-${batchIdx}-${i}`,
        contestTitle: `${g.contestTitle} · Round ${batchIdx + 1}`,
      }));
      return [...prev, ...moreGroups];
    });
  }, []);

  // ── FILTERED FEED GROUPS (by search query, tags, popularity) ──
  const displayedFeedGroups = useMemo(() => {
    return feedGroups
      .filter((group) => {
        const parentContest = contestsMap[group.contestId];
        const searchTarget = `${group.contestTitle || ''} ${parentContest?.title || ''} ${parentContest?.description || ''} ${group.members?.map((m) => m.title).join(' ') || ''}`.toLowerCase();

        // 1. Search filter
        if (appliedSearch.trim() && !searchTarget.includes(appliedSearch.trim().toLowerCase())) {
          return false;
        }

        // 2. Subscribed filter
        if (onlySubscribed && !subscriptions.includes(group.contestId)) {
          return false;
        }

        // 3. Selected Tags filter
        if (selectedTags.length > 0) {
          const matchesTag = selectedTags.some((tag) => {
            const t = tag.toLowerCase();
            if (t === 'sports') return searchTarget.includes('sport') || searchTarget.includes('tennis');
            if (t === 'photography') return searchTarget.includes('photo') || searchTarget.includes('portrait') || searchTarget.includes('glamour');
            if (t === 'art') return searchTarget.includes('art') || searchTarget.includes('neon') || searchTarget.includes('illustration');
            if (t === 'design') return searchTarget.includes('design') || searchTarget.includes('concept') || searchTarget.includes('3d');
            if (t === 'creative') return searchTarget.includes('creative') || searchTarget.includes('talent') || searchTarget.includes('nature');
            return searchTarget.includes(t);
          });
          if (!matchesTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          const aPopular = (contestsMap[a.contestId]?.is_featured || (contestsMap[a.contestId] as any)?.isFeatured) ? 1 : 0;
          const bPopular = (contestsMap[b.contestId]?.is_featured || (contestsMap[b.contestId] as any)?.isFeatured) ? 1 : 0;
          return bPopular - aPopular;
        }
        return 0;
      });
  }, [feedGroups, contestsMap, appliedSearch, onlySubscribed, selectedTags, sortBy, subscriptions]);

  // ── FILTERED BATTLES (by search query, tags, popularity) ──
  const displayedBattles = useMemo(() => {
    return allBattles
      .filter((battle) => {
        const parentContest = battle.contestId ? contestsMap[battle.contestId] : null;
        const searchTarget = `${battle.title} ${battle.category} ${battle.red.name} ${battle.green.name} ${battle.red.author} ${battle.green.author} ${parentContest?.description || ''} ${battle.tags?.join(' ') || ''}`.toLowerCase();

        // 1. Search filter
        if (appliedSearch.trim() && !searchTarget.includes(appliedSearch.trim().toLowerCase())) {
          return false;
        }

        // 2. Subscribed filter
        if (onlySubscribed && battle.contestId && !subscriptions.includes(battle.contestId)) {
          return false;
        }

        // 3. Selected Tags filter
        if (selectedTags.length > 0) {
          const matchesTag = selectedTags.some((tag) => {
            if (battle.tags?.includes(tag)) return true;
            const t = tag.toLowerCase();
            if (t === 'sports') return searchTarget.includes('sport') || searchTarget.includes('tennis');
            if (t === 'photography') return searchTarget.includes('photo') || searchTarget.includes('portrait') || searchTarget.includes('glamour');
            if (t === 'art') return searchTarget.includes('art') || searchTarget.includes('neon') || searchTarget.includes('cyberpunk');
            if (t === 'design') return searchTarget.includes('design') || searchTarget.includes('concept') || searchTarget.includes('3d');
            if (t === 'creative') return searchTarget.includes('creative') || searchTarget.includes('talent') || searchTarget.includes('nature');
            return searchTarget.includes(t);
          });
          if (!matchesTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aContest = a.contestId ? contestsMap[a.contestId] : null;
        const bContest = b.contestId ? contestsMap[b.contestId] : null;
        const dateA = aContest?.created_at ? new Date(aContest.created_at).getTime() : 0;
        const dateB = bContest?.created_at ? new Date(bContest.created_at).getTime() : 0;

        if (sortBy === 'newest') {
          return dateB - dateA;
        }

        if (sortBy === 'popular') {
          if (Boolean(b.isPopular) !== Boolean(a.isPopular)) {
            return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
          }
          return dateB - dateA;
        }

        return dateB - dateA;
      });
  }, [allBattles, contestsMap, appliedSearch, onlySubscribed, selectedTags, sortBy, subscriptions]);

  return (
    <div className="w-full min-h-dvh bg-bg text-ink flex flex-col selection:bg-accent/30">
      {/* ── Top Header with 3 Tabs: Contests | Feed | Battles ── */}
      <AppHeader mainTab={mainTab} onTabChange={handleTabChange} />

      {/* Responsive App Container */}
      <div
        className={`w-full flex flex-col bg-bg relative transition-all duration-300 ${
          mainTab === 'contests'
            ? 'max-w-[1440px] mx-auto min-h-0 pb-8 md:pb-24 px-3 sm:px-6 lg:px-8'
            : 'max-w-md md:max-w-lg lg:max-w-2xl mx-auto h-app pb-0 overflow-hidden'
        }`}
      >

        {/* ── Active Filter Badges Bar (visible when filters applied) ── */}
        {hasActiveFilters && (
          <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs border-b border-line bg-surface">
            <span className="text-accent font-bold shrink-0">Filters:</span>
            {appliedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                «{appliedSearch}»
              </span>
            )}
            {onlySubscribed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent-soft border border-accent/30 font-semibold">
                ⭐ Following
              </span>
            )}
            {sortBy !== 'popular' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                {sortBy === 'newest' ? 'Newest' : sortBy === 'for_you' ? 'For You' : 'Ending Soon'}
              </span>
            )}
            {selectedTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line text-muted">
                #{tag}
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-muted hover:text-ink shrink-0 ml-auto flex items-center gap-1 text-[11px] underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: CONTESTS (Catalog of all contests) ───────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'contests' && (
          <motion.main
            key="tab-contests"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 px-1 sm:px-0 pt-2"
          >
            {loadingContests ? (
              <ContestGridSkeleton count={6} />
            ) : displayedContests.length === 0 ? (
              <div className="bg-surface border border-line rounded-2xl p-8 text-center my-6">
                <span className="text-4xl block mb-3">🔍</span>
                <h3 className="text-base font-bold text-ink mb-1">
                  No contests found
                </h3>
                <p className="text-xs text-muted mb-4">
                  Try adjusting search keywords or reset active filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <PinGrid
                pins={contestPins}
                columns={columnsCount}
                batchSize={8}
                hasMore={hasMoreContests}
                onLoadMore={handleLoadMoreContests}
                onFail="placeholder"
              />
            )}
          </motion.main>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: FEED (TikTok-style swipe stream of groups of 4) ──────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'feed' && (
          <motion.main
            key="tab-feed"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
          >
            {loadingFeed ? (
              <FeedGroupSkeleton />
            ) : (
              <TikTokFeedView
                groups={displayedFeedGroups}
                contestsMap={contestsMap}
                groupVotes={groupVotes}
                onVote={handleVoteInGroup}
                onResetFilters={handleResetFilters}
                onLoadMore={handleLoadMoreFeed}
                activeGroupId={activeGroupId}
                onActiveGroupChange={setActiveGroupId}
                modalOpen={filtersOpen}
              />
            )}
          </motion.main>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: BATTLES (TikTok-style 1v1 duels & races) ──────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'battles' && (
          <motion.main
            key="tab-battles"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
          >
            {loadingBattles ? (
              <BattleArenaSkeleton />
            ) : (
              <LiveBattleFeedComplete
                battles={displayedBattles}
                contestsMap={contestsMap}
                battleVotes={battleVotes}
                onVote={handleBattleVote}
                onResetFilters={handleResetFilters}
                onLoadMore={handleLoadMoreBattles}
                modalOpen={filtersOpen}
                activeBattleId={activeBattleId}
                onActiveBattleChange={setActiveBattleId}
              />
            )}
          </motion.main>
        )}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── SEARCH & FILTER BOTTOM SHEET (Modal) ────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {filtersOpen && (
          <div className="fixed inset-0 z-50 bg-scrim backdrop-blur-xs flex flex-col justify-end animate-fade-in">
            <div
              className="w-full max-w-md mx-auto bg-surface-2 border-t border-line rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up"
              role="dialog"
              aria-modal="true"
              aria-label="Search and filters"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-accent" strokeWidth={2.5} />
                  <h3 className="text-base font-display font-bold text-ink">
                    Search & Filters
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeFilters}
                  aria-label="Close filters"
                  className="w-8 h-8 rounded-full text-muted hover:text-ink flex items-center justify-center transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Search input */}
              <div>
                <label className="text-faint uppercase text-[11px] font-semibold tracking-wide block mb-1.5">
                  Keywords
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3 text-faint" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or description..."
                    className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-accent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-muted hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorting options */}
              <div>
                <label className="text-faint uppercase text-[11px] font-semibold tracking-wide block mb-2">
                  Sort By
                </label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setSortBy('popular')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors text-center ${
                      sortBy === 'popular'
                        ? 'border border-accent bg-accent/10 text-accent-soft'
                        : 'bg-surface text-muted hover:text-ink border border-line'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('newest')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors text-center ${
                      sortBy === 'newest'
                        ? 'border border-accent bg-accent/10 text-accent-soft'
                        : 'bg-surface text-muted hover:text-ink border border-line'
                    }`}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('for_you')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors text-center ${
                      sortBy === 'for_you'
                        ? 'border border-accent bg-accent/10 text-accent-soft'
                        : 'bg-surface text-muted hover:text-ink border border-line'
                    }`}
                  >
                    For You
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('ending_soon')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-colors text-center ${
                      sortBy === 'ending_soon'
                        ? 'border border-accent bg-accent/10 text-accent-soft'
                        : 'bg-surface text-muted hover:text-ink border border-line'
                    }`}
                  >
                    Ending
                  </button>
                </div>
              </div>

              {/* Subscriptions toggle */}
              <div
                onClick={() => setOnlySubscribed((prev) => !prev)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface border border-line cursor-pointer hover:border-line-strong transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-accent text-sm">⭐</span>
                  <div>
                    <div className="text-xs font-bold text-ink">My Subscriptions</div>
                    <div className="text-[11px] text-muted">Only followed contests</div>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    onlySubscribed ? 'bg-accent' : 'bg-surface-2 border border-line'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-ink transition-transform ${
                      onlySubscribed ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Categories / Tags chips */}
              <div>
                <label className="text-faint uppercase text-[11px] font-semibold tracking-wide block mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setSelectedTags((prev) =>
                            isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          isSelected
                            ? 'border border-accent bg-accent/10 text-accent-soft'
                            : 'bg-surface text-muted hover:text-ink border border-line'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contest types chips */}
              <div>
                <label className="text-faint uppercase text-[11px] font-semibold tracking-wide block mb-2">
                  Contest Formats
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTEST_TYPES.map((t) => {
                    const isSelected = selectedTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setSelectedTypes((prev) =>
                            isSelected
                              ? prev.length > 1
                                ? prev.filter((id) => id !== t.id)
                                : prev
                              : [...prev, t.id]
                          )
                        }
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border border-accent bg-accent/10 text-accent-soft'
                            : 'bg-surface text-muted border border-line hover:text-ink'
                        }`}
                      >
                        <span>{t.label}</span>
                        {isSelected && <Check size={14} strokeWidth={3} className="text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status chips */}
              <div>
                <label className="text-faint uppercase text-[11px] font-semibold tracking-wide block mb-2">
                  Status
                </label>
                <div className="flex gap-2">
                  {CONTEST_STATUSES.map((s) => {
                    const isSelected = selectedStatuses.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setSelectedStatuses((prev) =>
                            isSelected
                              ? prev.length > 1
                                ? prev.filter((id) => id !== s.id)
                                : prev
                              : [...prev, s.id]
                          )
                        }
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-colors ${
                          isSelected
                            ? 'border border-accent bg-accent/10 text-accent-soft'
                            : 'bg-surface text-muted border border-line hover:text-ink'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 py-3 px-4 rounded-xl bg-surface-2 hover:bg-surface border border-line text-muted hover:text-ink font-bold text-sm transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 py-3 px-4 rounded-xl bg-accent-solid hover:bg-accent-hover text-white font-bold text-sm shadow-md transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <HomePageContent />
    </Suspense>
  );
}
