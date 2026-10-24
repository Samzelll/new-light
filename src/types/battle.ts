/**
 * Canonical Battle Feed Types & Interfaces
 */

export type BattleCorner = 'red' | 'green';

export interface CompetitorDetails {
  id: string;
  name: string;
  author: string;
  photo: string;
  photos?: string[];
  percent: number;
  votes?: number;
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
  title: string;
  category: string;
  timeRemaining?: string;
  tags?: string[];
  isPopular?: boolean;
  sponsorName?: string;
  red: CompetitorDetails;
  green: CompetitorDetails;
}

export interface VoteTotals {
  red: number;
  green: number;
}

export interface VoteState {
  corner: BattleCorner;
  status: 'pending' | 'confirmed';
  totals?: VoteTotals;
}

export type PhotosState = 'loading' | 'ready' | 'error';

export interface LiveBattleFeedProps {
  battles: BattleItem[];
  contestsMap?: Record<string, any>;
  battleVotes?: Record<string, BattleCorner>;
  onVote?: (battleId: string, corner: BattleCorner | null) => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
  modalOpen?: boolean;
  activeBattleId?: string | null;
  onActiveBattleChange?: (battleId: string) => void;
}
