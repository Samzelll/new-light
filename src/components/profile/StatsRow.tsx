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
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="text-xl sm:text-2xl font-black text-[#ff6a2b] tracking-tight tabular-nums">
          {votesCount}
        </span>
        <span className="text-xs font-semibold text-neutral-400 mt-0.5">
          Votes
        </span>
      </div>

      {/* Entries */}
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="text-xl sm:text-2xl font-black text-[#ff6a2b] tracking-tight tabular-nums">
          {applicationsCount}
        </span>
        <span className="text-xs font-semibold text-neutral-400 mt-0.5">
          Entries
        </span>
      </div>

      {/* Wins */}
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="text-xl sm:text-2xl font-black text-[#ff6a2b] tracking-tight tabular-nums">
          {winsCount}
        </span>
        <span className="text-xs font-semibold text-neutral-400 mt-0.5">
          Wins
        </span>
      </div>
    </div>
  );
}

export default StatsRow;
