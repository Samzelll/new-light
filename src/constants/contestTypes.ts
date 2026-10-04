// Contest types as defined in voting-platform-plan-EN.md
export const CONTEST_TYPES = {
  STANDARD: 'standard', // Registration → Stages → Final
  BATTLE: 'battle',     // 2 participants, live head-to-head
  RACE: 'race',         // N participants, live leaderboard sprint
  ETERNAL: 'eternal',   // No deadline, vote can be changed
} as const;

export type ContestType = typeof CONTEST_TYPES[keyof typeof CONTEST_TYPES];

// Contest statuses
export const CONTEST_STATUSES = {
  DRAFT: 'draft',
  REGISTRATION: 'registration',
  ACTIVE: 'active',
  PAUSED: 'paused',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ContestStatus = typeof CONTEST_STATUSES[keyof typeof CONTEST_STATUSES];

// Stage statuses
export const STAGE_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

// Participant statuses
export const PARTICIPANT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ELIMINATED: 'eliminated',
} as const;

// Default group size for standard contests
export const DEFAULT_GROUP_SIZE = 6;

// Contest type labels for UI
export const CONTEST_TYPE_LABELS: Record<ContestType, string> = {
  standard: 'Standard',
  battle: 'Battle',
  race: 'Race',
  eternal: 'Eternal',
};

// Human-readable status labels
export const CONTEST_STATUS_LABELS: Record<ContestStatus, string> = {
  draft: 'Draft',
  registration: 'Open for Applications',
  active: 'Voting Active',
  paused: 'Paused',
  blocked: '⚠️ Flagged / Caution',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
