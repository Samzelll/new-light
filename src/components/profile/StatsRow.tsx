"use client";

import React from 'react';

export interface StatsRowProps {
  votesCount: number;
  applicationsCount: number;
  winsCount: number;
}

export function StatsRow({ votesCount, applicationsCount, winsCount }: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 my-3.5 w-full" role="region" aria-label="User statistics">
      {/* Votes */}
      <div className="bg-surface border border-line rounded-lg p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="font-display text-[30px] font-bold text-accent tracking-tight tabular-nums leading-none">
          {votesCount}
        </span>
        <span className="text-xs font-semibold text-muted mt-1">
          Votes
        </span>
      </div>

      {/* Entries */}
      <div className="bg-surface border border-line rounded-lg p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="font-display text-[30px] font-bold text-accent tracking-tight tabular-nums leading-none">
          {applicationsCount}
        </span>
        <span className="text-xs font-semibold text-muted mt-1">
          Entries
        </span>
      </div>

      {/* Wins */}
      <div className="bg-surface border border-line rounded-lg p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="font-display text-[30px] font-bold text-accent tracking-tight tabular-nums leading-none">
          {winsCount}
        </span>
        <span className="text-xs font-semibold text-muted mt-1">
          Wins
        </span>
      </div>
    </div>
  );
}

export default StatsRow;
