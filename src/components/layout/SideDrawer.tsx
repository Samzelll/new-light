"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  X,
  User,
  Vote,
  FileText,
  Star,
  Award,
  HelpCircle,
  PlusCircle,
  Shield,
  FastForward,
  Users,
  Search,
  Swords,
  Flame,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import type { Profile, UserRole } from '@/services/types';
import { timeService } from '@/services/mock/timeService';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSwitchUser?: (kind: 'guest' | 'user' | 'entrant' | 'moderator' | 'admin' | 'creator') => void;
  onAdvanceCycle?: () => void;
}

export function SideDrawer({
  isOpen,
  onClose,
  profile,
  onSwitchUser,
  onAdvanceCycle,
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeProfile = mounted ? profile : null;
  const isAdminOrMod = activeProfile && (activeProfile.role === 'admin' || activeProfile.role === 'moderator');
  const showDevTools = process.env.NODE_ENV === 'development';
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = drawerRef.current;
        if (!dialog) return;

        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Scrim (backdrop) */}
      <div
        className="scrim"
        data-open={isOpen ? 'true' : 'false'}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Side menu"
        className="drawer bg-surface-2 overflow-y-auto flex flex-col justify-between border-l border-line shadow-[-24px_0_80px_rgba(0,0,0,0.5)]"
        data-open={isOpen ? 'true' : 'false'}
      >
        <div className="space-y-6">
          {/* Header row with close button */}
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <span className="text-faint uppercase text-[11px] font-semibold tracking-wide">
              Opinion Net Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="h-8 w-8 rounded-full text-muted hover:text-ink flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* User profile preview banner */}
          {activeProfile ? (
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface hover:bg-surface-2 border border-line transition-colors group shadow-sm"
            >
              <div className="w-11 h-11 rounded-full bg-surface-2 ring-2 ring-accent overflow-hidden relative flex-none">
                {(() => {
                  const raw = (activeProfile as any)?.avatar_url || activeProfile?.avatarUrl;
                  const resolved = raw ? resolveImageUrl(raw, 'avatars') : null;
                  const isValid = resolved && (resolved.startsWith('http://') || resolved.startsWith('https://') || resolved.startsWith('data:') || resolved.startsWith('/'));
                  return isValid ? (
                    <Image
                      src={resolved}
                      alt={(activeProfile as any)?.display_name || activeProfile?.displayName || activeProfile?.username || 'User'}
                      fill
                      unoptimized={shouldBeUnoptimized(resolved)}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-2 text-accent">
                      <User size={20} strokeWidth={2} />
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ink truncate group-hover:text-accent transition-colors">
                  {(activeProfile as any).display_name || activeProfile.displayName || activeProfile.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-faint truncate">
                    @{activeProfile.username}
                  </span>
                  {isAdminOrMod && (
                    <span className="bg-accent/15 text-accent-soft text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      {activeProfile.role === 'admin' ? 'Admin' : 'Moderator'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="p-3 rounded-xl bg-surface border border-line text-center space-y-2">
              <p className="text-xs text-muted">Browsing as guest</p>
              <Link
                href="/auth"
                onClick={onClose}
                className="block w-full py-2 px-3 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="space-y-1" aria-label="Primary navigation">
            <p className="px-2 pb-1 text-faint uppercase text-[11px] font-semibold tracking-wide">
              Navigate
            </p>
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <Vote size={18} className="text-accent" strokeWidth={2.2} />
              <span>Explore Contests</span>
            </Link>

            <Link
              href="/search"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <Search size={18} className="text-muted" strokeWidth={2} />
              <span>Search & Discover</span>
            </Link>

            <Link
              href="/?tab=battles"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <Swords size={18} className="text-muted" strokeWidth={2} />
              <span>Live Battles</span>
            </Link>

            <Link
              href="/?tab=feed"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <Flame size={18} className="text-muted" strokeWidth={2} />
              <span>Media Feed</span>
            </Link>

            {activeProfile && (
              <>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
                >
                  <User size={18} className="text-muted" strokeWidth={2} />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/profile?tab=votes"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
                >
                  <CheckCircle2 size={18} className="text-muted" strokeWidth={2} />
                  <span>My Votes</span>
                </Link>

                <Link
                  href="/profile?tab=favorites"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
                >
                  <Bookmark size={18} className="text-muted" strokeWidth={2} />
                  <span>Favorites & Saved</span>
                </Link>
              </>
            )}

            <Link
              href="/rules"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <Award size={18} className="text-muted" strokeWidth={2} />
              <span>Rules & Prizes</span>
            </Link>

            <Link
              href="/onboarding"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
            >
              <HelpCircle size={18} className="text-muted" strokeWidth={2} />
              <span>How It Works</span>
            </Link>
          </nav>

          {/* Admin / Creator / Moderator Tools */}
          {(isAdminOrMod || activeProfile?.role === 'creator') && (
            <div className="pt-4 border-t border-line space-y-2">
              <span className="text-faint uppercase text-[11px] font-semibold tracking-wide block px-2">
                Management & Tools
              </span>
              <Link
                href="/create"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-accent hover:bg-surface transition-colors text-sm font-semibold"
              >
                <PlusCircle size={18} strokeWidth={2.2} />
                <span>Create Contest</span>
              </Link>
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-ink hover:bg-surface transition-colors text-sm font-medium"
              >
                <Shield size={18} strokeWidth={2.2} className="text-accent" />
                <span>
                  {activeProfile?.role === 'creator' ? 'Creator Studio' : 'Admin & Post-Production'}
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* Dev Tools Footer (Quick Role Switcher) */}
        {showDevTools && <div className="pt-6 border-t border-line mt-6 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span className="flex items-center gap-1 font-bold">
              <Users size={12} />
              <span>Dev Switcher</span>
            </span>
            <span className="tabular-nums">06:00 UTC</span>
          </div>

          {/* User role quick switcher: Admin / Creator / User / Guest */}
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => onSwitchUser?.('admin')}
              className={`p-1.5 rounded-lg text-center font-bold border transition-colors ${
                profile?.role === 'admin'
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('creator')}
              className={`p-1.5 rounded-lg text-center font-bold border transition-colors ${
                profile?.role === 'creator'
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
            >
              Creator
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('user')}
              className={`p-1.5 rounded-lg text-center font-bold border transition-colors ${
                profile?.role === 'user'
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('guest')}
              className={`p-1.5 rounded-lg text-center font-bold border transition-colors ${
                !profile
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
            >
              Guest
            </button>
          </div>

          {/* Jump to next cycle button */}
          <button
            type="button"
            onClick={onAdvanceCycle}
            className="w-full py-2 px-3 rounded-lg bg-surface border border-line hover:border-accent text-muted hover:text-accent font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <FastForward size={14} />
            <span>Advance to 06:00 UTC</span>
          </button>
        </div>}
      </aside>
    </>
  );
}

export default SideDrawer;
