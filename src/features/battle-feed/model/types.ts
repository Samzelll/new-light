// src/features/battle-feed/model/types.ts
export type Corner = 'red' | 'green';

export interface Competitor {
  id: string; // participant id
  name: string;
  handle?: string;
  author?: string;
  photo: string; // URL of the 1080 variant (or a legacy URL)
  photos?: string[];
  width?: number;
  height?: number;
  blurDataURL?: string;
  dominantColor?: string;
  votes: number; // weighted votes, from the server
  percent?: number;
  authorAvatar?: string;
  authorBio?: string;
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    twitter?: string;
    portfolio?: string;
  };
}

export interface BattleItem {
  id: string;
  contestId?: string;
  title?: string;
  category?: string;
  timeRemaining?: string;
  tags?: string[];
  isPopular?: boolean;
  sponsorName?: string;
  red: Competitor;
  green: Competitor;
  myVote?: Corner | null;
}

export interface FeedPage {
  items: BattleItem[];
  nextCursor: string | null;
}

export type VoteTotals = Record<string, number>; // participantId -> weighted votes
