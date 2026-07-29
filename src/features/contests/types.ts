import { ContestType, ContestStatus } from '@/constants/contestTypes';

export type Visibility = 'public' | 'private';
export type FeedListingStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface Contest {
  id: string;
  title: string;
  description?: string | null;
  type: ContestType;
  category: 'fashion' | 'art' | 'nature' | 'gaming' | 'other';
  visibility: Visibility;
  feed_listing_status: FeedListingStatus;
  status: ContestStatus;
  creator_id: string;
  created_at: string;
  start_date?: string;
  end_date?: string;
  slug?: string | null;
  stages_count?: number | null;
  current_stage?: number | null;
  max_entries_per_user?: number | null;
  max_participants?: number | null;
  participants_count?: number | null;
  approval_required?: boolean | null;
  profiles?: Profile | null;
  voting_percentages?: Record<string, number>;
}

export interface CreateContestPayload {
  title: string;
  description?: string | null;
  type: ContestType;
  visibility: Visibility;
  requestFeedListing: boolean;
  stagesCount?: number;
  postsPerUser?: number;
  maxParticipants?: number | null;
  approvalRequired?: boolean;
  slug?: string | null;
}

export interface Entry {
  id: string;
  contest_id: string;
  user_id: string;
  media_url?: string | null;
  caption?: string | null;
  votes_count: number;
  created_at: string;
}

export interface EntryWithAuthor extends Entry {
  profiles?: Profile | null;
  contests?: Contest | null;
}

export interface SubmitEntryPayload {
  contestId: string;
  mediaUrl?: string;
  caption?: string;
}

export interface VoteEntryPayload {
  entryId: string;
}

export interface Profile {
  id: string;
  username?: string | null;
  display_name?: string | null;
  bio?: string | null;
  role: 'user' | 'expert' | 'moderator' | 'admin' | 'developer' | 'creator';
  avatar_url?: string | null;
  show_participations?: boolean;
  created_at?: string;
  voted_entry_ids?: Record<string, string[]>;
}

export interface UploadEntryMediaPayload {
  file: File;
}

export interface UploadEntryMediaResponse {
  publicUrl: string;
  path: string;
}
