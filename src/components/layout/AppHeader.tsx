"use client";

import React from 'react';
import Image from 'next/image';
import { SlidersHorizontal, User } from 'lucide-react';

export interface AppHeaderProps {
  activeTab: 'contests' | 'feed' | 'battles';
  onTabChange: (tab: 'contests' | 'feed' | 'battles') => void;
  onOpenFilters: () => void;
  onOpenDrawer: () => void;
  hasActiveFilters?: boolean;
  avatarUrl?: string | null;
  username?: string;
}

export function AppHeader({
  activeTab,
  onTabChange,
  onOpenFilters,
  onOpenDrawer,
  hasActiveFilters = false,
  avatarUrl,
  username = 'user',
}: AppHeaderProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const tabIndex = activeTab === 'contests' ? 0 : activeTab === 'feed' ? 1 : 2;

  return (
    <header className="app-header justify-between select-none">
      {/* Search / Filter button (left) with data-dot="true" when filters are active */}
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Search and filters"
        data-dot={hasActiveFilters ? 'true' : 'false'}
        className="icon-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <SlidersHorizontal size={20} strokeWidth={2.2} />
      </button>

      {/* Header Tabs (center): Contests, Feed, Battles */}
      <nav
        className="tabs flex-1 max-w-[270px] mx-1"
        role="tablist"
        aria-label="Main navigation"
        style={{
          '--tab-count': '3',
          '--tab-index': tabIndex.toString(),
        } as React.CSSProperties}
      >
        <button
          type="button"
          role="tab"
          id="tab-contests"
          aria-selected={activeTab === 'contests'}
          aria-controls="panel-contests"
          onClick={() => onTabChange('contests')}
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded text-[12px] sm:text-[13px] px-1 transition-all ${
            activeTab === 'contests' ? 'font-bold text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Contests
        </button>

        <button
          type="button"
          role="tab"
          id="tab-feed"
          aria-selected={activeTab === 'feed'}
          aria-controls="panel-feed"
          onClick={() => onTabChange('feed')}
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded text-[12px] sm:text-[13px] px-1 transition-all ${
            activeTab === 'feed' ? 'font-bold text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Feed
        </button>

        <button
          type="button"
          role="tab"
          id="tab-battles"
          aria-selected={activeTab === 'battles'}
          aria-controls="panel-battles"
          onClick={() => onTabChange('battles')}
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded text-[12px] sm:text-[13px] px-1 transition-all ${
            activeTab === 'battles' ? 'font-bold text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Battles
        </button>

        {/* Sliding Tab Indicator */}
        <div className="tab-indicator" aria-hidden="true" />
      </nav>

      {/* Avatar button (right) that opens the side drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open profile menu"
        className="avatar h-10 w-10 flex-none shrink-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:border-accent-solid transition-colors"
      >
        {mounted && avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={username}
            fill
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-solid to-accent text-ink">
            <User size={20} strokeWidth={2.2} />
          </div>
        )}
      </button>
    </header>
  );
}

export default AppHeader;
