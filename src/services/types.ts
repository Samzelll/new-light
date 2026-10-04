/**
 * Data Layer Shapes & Types
 * Defined in docs/DATA_LAYER.md
 */

export type ContestType = 'standard' | 'battle' | 'race' | 'eternal';

export type ContestStatus =
  | 'draft'
  | 'registration'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type StageType =
  | 'registration'
  | 'group_stage'
  | 'swiss_stage'
  | 'playoff_stage'
  | 'finished'
  | 'battle'
  | 'race';

export type EntryStatus =
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'cut'
  | 'active'
  | 'eliminated'
  | 'disqualified';

export interface ContestRuleSection {
  title: string;
  body: string;
}

export interface Contest {
  id: string;
  seriesId?: string;
  title: string;
  description: string | null;
  quickRules: string[];
  rulesSections: ContestRuleSection[];
  prize: string;
  type: ContestType;
  status: ContestStatus;
  categoryId: string | null;
  coverUrl: string;
  isFeatured: boolean;
  registrationStart: string | null;
  registrationEnd: string | null;
  startsAt?: string; // always 06:00 UTC
  minParticipants: number;
  maxParticipants: number | null;
  currentStage: StageType;
  currentRound: number;
  finalParticipants: number;
  groupDays: number;
  advanceCount: number;
  swissEnabled: boolean;
  entriesCount?: number;
  myEntryStatus?: EntryStatus | null;
  isSubscribed?: boolean;
}

export interface EntrySubmissionData {
  photos: string[];
  description?: string;
  socialLinks?: { instagram?: string; tiktok?: string; website?: string };
  sponsor?: { name: string; url: string; productName?: string; buyLink?: string };
  tags?: string[];
}

export interface Entry {
  id: string;
  contestId: string;
  userId: string;
  title: string;
  submissionData: EntrySubmissionData;
  status: 'approved' | 'active' | 'eliminated';
  stageReached?: number;
  finalRank?: number | null;
  submittedAt: string;
}

export interface Revision {
  version: number;
  title: string;
  submissionData: EntrySubmissionData;
  createdAt: string;
}

export type MyEntry = Omit<Entry, 'status'> & {
  status: EntryStatus;
  adminNote?: string | null;
  priority?: boolean;
  revisions?: Revision[];
};

export interface GroupMember {
  participantId: string;
  title: string;
  photo: string;
  rankInGroup: number | null;
  sharePercent: number | null;
  result: 'win' | 'loss' | null;
}

export interface Group {
  id: string;
  contestId: string;
  contestTitle?: string;
  stageType: 'group_stage' | 'swiss_stage' | 'playoff_stage' | 'battle' | 'race';
  roundNumber: number;
  groupNumber: number;
  status: 'active' | 'finished' | 'void';
  startsAt: string;
  endsAt: string;
  extended?: boolean;
  members: GroupMember[];
  myPickId?: string | null;
}

export interface LivePercent {
  groupId: string;
  participantId: string;
  percent: number;
}

export interface VoteHistoryItem {
  votedAt: string;
  contestId: string;
  contestTitle: string;
  stageType: string;
  roundNumber: number;
  groupId: string;
  participantId: string;
  entryTitle: string;
  entryStatus: string;
  groupStatus: string;
  rankInGroup: number | null;
  sharePercent: number | null;
}

export type UserRole = 'user' | 'critic' | 'moderator' | 'admin';

export type TrustLevel = 'new' | 'regular' | 'trusted' | 'senior';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  showParticipations: boolean;
  trustLevel?: TrustLevel;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'NOT_ALLOWED'
  | 'REGISTRATION_CLOSED'
  | 'MATERIAL_REQUIRED'
  | 'ENTRY_LOCKED'
  | 'WITHDRAW_LOCKED'
  | 'VOTING_CLOSED'
  | 'OWN_GROUP'
  | 'INVALID_CANDIDATE'
  | 'NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}
