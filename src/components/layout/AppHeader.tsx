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
    <header className="sticky top-0 z-40 flex items-center justify-between px-3 h-14 bg-bg/95 backdrop-blur-md border-b border-line select-none">
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
        className="tabs flex-1 max-w-[280px] mx-2 relative flex items-center justify-center"
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
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent text-[14px] font-semibold py-2 px-2 transition-colors relative ${
            activeTab === 'contests' ? 'text-ink' : 'text-faint hover:text-ink'
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
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent text-[14px] font-semibold py-2 px-2 transition-colors relative ${
            activeTab === 'feed' ? 'text-ink' : 'text-faint hover:text-ink'
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
          className={`tab focus:outline-none focus-visible:ring-1 focus-visible:ring-accent text-[14px] font-semibold py-2 px-2 transition-colors relative ${
            activeTab === 'battles' ? 'text-ink' : 'text-faint hover:text-ink'
          }`}
        >
          Battles
        </button>

        {/* Sliding 2px Accent Tab Underline */}
        <div className="tab-indicator !bg-accent !h-[2px]" aria-hidden="true" />
      </nav>

      {/* Avatar button (right): 40px, bg-surface-2, ring-2 ring-accent */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open profile menu"
        className="w-10 h-10 rounded-full bg-surface-2 ring-2 ring-accent overflow-hidden relative flex-none shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:opacity-90 transition-opacity"
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
          <div className="w-full h-full flex items-center justify-center bg-surface-2 text-accent">
            <User size={20} strokeWidth={2.2} />
          </div>
        )}
      </button>
    </header>
  );
}

export default AppHeader;
