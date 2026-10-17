"use client";

import React, { useState } from 'react';
import { Sparkles, Zap, ShieldCheck, ChevronRight, Info, Award } from 'lucide-react';
import { TRUST_LEVEL_CONFIG, type TrustLevel } from '@/constants/trustLevels';

export interface TrustTierCardProps {
  score: number;
  contestsVoted?: number;
}

export function TrustTierCard({ score, contestsVoted = 0 }: TrustTierCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Normalize score on 0-1000 scale
  const normalizedScore = Math.max(0, Math.min(1000, score));

  // Determine current tier
  let currentTier = TRUST_LEVEL_CONFIG[0];
  let nextTier = TRUST_LEVEL_CONFIG[1];
  let progressPercent = 0;
  let pointsToNext = 0;

  if (normalizedScore < 200) {
    currentTier = TRUST_LEVEL_CONFIG[0]; // New Member
    nextTier = TRUST_LEVEL_CONFIG[1];    // Regular
    progressPercent = (normalizedScore / 200) * 100;
    pointsToNext = 200 - normalizedScore;
  } else if (normalizedScore < 600) {
    currentTier = TRUST_LEVEL_CONFIG[1]; // Regular Member
    nextTier = TRUST_LEVEL_CONFIG[2];    // Trusted
    progressPercent = ((normalizedScore - 200) / 400) * 100;
    pointsToNext = 600 - normalizedScore;
  } else if (normalizedScore < 900) {
    currentTier = TRUST_LEVEL_CONFIG[2]; // Trusted Member
    nextTier = TRUST_LEVEL_CONFIG[3];    // Senior
    progressPercent = ((normalizedScore - 600) / 300) * 100;
    pointsToNext = 900 - normalizedScore;
  } else {
    currentTier = TRUST_LEVEL_CONFIG[3]; // Senior Member
    nextTier = TRUST_LEVEL_CONFIG[3];
    progressPercent = 100;
    pointsToNext = 0;
  }

  // Weight multiplier string
  const weightMultiplier =
    currentTier.level === 'senior'
      ? '2.0×'
      : currentTier.level === 'trusted'
      ? '1.5×'
      : currentTier.level === 'regular'
      ? '1.2×'
      : '1.0×';

  return (
    <div className="w-full mt-3.5 relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#18181d] to-[#121215] border border-white/[0.08] p-4 shadow-xl">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#ff6a2b]/15 blur-2xl pointer-events-none" />

      {/* Header Row: Current Level + Vote Multiplier Badge */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0" role="img" aria-label={currentTier.label}>
            {currentTier.icon}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">
                {currentTier.label}
              </span>
              <button
                type="button"
                onClick={() => setShowInfo(!showInfo)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded-full"
                aria-label="Trust Score info"
              >
                <Info size={13} />
              </button>
            </div>
            <span className="text-[11px] font-medium text-neutral-400 block leading-none">
              Trust Score: <strong className="text-white tabular-nums">{score}</strong> pts
            </span>
          </div>
        </div>

        {/* Voting Power Multiplier Pill */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff6a2b]/15 border border-[#ff6a2b]/35 shadow-sm">
          <Zap size={12} className="text-[#ff6a2b] fill-[#ff6a2b] shrink-0" />
          <span className="text-[11px] font-black text-[#ff6a2b] tabular-nums tracking-wide">
            {weightMultiplier} Vote Power
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5 mt-3">
        <div
          className="w-full h-2 rounded-full bg-[#202026] overflow-hidden p-0.5 border border-white/[0.04]"
          role="progressbar"
          aria-valuenow={Math.round(progressPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff8a4d] via-[#ff6a2b] to-[#e04500] shadow-[0_0_12px_rgba(255,106,43,0.5)] transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>

        {/* Progress Subtext */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
          <span>{currentTier.label}</span>
          {pointsToNext > 0 ? (
            <span className="text-neutral-300">
              <strong className="text-[#ff6a2b] font-bold tabular-nums">{pointsToNext}</strong> pts to {nextTier.label}
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Award size={11} /> Max Level Reached
            </span>
          )}
        </div>
      </div>

      {/* Expandable Explanation Drawer */}
      {showInfo && (
        <div className="mt-3.5 pt-3 border-t border-neutral-800/80 text-xs text-neutral-300 space-y-2 animate-fade-in">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Your Trust Score increases when you vote consistently and help choose advancing contestants.
            Higher Trust increases your vote&apos;s multiplier from <strong>1.0×</strong> up to <strong>2.0×</strong>.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <div className="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Vote Streak</span>
              <span className="text-xs font-bold text-white">Daily Multiplier</span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/[0.04]">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">High Impact</span>
              <span className="text-xs font-bold text-[#ff6a2b]">Playoff Decider</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrustTierCard;
