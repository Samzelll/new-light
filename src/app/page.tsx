"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { useAuth } from '@/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setAuth, clearAuth } from '@/features/auth/authSlice';
import { timeService } from '@/services/mock';
import { AppHeader } from '@/components/layout/AppHeader';
import { SideDrawer } from '@/components/layout/SideDrawer';
import { TikTokFeedView } from '@/components/feed/TikTokFeedView';
import { TikTokBattleView, BattleItem } from '@/components/contest/TikTokBattleView';
import { getContests, getMySubscriptions, Contest } from '@/services/contestService';
import { feedService, voteService } from '@/services/mock';
import type { Group } from '@/services/types';

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

export default function HomePage() {
  const { isAuthenticated, profile } = useAuth();
  const [mounted, setMounted] = useState(false);

  // ── 3 Main Navigation Tabs: 'contests' | 'feed' | 'battles' ──
  const [mainTab, setMainTab] = useState<'contests' | 'feed' | 'battles'>('contests');

  // Modals state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Catalog Contests state
  const [contests, setContests] = useState<Contest[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [loadingContests, setLoadingContests] = useState(true);

  // Feed (Groups of 4) state
  const [feedGroups, setFeedGroups] = useState<Group[]>([]);
  const [groupVotes, setGroupVotes] = useState<Record<string, string>>({}); // groupId -> participantId
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Battles state
  const [battleVotes, setBattleVotes] = useState<Record<string, 'red' | 'green'>>({});

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'for_you' | 'ending_soon'>('popular');
  const [onlySubscribed, setOnlySubscribed] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['battle', 'race', 'standard', 'eternal']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['registration', 'active', 'completed']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'feed' || tabParam === 'battles' || tabParam === 'contests') {
        setMainTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (tab: 'contests' | 'feed' | 'battles') => {
    setMainTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'contests') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // 1. Load Contests catalog & Subscriptions
  useEffect(() => {
    async function loadContestsData() {
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
    }
    loadContestsData();
  }, [isAuthenticated]);

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

  // Check if any filter or search query is active
  const hasActiveFilters = useMemo(() => {
    return (
      appliedSearch.trim().length > 0 ||
      onlySubscribed ||
      sortBy !== 'popular' ||
      selectedTypes.length < 4 ||
      selectedStatuses.length < 3 ||
      selectedTags.length > 0
    );
  }, [appliedSearch, onlySubscribed, sortBy, selectedTypes, selectedStatuses, selectedTags]);

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
    setIsFilterOpen(false);
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
    if (sortBy === 'for_you') {
      return list.sort((a, b) => {
        const aSub = subscriptions.includes(a.id);
        const bSub = subscriptions.includes(b.id);
        if (aSub && !bSub) return -1;
        if (!aSub && bSub) return 1;
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      });
    }

    if (sortBy === 'ending_soon') {
      return list.sort((a, b) => {
        const isAVoting = (a.status as string) === 'active' || (a.status as string) === 'voting';
        const isBVoting = (b.status as string) === 'active' || (b.status as string) === 'voting';
        if (isAVoting && !isBVoting) return -1;
        if (!isAVoting && isBVoting) return 1;
        return 0;
      });
    }

    // Default 'popular'
    return list.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return 0;
    });
  }, [contests, appliedSearch, onlySubscribed, selectedTypes, selectedStatuses, selectedTags, sortBy, subscriptions]);

  // Distribute into 2 Pinterest columns for masonry layout
  const { column1, column2 } = useMemo(() => {
    const col1: Array<{ contest: Contest; heightClass: string; isRegistration: boolean }> = [];
    const col2: Array<{ contest: Contest; heightClass: string; isRegistration: boolean }> = [];

    displayedContests.forEach((contest, index) => {
      const isRegistration = contest.status === 'registration';
      const isCol1 = index % 2 === 0;

      if (isCol1) {
        const heightClass =
          index === 0
            ? 'h-[290px] sm:h-[330px]'
            : index % 4 === 0
            ? 'h-[260px] sm:h-[300px]'
            : 'h-[210px] sm:h-[240px]';
        col1.push({ contest, heightClass, isRegistration });
      } else {
        const heightClass =
          index === 1
            ? 'h-[190px] sm:h-[220px]'
            : index === 3
            ? 'h-[160px] sm:h-[190px]'
            : 'h-[240px] sm:h-[270px]';
        col2.push({ contest, heightClass, isRegistration });
      }
    });

    return { column1: col1, column2: col2 };
  }, [displayedContests]);

  // Contests map for instant lookup across tabs
  const contestsMap = useMemo(() => {
    const map: Record<string, Contest> = {};
    contests.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [contests]);

  // ── Tab 2: Group Voting handler ──
  const handleVoteInGroup = async (groupId: string, participantId: string) => {
    setGroupVotes((prev) => ({ ...prev, [groupId]: participantId }));
    try {
      await voteService.castVote(groupId, participantId);
    } catch (e) {
      console.warn('Vote recorded locally');
    }
  };

  // ── Tab 3: Battles data & vote handler ──
  const sampleBattles: BattleItem[] = useMemo(
    () => [
      {
        id: 'battle-01',
        contestId: 'contest-neon-shinjuku',
        title: 'NEON TOKYO · 1v1 Duel',
        category: 'Cyberpunk & Neon',
        tags: ['Art', 'Design', 'Photography'],
        timeRemaining: '12h left',
        isPopular: true,
        red: {
          id: 'red-01',
          name: 'Shinjuku in Rain',
          author: '@kenji_lens',
          photo: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80',
          percent: 58,
        },
        green: {
          id: 'green-01',
          name: 'Neon Crossing',
          author: '@yuki_street',
          photo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80',
          percent: 42,
        },
      },
      {
        id: 'battle-02',
        contestId: 'contest-tennis-apply',
        title: 'TENNIS CHAMPIONSHIP · Final Set',
        category: 'Sports & Motion',
        tags: ['Sports'],
        timeRemaining: '4h left',
        isPopular: true,
        red: {
          id: 'red-02',
          name: 'Ace Serve',
          author: '@alex_shot',
          photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=700&q=80',
          percent: 64,
        },
        green: {
          id: 'green-02',
          name: 'Ball on the Line',
          author: '@daria_pro',
          photo: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=700&q=80',
          percent: 36,
        },
      },
      {
        id: 'battle-03',
        contestId: 'contest-nature-stars',
        title: 'HORIZON NATURE · 1v1',
        category: 'Landscape & Mountains',
        tags: ['Photography', 'Creative'],
        timeRemaining: '18h left',
        isPopular: false,
        red: {
          id: 'red-03',
          name: 'Alpine Sunrise',
          author: '@nordic_eye',
          photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80',
          percent: 51,
        },
        green: {
          id: 'green-03',
          name: 'Sunset Fjord',
          author: '@elena_arctic',
          photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=700&q=80',
          percent: 49,
        },
      },
      {
        id: 'battle-04',
        contestId: 'contest-glamour',
        title: 'MISS GLAMOUR · Top 2 Duel',
        category: 'Portrait & Style',
        tags: ['Photography', 'Art', 'Creative'],
        timeRemaining: '8h left',
        isPopular: true,
        red: {
          id: 'red-04',
          name: 'Flash in the Dark',
          author: '@alisa_fashion',
          photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700&q=80',
          percent: 53,
        },
        green: {
          id: 'green-04',
          name: 'Silk Glance',
          author: '@milana_model',
          photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=700&q=80',
          percent: 47,
        },
      },
      {
        id: 'battle-05',
        contestId: 'contest-design-ideas',
        title: 'FUTURE DESIGN · 3D Concept',
        category: 'Art & Design',
        tags: ['Design', 'Art'],
        timeRemaining: '24h left',
        isPopular: true,
        red: {
          id: 'red-05',
          name: 'Neon Polygon',
          author: '@render_master',
          photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&q=80',
          percent: 61,
        },
        green: {
          id: 'green-05',
          name: 'Cyber Structure',
          author: '@vector_art',
          photo: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=700&q=80',
          percent: 39,
        },
      },
    ],
    []
  );

  const handleBattleVote = (battleId: string, corner: 'red' | 'green') => {
    setBattleVotes((prev) => ({
      ...prev,
      [battleId]: corner,
    }));
  };

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
    return sampleBattles
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
        if (sortBy === 'popular') {
          return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
        }
        return 0;
      });
  }, [sampleBattles, contestsMap, appliedSearch, onlySubscribed, selectedTags, sortBy, subscriptions]);

  const dispatch = useDispatch();
  const [cycleToast, setCycleToast] = useState<string | null>(null);

  const handleSwitchUser = (role: 'admin' | 'moderator' | 'user' | 'guest' | 'entrant') => {
    if (role === 'guest') {
      dispatch(clearAuth());
      return;
    }

    if (role === 'admin') {
      dispatch(
        setAuth({
          user: { id: 'usr-admin-01', email: 'admin@opinion.net' },
          profile: {
            id: 'usr-admin-01',
            username: 'admin',
            displayName: 'Alexander',
            role: 'admin',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
    } else if (role === 'moderator') {
      dispatch(
        setAuth({
          user: { id: 'usr-mod-01', email: 'mod@opinion.net' },
          profile: {
            id: 'usr-mod-01',
            username: 'elenalens',
            displayName: 'Elena Lens',
            role: 'moderator',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
    } else if (role === 'entrant') {
      dispatch(
        setAuth({
          user: { id: 'usr-entrant-01', email: 'photographer@opinion.net' },
          profile: {
            id: 'usr-entrant-01',
            username: 'photographer',
            displayName: 'Dmitry Sokolov',
            role: 'user',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
    } else {
      dispatch(
        setAuth({
          user: { id: 'usr-user-01', email: 'user@opinion.net' },
          profile: {
            id: 'usr-user-01',
            username: 'marina_art',
            displayName: 'Marina Romanova',
            role: 'user',
            avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
    }
  };

  const handleAdvanceCycle = async () => {
    await timeService.devJumpToNextCycle();
    setCycleToast('Cycle 06:00 UTC simulated! Rounds and scores advanced.');
    setTimeout(() => setCycleToast(null), 3500);
  };

  const avatarUrl =
    profile?.avatar_url || (profile as any)?.avatarUrl || null;
  const username =
    profile?.username || (profile as any)?.username || 'user';

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center selection:bg-[#ff6a2b]/30">
      {/* Dev cycle advancement notification */}
      {cycleToast && (
        <div className="fixed top-3 z-50 px-4 py-2 rounded-full bg-[#ff6a2b] text-white font-bold text-xs shadow-xl animate-fade-in">
          {cycleToast}
        </div>
      )}

      {/* Mobile-first max-w-md App Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#0b0b0d] pb-24 relative">
        {/* ── Top Header with 3 Tabs: Contests | Feed | Battles ── */}
        <AppHeader
          activeTab={mainTab}
          onTabChange={handleTabChange}
          onOpenFilters={() => setIsFilterOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          hasActiveFilters={hasActiveFilters}
          avatarUrl={mounted ? avatarUrl : null}
          username={mounted ? username : 'user'}
        />

        {/* ── Side Drawer ── */}
        <SideDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          profile={mounted ? (profile as any) : null}
          onSwitchUser={handleSwitchUser}
          onAdvanceCycle={handleAdvanceCycle}
        />

        {/* ── Active Filter Badges Bar (visible when filters applied) ── */}
        {hasActiveFilters && (
          <div className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs border-b border-neutral-800/60 bg-[#121215]">
            <span className="text-[#ff6a2b] font-bold shrink-0">Filters:</span>
            {appliedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#202026] text-neutral-300">
                «{appliedSearch}»
              </span>
            )}
            {onlySubscribed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff6a2b]/20 text-[#ff6a2b] border border-[#ff6a2b]/30">
                ⭐ Following
              </span>
            )}
            {sortBy !== 'popular' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#202026] text-neutral-300">
                {sortBy === 'for_you' ? 'For You' : 'Ending Soon'}
              </span>
            )}
            {selectedTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#202026] text-neutral-300">
                #{tag}
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-neutral-400 hover:text-white shrink-0 ml-auto flex items-center gap-1 text-[11px] underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: CONTESTS (Catalog of all contests) ───────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'contests' && (
          <main className="flex-1 px-2 sm:px-3 pt-2">
            {loadingContests ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 animate-pulse pt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`rounded-2xl bg-[#161619] ${
                      i % 2 === 0 ? 'h-52' : 'h-64'
                    }`}
                  />
                ))}
              </div>
            ) : displayedContests.length === 0 ? (
              <div className="bg-[#141418] border border-neutral-800 rounded-3xl p-8 text-center my-6">
                <span className="text-4xl block mb-3">🔍</span>
                <h3 className="text-base font-bold text-white mb-1">
                  No contests found
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Try adjusting search keywords or reset active filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-full bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {/* Column 1 */}
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {column1.map(({ contest, heightClass, isRegistration }) => {
                    const isSubscribed = subscriptions.includes(contest.id);
                    return (
                      <Link
                        key={contest.id}
                        href={`/contest/${contest.id}`}
                        className={`group relative rounded-2xl overflow-hidden bg-[#161619] border border-neutral-800/80 transition-all hover:border-[#ff6a2b]/50 active:scale-[0.98] ${heightClass}`}
                      >
                        {/* Cover Image */}
                        {contest.cover_url ? (
                          <Image
                            src={contest.cover_url}
                            alt={contest.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
                        )}

                        {/* Top Gradient & Pill Badge */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />

                        {/* Top Bar with Type & Star */}
                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-xs text-[#ff6a2b] border border-[#ff6a2b]/30">
                            {contest.type === 'battle'
                              ? 'Battle'
                              : contest.type === 'race'
                              ? 'Race'
                              : contest.type === 'eternal'
                              ? 'Hall of Fame'
                              : 'Contest'}
                          </span>
                          {isSubscribed && (
                            <span className="w-5 h-5 rounded-full bg-black/70 text-amber-400 flex items-center justify-center text-xs">
                              ★
                            </span>
                          )}
                        </div>

                        {/* Bottom Info */}
                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white line-clamp-2 leading-tight drop-shadow">
                            {contest.title}
                          </h2>
                          <div className="flex items-center justify-between text-[10px] text-neutral-300 mt-1">
                            <span className="truncate">
                              {contest.categories?.name || 'Photography'}
                            </span>
                            <span className="shrink-0 font-semibold text-[#ff6a2b]">
                              {(contest.status as string) === 'voting' || contest.status === 'active'
                                ? 'Voting'
                                : contest.status === 'registration'
                                ? 'Apply'
                                : 'Final'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Column 2 */}
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {column2.map(({ contest, heightClass, isRegistration }) => {
                    const isSubscribed = subscriptions.includes(contest.id);
                    return (
                      <Link
                        key={contest.id}
                        href={`/contest/${contest.id}`}
                        className={`group relative rounded-2xl overflow-hidden bg-[#161619] border border-neutral-800/80 transition-all hover:border-[#ff6a2b]/50 active:scale-[0.98] ${heightClass}`}
                      >
                        {contest.cover_url ? (
                          <Image
                            src={contest.cover_url}
                            alt={contest.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />

                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-xs text-[#ff6a2b] border border-[#ff6a2b]/30">
                            {contest.type === 'battle'
                              ? 'Battle'
                              : contest.type === 'race'
                              ? 'Race'
                              : contest.type === 'eternal'
                              ? 'Hall of Fame'
                              : 'Contest'}
                          </span>
                          {isSubscribed && (
                            <span className="w-5 h-5 rounded-full bg-black/70 text-amber-400 flex items-center justify-center text-xs">
                              ★
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 z-10">
                          <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white line-clamp-2 leading-tight drop-shadow">
                            {contest.title}
                          </h2>
                          <div className="flex items-center justify-between text-[10px] text-neutral-300 mt-1">
                            <span className="truncate">
                              {contest.categories?.name || 'Photography'}
                            </span>
                            <span className="shrink-0 font-semibold text-[#ff6a2b]">
                              {(contest.status as string) === 'voting' || contest.status === 'active'
                                ? 'Voting'
                                : contest.status === 'registration'
                                ? 'Apply'
                                : 'Final'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: FEED (TikTok-style swipe stream of groups of 4) ──────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'feed' && (
          <main className="flex-1 flex flex-col min-h-[480px]">
            {loadingFeed ? (
              <div className="space-y-4 animate-pulse px-3 pt-4">
                <div className="h-6 w-48 bg-neutral-900 rounded mx-auto" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-52 bg-neutral-900 rounded-2xl" />
                  <div className="h-52 bg-neutral-900 rounded-2xl" />
                  <div className="h-52 bg-neutral-900 rounded-2xl" />
                  <div className="h-52 bg-neutral-900 rounded-2xl" />
                </div>
              </div>
            ) : (
              <TikTokFeedView
                groups={displayedFeedGroups}
                contestsMap={contestsMap}
                groupVotes={groupVotes}
                onVote={handleVoteInGroup}
                onResetFilters={handleResetFilters}
              />
            )}
          </main>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: BATTLES (TikTok-style 1v1 duels & races) ──────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {mainTab === 'battles' && (
          <main className="flex-1 flex flex-col min-h-[480px]">
            <TikTokBattleView
              battles={displayedBattles}
              contestsMap={contestsMap}
              battleVotes={battleVotes}
              onVote={handleBattleVote}
              onResetFilters={handleResetFilters}
            />
          </main>
        )}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── SEARCH & FILTER BOTTOM SHEET (Modal) ────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
            <div
              className="w-full max-w-md mx-auto bg-[#161619] border-t border-neutral-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-5 animate-slide-up"
              role="dialog"
              aria-modal="true"
              aria-label="Search and filters"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-[#ff6a2b]" strokeWidth={2.5} />
                  <h3 className="text-base font-bold text-white">
                    Search & Filters
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  aria-label="Close filters"
                  className="w-8 h-8 rounded-full text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Search input */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1.5">
                  Keywords
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-3 text-neutral-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title or description..."
                    className="w-full bg-[#101013] border border-neutral-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorting options */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSortBy('popular')}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-colors ${
                      sortBy === 'popular'
                        ? 'bg-[#ff6a2b] text-white'
                        : 'bg-[#202026] text-neutral-300 hover:text-white'
                    }`}
                  >
                    Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('for_you')}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-colors ${
                      sortBy === 'for_you'
                        ? 'bg-[#ff6a2b] text-white'
                        : 'bg-[#202026] text-neutral-300 hover:text-white'
                    }`}
                  >
                    For You
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('ending_soon')}
                    className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-colors ${
                      sortBy === 'ending_soon'
                        ? 'bg-[#ff6a2b] text-white'
                        : 'bg-[#202026] text-neutral-300 hover:text-white'
                    }`}
                  >
                    Ending Soon
                  </button>
                </div>
              </div>

              {/* Subscriptions toggle */}
              <div
                onClick={() => setOnlySubscribed((prev) => !prev)}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#101013] border border-neutral-800 cursor-pointer hover:border-neutral-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">⭐</span>
                  <div>
                    <div className="text-xs font-bold text-white">My Subscriptions</div>
                    <div className="text-[11px] text-neutral-400">Only followed contests</div>
                  </div>
                </div>
                <div
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    onlySubscribed ? 'bg-[#ff6a2b]' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      onlySubscribed ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {/* Categories / Tags chips */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-2">
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
                            ? 'bg-[#ff6a2b] text-white'
                            : 'bg-[#202026] text-neutral-300 hover:text-white'
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
                <label className="text-xs font-semibold text-neutral-400 block mb-2">
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
                            ? 'bg-[#241712] border border-[#ff6a2b]/40 text-[#ff6a2b]'
                            : 'bg-[#202026] text-neutral-400'
                        }`}
                      >
                        <span>{t.label}</span>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status chips */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-2">
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
                            ? 'bg-[#ff6a2b] text-white'
                            : 'bg-[#202026] text-neutral-400'
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
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#202026] hover:bg-[#2a2a32] text-neutral-300 font-bold text-sm transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm shadow-lg shadow-[#ff6a2b]/25 transition-colors"
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
