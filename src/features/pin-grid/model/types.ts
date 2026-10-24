// src/features/pin-grid/model/types.ts
export type PinStatus = 'pending' | 'ready' | 'failed';

export interface PinItem {
  id: string;
  photo: string;
  title: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  dominantColor?: string;
  subtitle?: string;
  tag?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'orange' | 'amber' | 'neutral';
  isLive?: boolean;
  href?: string;
  onClick?: () => void;
  raw?: any;
}

export interface ColumnAssignment {
  columns: PinItem[][];
  assignedIds: Set<string>;
  columnHeights: number[]; // In aspect ratio units
}

export type RevealReason = 'all' | 'soft' | 'hard';

export interface BatchInfo {
  batchIndex: number;
  pinIds: string[];
  startTime: number;
  revealed: boolean;
  reason?: RevealReason;
}
