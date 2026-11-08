"use client";

import React from 'react';
import Image from 'next/image';
import { SlidersHorizontal, User } from 'lucide-react';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';

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

  const rawResolved = avatarUrl ? resolveImageUrl(avatarUrl, 'avatars') : null;
  const validAvatarUrl =
    rawResolved &&
    (rawResolved.startsWith('http://') ||
      rawResolved.startsWith('https://') ||
      rawResolved.startsWith('data:') ||
      rawResolved.startsWith('/'))
      ? rawResolved
      : null;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-3 sm:px-6 h-14 bg-bg/95 backdrop-blur-md border-b border-line select-none w-full">
      {/* Search / Filter button (left) with indicator dot when filters are active */}
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Search and filters"
        className="w-11 h-11 rounded-full flex items-center justify-center text-accent hover:bg-surface-2 transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <SlidersHorizontal size={20} strokeWidth={2.2} />
        {hasActiveFilters && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent ring-2 ring-bg" />
        )}
      </button>

      {/* Header Tabs (center): Contests, Feed, Battles */}
      <nav
        className="flex-1 max-w-[280px] sm:max-w-[340px] mx-2 relative grid grid-cols-3 items-center text-center h-full"
        role="tablist"
        aria-label="Main navigation"
      >
        <button
          type="button"
          role="tab"
          id="tab-contests"
          aria-selected={activeTab === 'contests'}
          aria-controls="panel-contests"
          onClick={() => onTabChange('contests')}
          className={`w-full py-2.5 px-1 text-[14px] font-semibold transition-colors relative flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
            activeTab === 'contests' ? 'text-ink font-bold' : 'text-faint hover:text-ink'
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
          className={`w-full py-2.5 px-1 text-[14px] font-semibold transition-colors relative flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
            activeTab === 'feed' ? 'text-ink font-bold' : 'text-faint hover:text-ink'
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
          className={`w-full py-2.5 px-1 text-[14px] font-semibold transition-colors relative flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
            activeTab === 'battles' ? 'text-ink font-bold' : 'text-faint hover:text-ink'
          }`}
        >
          Battles
        </button>

        {/* Sliding Dot Indicator (replaces bottom underline) */}
        <div
          className="absolute bottom-1.5 left-0 h-1.5 w-1/3 flex justify-center pointer-events-none transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(${tabIndex * 100}%)`,
          }}
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(196,165,116,0.7)]" />
        </div>
      </nav>

      {/* Avatar profile button (right): 40px, bg-surface-2, harmonized border/ring in brass accent */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open profile menu"
        className="w-10 h-10 rounded-full bg-surface-2 border border-accent/50 ring-1 ring-accent/30 overflow-hidden relative flex-none shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:border-accent hover:ring-accent/50 transition-all cursor-pointer shadow-sm"
      >
        {mounted && validAvatarUrl ? (
          <Image
            src={validAvatarUrl}
            alt={username}
            fill
            unoptimized={shouldBeUnoptimized(validAvatarUrl)}
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2 text-accent font-display font-bold text-sm select-none">
            {username ? username.charAt(0).toUpperCase() : <User size={18} strokeWidth={2.2} />}
          </div>
        )}
      </button>
    </header>
  );
}

export default AppHeader;
