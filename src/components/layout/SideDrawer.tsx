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
} from 'lucide-react';
import type { Profile, UserRole } from '@/services/types';
import { timeService } from '@/services/mock/timeService';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSwitchUser?: (kind: 'guest' | 'user' | 'entrant' | 'moderator' | 'admin') => void;
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
        className="drawer overflow-y-auto flex flex-col justify-between"
        data-open={isOpen ? 'true' : 'false'}
      >
        <div className="space-y-6">
          {/* Header row with close button */}
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <span className="font-display text-caption font-bold uppercase tracking-wider text-muted">
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
              className="flex items-center gap-3 p-2 rounded-lg bg-surface hover:bg-surface/80 border border-ink/5 transition-colors group"
            >
              <div className="avatar h-12 w-12 flex-none">
                {((activeProfile as any).avatar_url || activeProfile.avatarUrl) ? (
                  <Image
                    src={(activeProfile as any).avatar_url || activeProfile.avatarUrl}
                    alt={(activeProfile as any).display_name || activeProfile.displayName || activeProfile.username}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-accent-solid text-ink">
                    <User size={22} strokeWidth={2} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-ink truncate group-hover:text-accent transition-colors">
                  {(activeProfile as any).display_name || activeProfile.displayName || activeProfile.username}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-caption text-faint truncate">
                    @{activeProfile.username}
                  </span>
                  {isAdminOrMod && (
                    <span className="pill pill-soft text-[10px] px-1.5 py-0 font-bold uppercase">
                      {activeProfile.role === 'admin' ? 'Admin' : 'Moderator'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="p-3 rounded-lg bg-surface border border-ink/5 text-center space-y-2">
              <p className="text-caption text-muted">Browsing as guest</p>
              <Link
                href="/auth"
                onClick={onClose}
                className="btn btn-primary btn-sm btn-block text-xs"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/profile"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <User size={18} className="text-accent" strokeWidth={2.2} />
              <span>My Profile</span>
            </Link>

            <Link
              href="/profile?tab=votes"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <Vote size={18} className="text-accent" strokeWidth={2.2} />
              <span>My Votes</span>
            </Link>

            <Link
              href="/profile?tab=applications"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <FileText size={18} className="text-accent" strokeWidth={2.2} />
              <span>My Entries</span>
            </Link>

            <Link
              href="/profile?tab=subscriptions"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <Star size={18} className="text-accent" strokeWidth={2.2} />
              <span>Favorites</span>
            </Link>

            <Link
              href="/rules"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <Award size={18} className="text-muted" strokeWidth={2} />
              <span>Rules & Prizes</span>
            </Link>

            <Link
              href="/onboarding"
              onClick={onClose}
              className="menu-item flex items-center gap-3"
            >
              <HelpCircle size={18} className="text-muted" strokeWidth={2} />
              <span>How It Works</span>
            </Link>
          </nav>

          {/* Admin / Moderator Tools (only visible for those roles) */}
          {isAdminOrMod && (
            <div className="pt-4 border-t border-ink/10 space-y-2">
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-faint block px-2">
                Staff Tools
              </span>
              {activeProfile?.role === 'admin' && (
                <Link
                  href="/create"
                  onClick={onClose}
                  className="menu-item flex items-center gap-3 text-accent font-semibold"
                >
                  <PlusCircle size={18} strokeWidth={2.2} />
                  <span>Create Contest</span>
                </Link>
              )}
              <Link
                href="/admin"
                onClick={onClose}
                className="menu-item flex items-center gap-3"
              >
                <Shield size={18} strokeWidth={2.2} className="text-accent" />
                <span>Moderation Panel</span>
              </Link>
            </div>
          )}
        </div>

        {/* Dev Tools Footer (Section 20 of Project Documentation) */}
        <div className="pt-6 border-t border-ink/10 mt-6 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span className="flex items-center gap-1 font-bold">
              <Users size={12} />
              <span>Dev Switcher</span>
            </span>
            <span className="tabular-nums">06:00 UTC</span>
          </div>

          {/* User role quick switcher */}
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => onSwitchUser?.('admin')}
              className={`p-1.5 rounded text-center font-bold border transition-colors ${
                profile?.role === 'admin'
                  ? 'bg-accent-solid text-ink border-accent-solid'
                  : 'bg-surface text-muted border-ink/10 hover:text-ink'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('moderator')}
              className={`p-1.5 rounded text-center font-bold border transition-colors ${
                profile?.role === 'moderator'
                  ? 'bg-accent-solid text-ink border-accent-solid'
                  : 'bg-surface text-muted border-ink/10 hover:text-ink'
              }`}
            >
              Mod
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('user')}
              className={`p-1.5 rounded text-center font-bold border transition-colors ${
                profile?.role === 'user'
                  ? 'bg-accent-solid text-ink border-accent-solid'
                  : 'bg-surface text-muted border-ink/10 hover:text-ink'
              }`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => onSwitchUser?.('guest')}
              className={`p-1.5 rounded text-center font-bold border transition-colors ${
                !profile
                  ? 'bg-accent-solid text-ink border-accent-solid'
                  : 'bg-surface text-muted border-ink/10 hover:text-ink'
              }`}
            >
              Guest
            </button>
          </div>

          {/* Jump to next cycle button */}
          <button
            type="button"
            onClick={onAdvanceCycle}
            className="w-full py-2 px-3 rounded-lg bg-surface border border-ink/10 hover:border-accent text-faint hover:text-accent font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <FastForward size={14} />
            <span>Advance to 06:00 UTC</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default SideDrawer;
