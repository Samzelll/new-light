/**
 * Battle Data Service
 * 
 * Modular data layer for 1v1 Battle contests.
 * Provides getBattle, castVote, and getNextBattle so the backend
 * can be swapped out easily without modifying UI components.
 */

import { supabase } from '@/services/supabase';
import { getContests, getContestById } from '@/services/contestService';
import { getParticipants } from '@/services/participantService';
import { castVote as castVoteService } from '@/services/voteService';
import { resolveImageUrl } from '@/services/storageService';
import type { BattleItem, CompetitorDetails, BattleCorner } from '@/types/battle';

export interface BattleCompetitor {
  id: string;
  name: string;
  photoUrl: string;
  photos?: string[];
  votes: number;
  percentage: number;
  corner: 'red' | 'blue';
  isUserPick?: boolean;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
}

export interface BattleContest {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  rules: string;
  status: string;
  totalVotes: number;
  competitors: [BattleCompetitor, BattleCompetitor];
  userVotedId: string | null;
}

// Fallback competitor sets if a contest has fewer than 2 competitors
const FALLBACK_PAIRS: Record<string, [Partial<BattleCompetitor>, Partial<BattleCompetitor>]> = {
  default: [
    {
      name: 'Manhattan sunset',
      photoUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1080&q=80',
    },
    {
      name: 'Neon Shinjuku',
      photoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    },
  ],
  'contest-stars': [
    {
      name: 'Golden Glow Horizon',
      photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&q=80',
    },
    {
      name: 'Cosmic Neon Eclipse',
      photoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80',
    },
  ],
};

/**
 * Fetch a single battle contest and its 1v1 competitors with vote stats.
 */
export async function getBattle(contestId?: string): Promise<BattleContest | null> {
  try {
    let targetId = contestId;

    // If no ID provided, pick the first battle contest
    if (!targetId) {
      const { data: allContests } = await getContests({ includePausedOrBlocked: false });
      const firstBattle = allContests?.find((c) => c.type === 'battle');
      if (firstBattle) targetId = firstBattle.id;
    }

    if (!targetId) targetId = 'contest-battle-01';

    const { data: contest } = await getContestById(targetId);
    if (!contest) return null;

    // Fetch participants
    const { data: participantsData } = await getParticipants(targetId, 'all');
    const participants = participantsData || [];

    // Fetch votes with trust_weight for accurate scoring/points
    const { data: votesData } = await supabase
      .from('votes')
      .select('id, participant_id, voter_id, trust_weight')
      .eq('contest_id', targetId);

    const votes = votesData || [];
    const totalVotes = votes.length;

    // Check current user session for existing vote
    let userVotedId: string | null = null;
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;
    if (currentUserId) {
      const myVote = votes.find((v: any) => v.voter_id === currentUserId);
      if (myVote) userVotedId = myVote.participant_id;
    }

    // Determine competitors
    const fallbackPair = FALLBACK_PAIRS[targetId] || FALLBACK_PAIRS.default;

    // Participant 1
    const p1 = participants[0];
    const p1Id = p1?.id || 'part-1';
    const p1Name = p1?.submission_data?.name || fallbackPair[0].name || 'Competitor 1';
    const rawP1Author = (p1?.submission_data as any)?.author?.trim();
    const p1Author = rawP1Author && !rawP1Author.startsWith('@challenger') ? rawP1Author : undefined;
    const p1Photo = resolveImageUrl(p1?.submission_data?.photos?.[0] || fallbackPair[0].photoUrl || '', 'submissions');
    const p1VotesRaw = votes
      .filter((v: any) => v.participant_id === p1Id)
      .reduce((sum: number, v: any) => sum + (Number(v.trust_weight) > 0 ? Number(v.trust_weight) : 1), 0);
    const p1Votes = Math.round(p1VotesRaw * 10) / 10;

    // Participant 2
    const p2 = participants[1];
    const p2Id = p2?.id || 'part-2';
    const p2Name = p2?.submission_data?.name || fallbackPair[1].name || 'Competitor 2';
    const rawP2Author = (p2?.submission_data as any)?.author?.trim();
    const p2Author = rawP2Author && !rawP2Author.startsWith('@challenger') ? rawP2Author : undefined;
    const p2Photo = resolveImageUrl(p2?.submission_data?.photos?.[0] || fallbackPair[1].photoUrl || '', 'submissions');
    const p2VotesRaw = votes
      .filter((v: any) => v.participant_id === p2Id)
      .reduce((sum: number, v: any) => sum + (Number(v.trust_weight) > 0 ? Number(v.trust_weight) : 1), 0);
    const p2Votes = Math.round(p2VotesRaw * 10) / 10;

    // Calculate percentages
    let p1Percent = 50;
    let p2Percent = 50;
    const effectiveTotal = p1Votes + p2Votes;
    if (effectiveTotal > 0) {
      p1Percent = Number(((p1Votes / effectiveTotal) * 100).toFixed(1));
      p2Percent = Number((100 - p1Percent).toFixed(1));
    }

    const competitor1: BattleCompetitor = {
      id: p1Id,
      name: p1Name,
      author: p1Author,
      authorAvatar: p1Author ? resolveImageUrl(p1?.profiles?.avatar_url, 'avatars') || undefined : undefined,
      authorBio: p1?.submission_data?.description || `Challenger representing ${p1Name}.`,
      photoUrl: p1Photo,
      photos: (p1?.submission_data?.photos && p1.submission_data.photos.length > 0) ? p1.submission_data.photos : [p1Photo],
      votes: p1Votes,
      percentage: p1Percent,
      corner: 'red',
      isUserPick: userVotedId === p1Id,
    };

    const competitor2: BattleCompetitor = {
      id: p2Id,
      name: p2Name,
      author: p2Author,
      authorAvatar: p2Author ? resolveImageUrl(p2?.profiles?.avatar_url, 'avatars') || undefined : undefined,
      authorBio: p2?.submission_data?.description || `Challenger representing ${p2Name}.`,
      photoUrl: p2Photo,
      photos: (p2?.submission_data?.photos && p2.submission_data.photos.length > 0) ? p2.submission_data.photos : [p2Photo],
      votes: p2Votes,
      percentage: p2Percent,
      corner: 'blue',
      isUserPick: userVotedId === p2Id,
    };

    return {
      id: contest.id,
      title: contest.title?.toUpperCase() || 'BATTLE ARENA',
      description: contest.description || 'Duel of two strongest works. Vote for the most atmospheric shot.',
      category: contest.categories?.name || 'Street photo',
      format: '1 vs 1 battle',
      rules: contest.rules || 'One vote per user. Tapping your choice casts an immutable vote. Trust-weighted ranking.',
      status: contest.status,
      totalVotes: effectiveTotal || totalVotes,
      competitors: [competitor1, competitor2],
      userVotedId,
    };
  } catch (err) {
    console.error('Error fetching battle contest:', err);
    return null;
  }
}

const BATTLE_VOTES_STORAGE_KEY = 'opinion_net_battle_votes';

export function getPersistedBattleVotes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BATTLE_VOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistBattleVote(battleOrContestId: string, participantId: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPersistedBattleVotes();
    existing[battleOrContestId] = participantId;
    localStorage.setItem(BATTLE_VOTES_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

export function removePersistedBattleVote(battleOrContestId: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPersistedBattleVotes();
    delete existing[battleOrContestId];
    localStorage.setItem(BATTLE_VOTES_STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

/**
 * Cast a vote for a competitor in a battle contest with resilient local + server persistence.
 */
export async function castVote(
  contestId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  // Always persist locally first so votes are never lost even if guest/offline
  persistBattleVote(contestId, participantId);

  try {
    let trustWeight = 1.0;
    try {
      const { getMyTrust } = await import('@/services/trustService');
      const { data: trustData } = await getMyTrust();
      if (trustData?.score && trustData.score > 0) {
        trustWeight = Number(trustData.score);
      }
    } catch {
      // Fallback 1.0 weight
    }

    const { error } = await castVoteService({
      contestId,
      stageId: contestId,
      groupId: contestId,
      participantId,
      trustWeight,
    });

    if (error) {
      console.warn('Server vote save note (recorded locally):', error);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Error casting battle vote to server (recorded locally):', err);
    return { success: true };
  }
}

export const castBattleVote = castVote;

/**
 * Cancel an existing vote in a battle contest.
 */
export async function cancelBattleVote(contestId: string): Promise<{ success: boolean; error?: string }> {
  removePersistedBattleVote(contestId);
  try {
    const { cancelVote } = await import('@/services/voteService');
    await cancelVote({ contestId });
    return { success: true };
  } catch (err: any) {
    console.warn('Cancel vote server notice (removed locally):', err);
    return { success: true };
  }
}

/**
 * Get the next battle in the feed to enable endless exploring.
 */
export async function getNextBattle(currentContestId: string): Promise<BattleContest | null> {
  try {
    const { data: allContests } = await getContests({ includePausedOrBlocked: false });
    const battles = (allContests || []).filter((c) => c.type === 'battle');

    if (battles.length === 0) return null;

    const currentIndex = battles.findIndex((b) => b.id === currentContestId);
    const nextIndex = (currentIndex + 1) % battles.length;
    const nextContest = battles[nextIndex];

    if (!nextContest) return null;
    return await getBattle(nextContest.id);
  } catch (err) {
    console.error('Error fetching next battle:', err);
    return null;
  }
}

export const SEED_SAMPLE_BATTLES: BattleItem[] = [
  {
    id: 'battle-01',
    contestId: 'contest-neon-shinjuku',
    title: 'NEON TOKYO · 1v1 Duel',
    category: 'Cyberpunk & Neon',
    tags: ['Art', 'Design', 'Photography'],
    timeRemaining: '12h left',
    isPopular: true,
    sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
    red: {
      id: 'red-01',
      name: 'Shinjuku in Rain',
      author: '@kenji_lens',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      authorBio: 'Street documentary creator based in Tokyo. Capturing wet neon pavement reflections, umbrellas, and cyber alleyways.',
      photo: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=85',
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=85',
        'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=85',
      ],
      percent: 58,
      votes: 116,
      sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
      sponsorTier: 'Headline Partner',
      prizePool: '$4,000 Global Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/kenji_lens',
        telegram: 'https://t.me/kenji_lens',
        twitter: 'https://x.com/kenji_lens',
        portfolio: 'https://kenjilens.tokyo',
      },
    },
    green: {
      id: 'green-01',
      name: 'Neon Crossing',
      author: '@yuki_street',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      authorBio: 'Urban colorist and night-crawler capturing Shibuya scramble and Akihabara signs through customized vintage prism filters.',
      photo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=85',
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200&q=85',
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=85',
      ],
      percent: 42,
      votes: 84,
      sponsorName: 'Sony Alpha Visuals & Tokyo Neo Art',
      sponsorTier: 'Headline Partner',
      prizePool: '$4,000 Global Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/yuki_street',
        telegram: 'https://t.me/yuki_street',
        twitter: 'https://x.com/yuki_street',
        portfolio: 'https://yukistreet.photo',
      },
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
    sponsorName: 'Nike Action Sports & Pro Tour',
    red: {
      id: 'red-02',
      name: 'Ace Serve',
      author: '@alex_shot',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      authorBio: 'ATP Tour action photographer catching 120mph flat serves frozen in air at maximum racket contact.',
      photo: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=85',
        'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=1200&q=85',
        'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1200&q=85',
      ],
      percent: 54,
      votes: 108,
      sponsorName: 'Nike Action Sports & Pro Tour',
      sponsorTier: 'Global Athletics Sponsor',
      prizePool: '$6,000 Cash Grant',
      socialLinks: {
        instagram: 'https://instagram.com/alex_shot',
        telegram: 'https://t.me/alex_shot',
        twitter: 'https://x.com/alex_shot',
        portfolio: 'https://alexshot.tennis',
      },
    },
    green: {
      id: 'green-02',
      name: 'Clay Slide',
      author: '@mateo_clay',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
      authorBio: 'Roland Garros red clay specialist tracking dust clouds and aggressive baseline sliding.',
      photo: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&q=85',
        'https://images.unsplash.com/photo-1530915536417-6d601666ff7c?w=1200&q=85',
        'https://images.unsplash.com/photo-1560012057-4372e14c5085?w=1200&q=85',
      ],
      percent: 46,
      votes: 92,
      sponsorName: 'Nike Action Sports & Pro Tour',
      sponsorTier: 'Global Athletics Sponsor',
      prizePool: '$6,000 Cash Grant',
      socialLinks: {
        instagram: 'https://instagram.com/mateo_clay',
        telegram: 'https://t.me/mateo_clay',
        twitter: 'https://x.com/mateo_clay',
        portfolio: 'https://mateoclay.com',
      },
    },
  },
  {
    id: 'battle-03',
    contestId: 'contest-photo-month',
    title: 'MOUNTAIN VIEW · Golden Hour',
    category: 'Nature & Landscape',
    tags: ['Photography'],
    timeRemaining: '18h left',
    isPopular: false,
    sponsorName: 'Earth Explorer & Hasselblad Master',
    red: {
      id: 'red-03',
      name: 'Alps Peak Mist',
      author: '@nordic_eye',
      authorAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
      authorBio: 'Alpine landscape explorer documenting morning mist layers across Dolomites and Swiss peaks.',
      photo: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85',
        'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=85',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=85',
      ],
      percent: 51,
      votes: 102,
      sponsorName: 'Earth Explorer & Hasselblad Master',
      sponsorTier: 'Expedition Partner',
      prizePool: '$8,000 Mountain Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/nordic_eye',
        telegram: 'https://t.me/nordic_eye',
        twitter: 'https://x.com/nordic_eye',
        portfolio: 'https://nordiceye.earth',
      },
    },
    green: {
      id: 'green-03',
      name: 'Sunset Fjord',
      author: '@elena_arctic',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      authorBio: 'Wilderness photographer focusing on coastal waterways, northern mirrors, and glacial reflections.',
      photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=85',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=85',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=85',
      ],
      percent: 49,
      votes: 98,
      sponsorName: 'Earth Explorer & Hasselblad Master',
      sponsorTier: 'Expedition Partner',
      prizePool: '$8,000 Mountain Gear Fund',
      socialLinks: {
        instagram: 'https://instagram.com/elena_arctic',
        telegram: 'https://t.me/elena_arctic',
        twitter: 'https://x.com/elena_arctic',
        portfolio: 'https://elenaarctic.com',
      },
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
    sponsorName: 'Vogue Creator Initiative & Elite Studio',
    red: {
      id: 'red-04',
      name: 'Flash in the Dark',
      author: '@alisa_fashion',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      authorBio: 'Studio portrait artist specializing in hard specular flash, avant-garde makeup, and monochrome styling.',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=85',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=85',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=85',
      ],
      percent: 53,
      votes: 106,
      sponsorName: 'Vogue Creator Initiative & Elite Studio',
      sponsorTier: 'Fashion Platinum Sponsor',
      prizePool: '$5,000 Editorial Spread + Feature Cover',
      socialLinks: {
        instagram: 'https://instagram.com/alisa_fashion',
        telegram: 'https://t.me/alisa_fashion',
        twitter: 'https://x.com/alisa_fashion',
        portfolio: 'https://alisafashion.design',
      },
    },
    green: {
      id: 'green-04',
      name: 'Silk Glance',
      author: '@milana_model',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      authorBio: 'High fashion editorial creator. Natural beauty lighting with silk fabrics and golden skin tones.',
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=85',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1200&q=85',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=85',
      ],
      percent: 47,
      votes: 94,
      sponsorName: 'Vogue Creator Initiative & Elite Studio',
      sponsorTier: 'Fashion Platinum Sponsor',
      prizePool: '$5,000 Editorial Spread + Feature Cover',
      socialLinks: {
        instagram: 'https://instagram.com/milana_model',
        telegram: 'https://t.me/milana_model',
        twitter: 'https://x.com/milana_model',
        portfolio: 'https://milanamodel.art',
      },
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
    sponsorName: 'Maxon Cinema 4D & Unreal Engine',
    red: {
      id: 'red-05',
      name: 'Neon Polygon',
      author: '@render_master',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
      authorBio: 'Procedural 3D animator and look-dev artist focusing on luminous geometry and physical glass shaders.',
      photo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=85',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=85',
        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=85',
      ],
      percent: 61,
      votes: 122,
      sponsorName: 'Maxon Cinema 4D & Unreal Engine',
      sponsorTier: 'Creative Technology Sponsor',
      prizePool: '$3,500 Hardware Grant',
      socialLinks: {
        instagram: 'https://instagram.com/render_master',
        telegram: 'https://t.me/render_master',
        twitter: 'https://x.com/render_master',
        portfolio: 'https://rendermaster.cg',
      },
    },
    green: {
      id: 'green-05',
      name: 'Cyber Structure',
      author: '@vector_art',
      authorAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
      authorBio: 'Generative architect exploring parametric facades and algorithmic volumetric lighting.',
      photo: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=700&q=80',
      photos: [
        'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=1200&q=85',
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=85',
        'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200&q=85',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=85',
      ],
      percent: 39,
      votes: 78,
      sponsorName: 'Maxon Cinema 4D & Unreal Engine',
      sponsorTier: 'Creative Technology Sponsor',
      prizePool: '$3,500 Hardware Grant',
      socialLinks: {
        instagram: 'https://instagram.com/vector_art',
        telegram: 'https://t.me/vector_art',
        twitter: 'https://x.com/vector_art',
        portfolio: 'https://vectorart.io',
      },
    },
  },
];

/**
 * Fetch all battle items for TikTokBattleView, merging newly created
 * and database-persisted battles right at the top.
 */
export async function getAllBattleItems(): Promise<BattleItem[]> {
  try {
    const { data: allContests } = await getContests({ includePausedOrBlocked: false });
    const battleContests = (allContests || []).filter(
      (c) => c.type === 'battle' || c.group_size === 2
    );

    const sampleContestIds = new Set(SEED_SAMPLE_BATTLES.map((s) => s.contestId).filter(Boolean));
    const dynamicItems: BattleItem[] = [];

    for (const contest of battleContests) {
      const battle = await getBattle(contest.id);
      if (!battle || !battle.competitors || battle.competitors.length < 2) continue;

      const p1 = battle.competitors[0];
      const p2 = battle.competitors[1];

      dynamicItems.push({
        id: `battle-${contest.id}`,
        contestId: contest.id,
        title: contest.title?.toUpperCase() || '1V1 BATTLE',
        category: contest.categories?.name || 'Showdown Duel',
        timeRemaining: contest.status === 'active' ? 'Voting active' : 'Finished',
        tags: ['Battle', contest.categories?.name || 'Showdown'].filter(Boolean),
        isPopular: Boolean(contest.is_featured),
        sponsorName: 'Community Arena Duel',
        red: {
          id: p1.id,
          name: p1.name || 'Challenger 1',
          author: p1.author || '@challenger1',
          authorAvatar: p1.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          authorBio: 'Challenger 1 in this 1v1 battle showdown.',
          photo: p1.photoUrl || 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80',
          percent: p1.percentage,
          votes: p1.votes || Math.max(1, Math.round((p1.percentage || 50) * 2)),
        },
        green: {
          id: p2.id,
          name: p2.name || 'Challenger 2',
          author: p2.author || '@challenger2',
          authorAvatar: p2.authorAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
          authorBio: 'Challenger 2 in this 1v1 battle showdown.',
          photo: p2.photoUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80',
          percent: p2.percentage,
          votes: p2.votes || Math.max(1, Math.round((p2.percentage || 50) * 2)),
        },
      });
    }

    // User-created and non-sample battles appear FIRST!
    const userCreated = dynamicItems.filter((b) => !sampleContestIds.has(b.contestId));

    // Also update any sample battles with live percentage data from database
    const updatedSamples = SEED_SAMPLE_BATTLES.map((sample) => {
      const live = dynamicItems.find((d) => d.contestId === sample.contestId);
      if (live) {
        return {
          ...sample,
          red: { ...sample.red, percent: live.red.percent, votes: live.red.votes, id: live.red.id },
          green: { ...sample.green, percent: live.green.percent, votes: live.green.votes, id: live.green.id },
        };
      }
      return sample;
    });

    return [...userCreated, ...updatedSamples];
  } catch (err) {
    console.error('Error fetching all battle items:', err);
    return SEED_SAMPLE_BATTLES;
  }
}

