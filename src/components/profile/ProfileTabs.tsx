"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface ApplicationItem {
  id: string;
  contestId: string;
  contestTitle: string;
  votesCount?: number;
  rankText?: string;
  status: 'voting' | 'completed' | 'approved' | 'pending' | 'rejected' | string;
  photoUrl?: string | null;
  placeholderColor?: string;
}

export interface VoteItem {
  id: string;
  contestId: string;
  contestTitle: string;
  trustWeight?: number;
  dateText: string;
  photoUrl?: string | null;
}

export interface SubscriptionItem {
  id: string;
  contestId: string;
  contestTitle: string;
  metaText: string;
  statusText: string;
  statusType?: 'voting' | 'registration' | 'completed' | string;
  photoUrl?: string | null;
}

export interface ProfileTabsProps {
  activeTab: 'applications' | 'votes' | 'subscriptions';
  onTabChange: (tab: 'applications' | 'votes' | 'subscriptions') => void;
  applications: ApplicationItem[];
  votes: VoteItem[];
  subscriptions: SubscriptionItem[];
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  applications,
  votes,
  subscriptions,
}: ProfileTabsProps) {
  // Helper for status pill rendering
  const renderStatusPill = (status: string) => {
    switch (status.toLowerCase()) {
      case 'voting':
      case 'active':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-[#ff6a2b] text-white shadow-sm">
            Voting
          </span>
        );
      case 'winner':
      case 'victory':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-black bg-white text-black shadow-sm">
            Winner
          </span>
        );
      case 'approved':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/35">
            Pending
          </span>
        );
      case 'completed':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
            Completed
          </span>
        );
      case 'registration':
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-[#ff6a2b]/20 text-[#ff6a2b] border border-[#ff6a2b]/40">
            Registration
          </span>
        );
      default:
        return (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col mt-2">
      {/* ── Tabs Navigation Bar ── */}
      {/* Three tabs: Entries, Votes (n), Following (n) */}
      <div className="flex border-b border-neutral-800/80 mb-3" role="tablist">
        {/* Tab 1: Entries */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'applications'}
          onClick={() => onTabChange('applications')}
          className={`flex-1 text-center py-2.5 font-bold text-sm sm:text-base transition-colors border-b-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] ${
            activeTab === 'applications'
              ? 'border-[#ff6a2b] text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Entries
        </button>

        {/* Tab 2: Votes (n) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'votes'}
          onClick={() => onTabChange('votes')}
          className={`flex-1 text-center py-2.5 font-bold text-sm sm:text-base transition-colors border-b-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] ${
            activeTab === 'votes'
              ? 'border-[#ff6a2b] text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Votes ({votes.length})
        </button>

        {/* Tab 3: Following (n) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'subscriptions'}
          onClick={() => onTabChange('subscriptions')}
          className={`flex-1 text-center py-2.5 font-bold text-sm sm:text-base transition-colors border-b-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] ${
            activeTab === 'subscriptions'
              ? 'border-[#ff6a2b] text-white'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Following ({subscriptions.length})
        </button>
      </div>

      {/* ── Tab Panels ── */}
      <div className="flex flex-col space-y-2.5">
        {/* ── 1. Entries List ── */}
        {activeTab === 'applications' && (
          applications.length === 0 ? (
            <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-8 text-center my-2">
              <span className="text-3xl block mb-2" role="img" aria-label="Inbox">📝</span>
              <p className="text-sm text-neutral-400 font-medium">
                No entries yet. Submit an application in open contests.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#ff6a2b] hover:text-[#ff854d]"
              >
                Browse contests →
              </Link>
            </div>
          ) : (
            applications.map((item) => (
              <Link
                key={item.id}
                href={`/contest/${item.contestId}`}
                className="bg-[#141418] border border-neutral-800/80 hover:border-neutral-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all active:scale-[0.99] group"
              >
                {/* 40px Thumbnail */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-neutral-800/80 bg-neutral-900 flex items-center justify-center">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.contestTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${
                        item.placeholderColor || 'bg-gradient-to-br from-pink-500 to-rose-600'
                      }`}
                    />
                  )}
                </div>

                {/* Uppercase Title + One-line Meta */}
                <div className="flex-1 min-w-0 pr-1">
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight truncate leading-tight">
                    {item.contestTitle}
                  </h2>
                  <p className="text-xs text-neutral-400 truncate mt-0.5 leading-snug">
                    {item.votesCount !== undefined ? `${item.votesCount.toLocaleString('en-US')} votes` : ''}
                    {item.votesCount !== undefined && item.rankText ? ' · ' : ''}
                    {item.rankText || ''}
                  </p>
                </div>

                {/* Status Pill */}
                {renderStatusPill(item.status)}
              </Link>
            ))
          )
        )}

        {/* ── 2. Votes List ── */}
        {activeTab === 'votes' && (
          votes.length === 0 ? (
            <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-8 text-center my-2">
              <span className="text-3xl block mb-2" role="img" aria-label="Ballot">🗳️</span>
              <p className="text-sm text-neutral-400 font-medium">
                No votes cast yet. Vote in battles to build reputation.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#ff6a2b] hover:text-[#ff854d]"
              >
                Vote in battles →
              </Link>
            </div>
          ) : (
            votes.map((vote) => (
              <Link
                key={vote.id}
                href={`/contest/${vote.contestId}`}
                className="bg-[#141418] border border-neutral-800/80 hover:border-neutral-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all active:scale-[0.99] group"
              >
                {/* 40px Thumbnail */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-neutral-800/80 bg-neutral-900 flex items-center justify-center">
                  {vote.photoUrl ? (
                    <Image
                      src={vote.photoUrl}
                      alt={vote.contestTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700" />
                  )}
                </div>

                {/* Uppercase Title + One-line Meta */}
                <div className="flex-1 min-w-0 pr-1">
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight truncate leading-tight">
                    {vote.contestTitle}
                  </h2>
                  <p className="text-xs text-neutral-400 truncate mt-0.5 leading-snug">
                    {vote.dateText}
                    {vote.trustWeight ? ` · Weight ×${vote.trustWeight}` : ''}
                  </p>
                </div>

                {/* Status Pill */}
                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-[#ff6a2b] text-white shadow-sm">
                  Voting
                </span>
              </Link>
            ))
          )
        )}

        {/* ── 3. Following List ── */}
        {activeTab === 'subscriptions' && (
          subscriptions.length === 0 ? (
            <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-8 text-center my-2">
              <span className="text-3xl block mb-2" role="img" aria-label="Star">⭐</span>
              <p className="text-sm text-neutral-400 font-medium">
                You are not following any contests yet.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#ff6a2b] hover:text-[#ff854d]"
              >
                Find contests →
              </Link>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <Link
                key={sub.id}
                href={`/contest/${sub.contestId}`}
                className="bg-[#141418] border border-neutral-800/80 hover:border-neutral-700/80 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all active:scale-[0.99] group"
              >
                {/* 40px Thumbnail */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-neutral-800/80 bg-neutral-900 flex items-center justify-center">
                  {sub.photoUrl ? (
                    <Image
                      src={sub.photoUrl}
                      alt={sub.contestTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-700" />
                  )}
                </div>

                {/* Uppercase Title + One-line Meta */}
                <div className="flex-1 min-w-0 pr-1">
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight truncate leading-tight">
                    {sub.contestTitle}
                  </h2>
                  <p className="text-xs text-neutral-400 truncate mt-0.5 leading-snug">
                    {sub.metaText}
                  </p>
                </div>

                {/* Status Pill */}
                {renderStatusPill(sub.statusText)}
              </Link>
            ))
          )
        )}
      </div>
    </div>
  );
}

export default ProfileTabs;
