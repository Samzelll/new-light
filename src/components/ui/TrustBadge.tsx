"use client";

import { getTrustLevel } from '@/utils/trustCalculator';

interface TrustBadgeProps {
  score: number;
}

export function TrustBadge({ score }: TrustBadgeProps) {
  const levelInfo = getTrustLevel(score);

  if (!levelInfo) return null;

  return (
    <span className={`badge ${levelInfo.colorClass} uppercase text-[9px] font-semibold tracking-wider px-2 py-0.5 rounded flex items-center gap-1`}>
      {/* Icon based on level */}
      {levelInfo.key === 'new' && (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      )}
      {levelInfo.key === 'regular' && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
      )}
      {levelInfo.key === 'trusted' && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
      )}
      {levelInfo.key === 'senior' && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
      )}
      
      {levelInfo.label}
    </span>
  );
}
