import type {
  Contest,
  Entry,
  MyEntry,
  Group,
  LivePercent,
  VoteHistoryItem,
  Profile,
  Category,
  UserRole,
  TrustLevel,
} from '../types';
import { AppError } from '../types';
import {
  SEED_CATEGORIES,
  SEED_PROFILES,
  SEED_CONTESTS,
  SEED_FEED_GROUPS,
  SEED_BATTLES,
} from './mockStore';
import { timeService } from './timeService';

// Small async delay helper (150-300ms)
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory runtime state with localStorage persistence
class MockState {
  private currentUserId: string = 'usr-admin-01'; // Default admin session for seamless dev experience
  private contests: Contest[] = [...SEED_CONTESTS];
  private feedGroups: Group[] = [...SEED_FEED_GROUPS];
  private battles: Group[] = [...SEED_BATTLES];
  private profiles: Profile[] = [...SEED_PROFILES];
  private subscriptions: Set<string> = new Set(['contest-glamour', 'contest-tennis-apply', 'contest-neon-shinjuku']);
  private myVotes: Map<string, string> = new Map(); // groupId -> participantId
  private userEntries: MyEntry[] = [
    {
      id: 'entry-admin-01',
      contestId: 'contest-glamour',
      userId: 'usr-admin-01',
      title: 'MISS GLAMOUR',
      submissionData: {
        photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80'],
        description: 'Portrait under soft studio lighting.',
      },
      status: 'approved',
      submittedAt: '2026-09-21T12:00:00Z',
    },
    {
      id: 'entry-admin-02',
      contestId: 'contest-photo-month',
      userId: 'usr-admin-01',
      title: 'PHOTO OF THE MONTH',
      submissionData: {
        photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80'],
        description: 'Lead shot of the September season.',
      },
      status: 'active',
      submittedAt: '2026-09-17T15:00:00Z',
    },
  ];

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  setCurrentUser(id: string | null) {
    this.currentUserId = id || '';
  }

  getContests() {
    return this.contests;
  }

  getFeedGroups() {
    return this.feedGroups;
  }

  getBattles() {
    return this.battles;
  }

  getProfiles() {
    return this.profiles;
  }

  getSubscriptions() {
    return this.subscriptions;
  }

  getMyVotes() {
    return this.myVotes;
  }

  getUserEntries() {
    return this.userEntries;
  }
}

const state = new MockState();

// ── 1. authService ──────────────────────────────────────────────────────────
export const authService = {
  async signInWithEmail(email: string): Promise<{ ok: boolean }> {
    await delay();
    return { ok: true };
  },

  async verifyOtp(email: string, code: string): Promise<{ session: { user: { id: string; email: string } } }> {
    await delay();
    if (code !== '000000' && code.length !== 6) {
      throw new AppError('AUTH_REQUIRED', 'Invalid verification code (enter 000000 for test mode)');
    }
    const id = `usr_${email.split('@')[0]}`;
    state.setCurrentUser(id);
    return { session: { user: { id, email } } };
  },

  async signOut(): Promise<void> {
    await delay(100);
    state.setCurrentUser(null);
  },

  async getSession(): Promise<{ user: { id: string; email: string } | null }> {
    await delay(50);
    const userId = state.getCurrentUserId();
    if (!userId) return { user: null };
    const p = state.getProfiles().find((u) => u.id === userId);
    return { user: { id: userId, email: `${p?.username || 'user'}@opinion.net` } };
  },

  devSignInAs(kind: 'guest' | 'user' | 'entrant' | 'moderator' | 'admin'): Profile | null {
    if (kind === 'guest') {
      state.setCurrentUser(null);
      return null;
    }
    const roleMap: Record<string, string> = {
      admin: 'usr-admin-01',
      moderator: 'usr-mod-01',
      entrant: 'usr-entrant-01',
      user: 'usr-user-01',
    };
    const targetId = roleMap[kind] || 'usr-admin-01';
    state.setCurrentUser(targetId);
    return state.getProfiles().find((p) => p.id === targetId) || null;
  },
};

// ── 2. contestService ───────────────────────────────────────────────────────
export interface ListContestsParams {
  tab?: 'contests' | 'battles';
  search?: string;
  categoryId?: string | null;
  status?: string | null;
  sort?: 'popular' | 'for_you' | 'ending_soon';
  subscribedOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export const contestService = {
  async listContests(params: ListContestsParams = {}): Promise<{ items: Contest[]; nextCursor: string | null }> {
    await delay();
    let result = [...state.getContests()];

    // Tab filter
    if (params.tab === 'battles') {
      result = result.filter((c) => c.type === 'battle' || c.type === 'race');
    }

    // Category
    if (params.categoryId && params.categoryId !== 'all' && params.categoryId !== 'cat-all') {
      result = result.filter((c) => c.categoryId === params.categoryId);
    }

    // Status
    if (params.status && params.status !== 'all') {
      result = result.filter((c) => c.status === params.status);
    }

    // Search
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)));
    }

    // Subscribed only
    if (params.subscribedOnly) {
      result = result.filter((c) => state.getSubscriptions().has(c.id));
    }

    // Sort
    if (params.sort === 'ending_soon') {
      result.sort((a, b) => (a.registrationEnd || '').localeCompare(b.registrationEnd || ''));
    }

    // Attach convenience fields
    const items = result.map((c) => ({
      ...c,
      isSubscribed: state.getSubscriptions().has(c.id),
    }));

    return { items, nextCursor: null };
  },

  async getContest(id: string): Promise<Contest> {
    await delay(120);
    const contest = state.getContests().find((c) => c.id === id);
    if (!contest) {
      throw new AppError('UNKNOWN', 'Contest not found');
    }
    return {
      ...contest,
      isSubscribed: state.getSubscriptions().has(contest.id),
    };
  },

  async getCategories(): Promise<Category[]> {
    return SEED_CATEGORIES;
  },

  async getStagePlan(contestId: string): Promise<{
    stageList: string[];
    currentRound: number;
    timeToClose: string;
  }> {
    await delay();
    return {
      stageList: ['Registration', 'Group Stage', 'Playoffs', 'Final'],
      currentRound: 3,
      timeToClose: timeService.formatTimeUntil(timeService.nextCycleBoundary()),
    };
  },

  async subscribe(contestId: string): Promise<{ ok: boolean }> {
    await delay(100);
    state.getSubscriptions().add(contestId);
    return { ok: true };
  },

  async unsubscribe(contestId: string): Promise<{ ok: boolean }> {
    await delay(100);
    state.getSubscriptions().delete(contestId);
    return { ok: true };
  },
};

// ── 3. entryService ─────────────────────────────────────────────────────────
export const entryService = {
  async listEntries(contestId: string): Promise<Entry[]> {
    await delay();
    return state
      .getUserEntries()
      .filter(
        (e) =>
          e.contestId === contestId &&
          (e.status === 'approved' || e.status === 'active' || e.status === 'eliminated')
      )
      .map((e) => ({
        id: e.id,
        contestId: e.contestId,
        userId: e.userId,
        title: e.title,
        submissionData: e.submissionData,
        status: e.status as 'approved' | 'active' | 'eliminated',
        stageReached: e.stageReached,
        finalRank: e.finalRank,
        submittedAt: e.submittedAt,
      }));
  },

  async getMyEntry(contestId: string): Promise<MyEntry | null> {
    await delay();
    const userId = state.getCurrentUserId();
    if (!userId) return null;
    return state.getUserEntries().find((e) => e.contestId === contestId && e.userId === userId) || null;
  },

  async submitEntry(contestId: string, payload: { title: string; photos: string[]; description?: string }): Promise<{ id: string }> {
    await delay(250);
    const userId = state.getCurrentUserId();
    if (!userId) throw new AppError('AUTH_REQUIRED', 'Please sign in to submit an entry');
    if (!payload.title.trim() || payload.photos.length === 0) {
      throw new AppError('MATERIAL_REQUIRED', 'A title and at least one photo are required');
    }

    const contest = state.getContests().find((c) => c.id === contestId);
    if (contest && contest.status !== 'registration') {
      throw new AppError('REGISTRATION_CLOSED', 'Registration is closed');
    }

    const newId = `entry_${Date.now()}`;
    const newEntry: MyEntry = {
      id: newId,
      contestId,
      userId,
      title: payload.title.trim(),
      submissionData: {
        photos: payload.photos,
        description: payload.description?.trim() || '',
      },
      status: 'approved',
      submittedAt: timeService.nowIso(),
    };

    state.getUserEntries().push(newEntry);
    return { id: newId };
  },

  async withdrawEntry(id: string): Promise<{ ok: boolean }> {
    await delay(180);
    const entry = state.getUserEntries().find((e) => e.id === id);
    if (!entry) throw new AppError('UNKNOWN', 'Entry not found');
    entry.status = 'withdrawn';
    return { ok: true };
  },
};

// ── 4. feedService (Group voting of 4 - core loop!) ─────────────────────────
export const feedService = {
  async getNextGroups(params: { limit?: number } = {}): Promise<Group[]> {
    await delay(180);
    // Groups of 4 served with fewest votes or active
    const groups = state.getFeedGroups();
    return groups.map((g) => ({
      ...g,
      myPickId: state.getMyVotes().get(g.id) || null,
    }));
  },

  async getGroup(groupId: string): Promise<Group> {
    await delay(100);
    const g = state.getFeedGroups().find((grp) => grp.id === groupId);
    if (!g) throw new AppError('UNKNOWN', 'Group not found');
    return {
      ...g,
      myPickId: state.getMyVotes().get(g.id) || null,
    };
  },
};

// ── 5. voteService ──────────────────────────────────────────────────────────
export const voteService = {
  async castVote(groupId: string, participantId: string): Promise<{ ok: boolean; myPickId: string }> {
    await delay(150);
    const userId = state.getCurrentUserId();
    if (!userId) throw new AppError('AUTH_REQUIRED', 'Please sign in to vote');

    // Store voter's choice
    state.getMyVotes().set(groupId, participantId);
    return { ok: true, myPickId: participantId };
  },

  async getLivePercents(groupId: string): Promise<LivePercent[]> {
    await delay(100);
    // For live battle / race
    const battle = state.getBattles().find((b) => b.id === groupId);
    if (battle) {
      return battle.members.map((m) => ({
        groupId,
        participantId: m.participantId,
        percent: m.sharePercent || 50,
      }));
    }
    return [
      { groupId, participantId: 'p1', percent: 62.4 },
      { groupId, participantId: 'p2', percent: 37.6 },
    ];
  },

  async getMyVoteHistory(): Promise<VoteHistoryItem[]> {
    await delay();
    return [
      {
        votedAt: '2026-10-02T12:00:00Z',
        contestId: 'contest-glamour',
        contestTitle: 'MISS GLAMOUR',
        stageType: 'group_stage',
        roundNumber: 3,
        groupId: 'group-feed-01',
        participantId: 'p-f01-1',
        entryTitle: 'Flash in the Dark',
        entryStatus: 'active',
        groupStatus: 'active',
        rankInGroup: null,
        sharePercent: null,
      },
      {
        votedAt: '2026-10-01T15:30:00Z',
        contestId: 'contest-neon-shinjuku',
        contestTitle: 'NEON SHINJUKU',
        stageType: 'battle',
        roundNumber: 1,
        groupId: 'battle-live-01',
        participantId: 'b-01-red',
        entryTitle: 'Manhattan sunset',
        entryStatus: 'active',
        groupStatus: 'active',
        rankInGroup: 1,
        sharePercent: 62.4,
      },
    ];
  },

  async castEternalVote(contestId: string, participantId: string): Promise<{ ok: boolean }> {
    await delay(100);
    state.getMyVotes().set(contestId, participantId);
    return { ok: true };
  },
};

// ── 6. profileService ───────────────────────────────────────────────────────
export const profileService = {
  async getProfile(id?: string): Promise<Profile> {
    await delay(100);
    const targetId = id || state.getCurrentUserId() || 'usr-admin-01';
    const profile = state.getProfiles().find((p) => p.id === targetId) || state.getProfiles()[0];
    return profile;
  },

  async updateProfile(updates: Partial<Pick<Profile, 'displayName' | 'bio' | 'avatarUrl' | 'showParticipations'>>): Promise<Profile> {
    await delay(200);
    const currentId = state.getCurrentUserId() || 'usr-admin-01';
    let profile = state.getProfiles().find((p) => p.id === currentId);
    if (!profile) {
      profile = state.getProfiles()[0];
    }
    if (updates.displayName !== undefined) profile.displayName = updates.displayName;
    if (updates.bio !== undefined) profile.bio = updates.bio;
    if (updates.avatarUrl !== undefined) profile.avatarUrl = updates.avatarUrl;
    if (updates.showParticipations !== undefined) profile.showParticipations = updates.showParticipations;
    return profile;
  },

  async getMyLevel(): Promise<TrustLevel> {
    await delay(50);
    const p = await this.getProfile();
    return p.trustLevel || 'senior';
  },

  async getMyEntries(): Promise<MyEntry[]> {
    await delay(120);
    const userId = state.getCurrentUserId();
    return state.getUserEntries().filter((e) => e.userId === userId);
  },

  async getFollowing(): Promise<Contest[]> {
    await delay(120);
    const subs = state.getSubscriptions();
    return state.getContests().filter((c) => subs.has(c.id));
  },
};

// ── 7. adminService ─────────────────────────────────────────────────────────
export const adminService = {
  async createContest(input: Partial<Contest>): Promise<{ id: string }> {
    await delay(250);
    const id = `contest_${Date.now()}`;
    const newContest: Contest = {
      id,
      title: input.title || 'New Contest',
      description: input.description || '',
      quickRules: input.quickRules || ['Rule 1', 'Rule 2', 'Rule 3'],
      rulesSections: input.rulesSections || [{ title: 'Terms', body: 'Description of terms' }],
      prize: input.prize || '$1,000',
      type: input.type || 'standard',
      status: 'registration',
      categoryId: input.categoryId || 'cat-portrait',
      coverUrl: input.coverUrl || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1080&q=80',
      isFeatured: false,
      registrationStart: timeService.nowIso(),
      registrationEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
      minParticipants: 32,
      maxParticipants: 64,
      currentStage: 'registration',
      currentRound: 0,
      finalParticipants: 8,
      groupDays: 4,
      advanceCount: 8,
      swissEnabled: false,
    };
    state.getContests().unshift(newContest);
    return { id };
  },

  async updateContest(id: string, patch: Partial<Contest>): Promise<{ ok: boolean }> {
    await delay(180);
    const contest = state.getContests().find((c) => c.id === id);
    if (contest) Object.assign(contest, patch);
    return { ok: true };
  },

  async setContestStatus(id: string, status: Contest['status']): Promise<{ ok: boolean }> {
    await delay(150);
    const contest = state.getContests().find((c) => c.id === id);
    if (contest) contest.status = status;
    return { ok: true };
  },

  async listFlags(): Promise<any[]> {
    await delay(100);
    return [];
  },

  async resolveFlag(id: string, action: string): Promise<{ ok: boolean }> {
    await delay(100);
    return { ok: true };
  },
};

// ── 8. storageService ───────────────────────────────────────────────────────
export const storageService = {
  async uploadEntryPhoto(file: File): Promise<{ url: string }> {
    await delay(300);
    const mockUrl = URL.createObjectURL(file);
    return { url: mockUrl };
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    await delay(250);
    const mockUrl = URL.createObjectURL(file);
    return { url: mockUrl };
  },
};

// Re-export timeService
export { timeService };
