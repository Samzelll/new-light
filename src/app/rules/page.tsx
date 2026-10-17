"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, ShieldCheck, Zap, Trophy, Gift, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center select-none font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col p-4 pb-20 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between py-2 border-b border-neutral-800">
          <Link
            href="/"
            aria-label="Back to feed"
            className="w-9 h-9 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white transition-all active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-wider text-white">
              Rules & Prizes
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">
              Tournament Code & Rewards
            </p>
          </div>
          <div className="w-9" />
        </header>

        {/* Hero Card */}
        <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#1a120c] to-[#141418] border border-[#ff6a2b]/30 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6a2b]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={20} className="text-[#ff6a2b]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#ff6a2b]">
              Official Standards
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white leading-tight mb-2">
            Fair Play & Anti-Fraud Guarantee
          </h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Every contest runs on weighted trust rounds. Votes are verified against artificial bot spikes and coordinated collusion.
          </p>
        </div>

        {/* Tournament Rules Sections */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 px-1">
            Competition Rules
          </h3>

          <div className="rounded-2xl bg-[#141418] border border-neutral-800/80 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff6a2b]/15 text-[#ff6a2b] flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white mb-0.5">
                  1. One Vote Per Round
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Users may vote once per match or group. Once recorded, your choice is final until the round advances.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-neutral-800/60 pt-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white mb-0.5">
                  2. Reputation Weighted Voting
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  High-trust community members carry higher voting weight. Automated accounts receive zero weighting.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-neutral-800/60 pt-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Award size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white mb-0.5">
                  3. Daily Cycle Advancement
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Rounds advance daily at 06:00 UTC. Top entrants in each group advance to the next knockout tier.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prize Pool Distribution */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 px-1">
            Prizes & Sponsorships
          </h3>

          <div className="rounded-2xl bg-[#141418] border border-neutral-800/80 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Gift size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white">
                  Sponsored Cash Funds
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Transferred via verified crypto or bank escrow within 7 days of final round conclusion.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-amber-400 text-xs font-black block">1st Place</span>
                <span className="text-[10px] text-neutral-300 font-bold block mt-0.5">60% Pool</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-300 text-xs font-black block">2nd Place</span>
                <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">25% Pool</span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-amber-700 text-xs font-black block">3rd Place</span>
                <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">15% Pool</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-3 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ff6a2b]/20 active:scale-98 transition-all"
          >
            <span>Back to Live Arena</span>
            <ArrowLeft size={14} className="rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
