// Trust Score levels as defined in voting-platform-plan-EN.md

export const TRUST_LEVELS = {
  NEW: 'new',
  REGULAR: 'regular',
  TRUSTED: 'trusted',
  SENIOR: 'senior',
} as const;

export type TrustLevel = typeof TRUST_LEVELS[keyof typeof TRUST_LEVELS];

export interface TrustLevelConfig {
  level: TrustLevel;
  label: string;       // Shown to users
  minScore: number;
  maxScore: number;
  voteWeight: [number, number]; // [min, max] vote weight multiplier
  icon: string;        // Emoji icon for badge
  description: string; // Motivational copy shown to user
}

export const TRUST_LEVEL_CONFIG: TrustLevelConfig[] = [
  {
    level: 'new',
    label: 'New Member',
    minScore: 1.0,
    maxScore: 1.9,
    voteWeight: [1, 1],
    icon: '🌱',
    description: 'Welcome! Keep voting to grow your influence.',
  },
  {
    level: 'regular',
    label: 'Regular Member',
    minScore: 2.0,
    maxScore: 5.9,
    voteWeight: [2, 5],
    icon: '⭐',
    description: 'Your vote is getting stronger.',
  },
  {
    level: 'trusted',
    label: 'Trusted Member',
    minScore: 6.0,
    maxScore: 10.9,
    voteWeight: [6, 10],
    icon: '💎',
    description: 'The platform trusts your judgement.',
  },
  {
    level: 'senior',
    label: 'Senior Member',
    minScore: 11.0,
    maxScore: 20.0,
    voteWeight: [11, 20],
    icon: '👑',
    description: 'Your vote carries maximum weight.',
  },
];

export function getLevelByScore(score: number): TrustLevelConfig {
  return (
    TRUST_LEVEL_CONFIG.find((l) => score >= l.minScore && score <= l.maxScore) ||
    TRUST_LEVEL_CONFIG[0]
  );
}
