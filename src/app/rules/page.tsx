"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, ShieldCheck, Zap, Trophy, Gift } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col p-4 pb-20 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-2 border-b border-line">
          <Link
            href="/"
            aria-label="Back to feed"
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-2 border border-line flex items-center justify-center text-ink transition-all active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-bold uppercase tracking-wider text-ink font-display">
              Rules & Prizes
            </h1>
            <p className="text-[10px] text-muted font-medium">
              Tournament Code & Rewards
            </p>
          </div>
          <div className="w-9" />
        </header>

        {/* Hero Card */}
        <div className="relative rounded-2xl p-5 bg-surface border border-line shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-accent" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
              Official Standards
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-ink leading-tight mb-2 font-display">
            Fair Play & Anti-Fraud Guarantee
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Every contest runs on weighted trust rounds. Votes are verified against artificial bot spikes and coordinated collusion.
          </p>
        </div>

        {/* Tournament Rules Sections */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
            Competition Rules
          </h3>

          <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-ink mb-0.5">
                  1. One Vote Per Round
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  Users may vote once per match or duel. Once recorded, your choice is active and can be revised at any time before round close.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-line pt-3">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-ink mb-0.5">
                  2. Reputation Weighted Voting
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  High-trust community members carry higher voting weight. Automated bot accounts receive zero weighting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-line pt-3">
              <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Award size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-ink mb-0.5">
                  3. Daily Cycle Advancement
                </h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  Rounds advance daily at 06:00 UTC. Top entrants in each group advance to the next knockout tier.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prize Pool Distribution */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
            Prizes & Sponsorships
          </h3>

          <div className="rounded-2xl bg-surface border border-line p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-2 text-accent flex items-center justify-center shrink-0">
                <Gift size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-ink">
                  Sponsored Cash Funds
                </h4>
                <p className="text-[11px] text-muted">
                  Transferred via verified crypto or bank escrow within 7 days of final round conclusion.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="text-accent text-xs font-bold block">1st Place</span>
                <span className="text-[10px] text-ink font-semibold block mt-0.5">60% Pool</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="text-ink text-xs font-bold block">2nd Place</span>
                <span className="text-[10px] text-muted font-medium block mt-0.5">25% Pool</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line">
                <span className="text-muted text-xs font-bold block">3rd Place</span>
                <span className="text-[10px] text-faint font-medium block mt-0.5">15% Pool</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
          >
            <span>Back to Live Arena</span>
            <ArrowLeft size={14} className="rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
