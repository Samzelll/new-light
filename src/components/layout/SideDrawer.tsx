'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  X,
  User,
  Vote,
  Award,
  HelpCircle,
  PlusCircle,
  Shield,
  FastForward,
  LogIn,
  LogOut,
  Search,
  Swords,
  Flame,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import type { Profile } from '@/services/types';
import { timeService } from '@/services/mock/timeService';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { useChrome } from '@/components/navigation/ChromeContext';
import { useOverlay } from '@/hooks/useOverlay';
import { useAuth } from '@/hooks/useAuth';

export interface SideDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  profile?: Profile | null;
  onSwitchUser?: (
    kind: 'guest' | 'user' | 'entrant' | 'moderator' | 'admin' | 'creator'
  ) => void;
  onAdvanceCycle?: () => void;
}

function isActive(href: string, pathname: string, tab: string | null) {
  const [path, query] = href.split('?');
  if (path === '/') {
    return (
      pathname === '/' &&
      (tab ?? 'contests') === (new URLSearchParams(query).get('tab') ?? 'contests')
    );
  }
  if (pathname !== path && !pathname.startsWith(path + '/')) return false;
  return query ? new URLSearchParams(query).get('tab') === tab : tab === null;
}

export function SideDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
  profile: propProfile,
  onSwitchUser: propOnSwitchUser,
  onAdvanceCycle: propOnAdvanceCycle,
}: SideDrawerProps = {}) {
  const { drawerOpen, closeDrawer } = useChrome();
  const { profile: authProfile, signInWithGoogle, logout } = useAuth();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const searchParamsKey = searchParams.toString();

  const isOpen = propIsOpen !== undefined ? propIsOpen : drawerOpen;
  const onClose = propOnClose ?? closeDrawer;

  const drawerRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useOverlay(isOpen, drawerRef, onClose);

  // Close drawer automatically on route / tab changes
  const prevRouteRef = useRef(`${pathname}?${searchParamsKey}`);
  useEffect(() => {
    const nextRoute = `${pathname}?${searchParamsKey}`;
    if (prevRouteRef.current !== nextRoute) {
      prevRouteRef.current = nextRoute;
      closeDrawer();
    }
  }, [pathname, searchParamsKey, closeDrawer]);

  const rawProfile = propProfile !== undefined ? propProfile : authProfile;
  const activeProfile = mounted ? (rawProfile as Profile | null) : null;
  const isAdminOrMod =
    activeProfile &&
    (activeProfile.role === 'admin' || activeProfile.role === 'moderator');
  const showDevTools = process.env.NODE_ENV === 'development';

  const handleAuthAction = async () => {
    if (propOnSwitchUser) {
      propOnSwitchUser(activeProfile ? 'guest' : 'user');
      return;
    }
    if (activeProfile) {
      await logout();
    } else {
      await signInWithGoogle();
    }
  };

  const handleAdvanceCycle = async () => {
    if (propOnAdvanceCycle) {
      propOnAdvanceCycle();
      return;
    }
    await timeService.devJumpToNextCycle();
  };

  const navLinkClass = (href: string) => {
    const active = isActive(href, pathname, currentTab);
    return `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none ${
      active
        ? 'bg-surface text-ink before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-accent'
        : 'text-muted hover:bg-surface/60 hover:text-ink'
    }`;
  };

  const iconClass = (href: string) =>
    isActive(href, pathname, currentTab) ? 'text-accent' : 'text-muted';

  return (
    <>
      {/* Backdrop Scrim */}
      <div
        className={`fixed inset-0 z-[59] bg-scrim transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Drawer Panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Opinion Net menu"
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-[60] flex w-[min(23rem,calc(100vw-1.25rem))] flex-col border-l border-line bg-surface-2 overlay-panel pt-[env(safe-area-inset-top)] shadow-[-24px_0_80px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out motion-reduce:transition-none lg:w-[24rem] ${
          isOpen
            ? 'translate-x-0'
            : 'pointer-events-none translate-x-full'
        }`}
      >
        {/* Pinned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Opinion Net Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 -mr-2 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 thin-scroll">
          {/* User profile preview banner */}
          {activeProfile ? (
            <Link
              href="/profile"
              onClick={onClose}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <div className="relative h-11 w-11 flex-none overflow-hidden rounded-full bg-surface-2 ring-2 ring-accent">
                {(() => {
                  const raw =
                    (activeProfile as { avatar_url?: string | null; avatarUrl?: string | null })
                      ?.avatar_url ||
                    (activeProfile as { avatarUrl?: string | null })?.avatarUrl;
                  const resolved = raw ? resolveImageUrl(raw, 'avatars') : null;
                  const isValid =
                    resolved &&
                    (resolved.startsWith('http://') ||
                      resolved.startsWith('https://') ||
                      resolved.startsWith('data:') ||
                      resolved.startsWith('/'));
                  return isValid ? (
                    <Image
                      src={resolved}
                      alt={
                        (activeProfile as { display_name?: string; displayName?: string })
                          ?.display_name ||
                        (activeProfile as { displayName?: string })?.displayName ||
                        activeProfile?.username ||
                        'User'
                      }
                      fill
                      unoptimized={shouldBeUnoptimized(resolved)}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-2 text-accent">
                      <User size={20} strokeWidth={2} />
                    </div>
                  );
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-ink transition-colors group-hover:text-accent">
                  {(activeProfile as { display_name?: string; displayName?: string })
                    .display_name ||
                    (activeProfile as { displayName?: string }).displayName ||
                    activeProfile.username}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate text-xs text-faint">
                    @{activeProfile.username}
                  </span>
                  {isAdminOrMod && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-soft">
                      {activeProfile.role === 'admin' ? 'Admin' : 'Moderator'}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="space-y-2 rounded-xl border border-line bg-surface p-3 text-center">
              <p className="text-xs text-muted">Browsing as guest</p>
              <Link
                href="/auth"
                onClick={onClose}
                className="block w-full rounded-full bg-accent-solid px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="space-y-1" aria-label="Primary navigation">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
              Navigate
            </p>
            <Link
              href="/"
              onClick={onClose}
              aria-current={isActive('/', pathname, currentTab) ? 'page' : undefined}
              className={navLinkClass('/')}
            >
              <Vote size={18} className={iconClass('/')} strokeWidth={2.2} />
              <span>Explore Contests</span>
            </Link>

            <Link
              href="/search"
              onClick={onClose}
              aria-current={isActive('/search', pathname, currentTab) ? 'page' : undefined}
              className={navLinkClass('/search')}
            >
              <Search size={18} className={iconClass('/search')} strokeWidth={2} />
              <span>Search &amp; Discover</span>
            </Link>

            <Link
              href="/?tab=battles"
              onClick={onClose}
              aria-current={
                isActive('/?tab=battles', pathname, currentTab) ? 'page' : undefined
              }
              className={navLinkClass('/?tab=battles')}
            >
              <Swords
                size={18}
                className={iconClass('/?tab=battles')}
                strokeWidth={2}
              />
              <span>Live Battles</span>
            </Link>

            <Link
              href="/?tab=feed"
              onClick={onClose}
              aria-current={
                isActive('/?tab=feed', pathname, currentTab) ? 'page' : undefined
              }
              className={navLinkClass('/?tab=feed')}
            >
              <Flame size={18} className={iconClass('/?tab=feed')} strokeWidth={2} />
              <span>Media Feed</span>
            </Link>

            {activeProfile && (
              <>
                <Link
                  href="/profile"
                  onClick={onClose}
                  aria-current={
                    isActive('/profile', pathname, currentTab) ? 'page' : undefined
                  }
                  className={navLinkClass('/profile')}
                >
                  <User size={18} className={iconClass('/profile')} strokeWidth={2} />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/profile?tab=votes"
                  onClick={onClose}
                  aria-current={
                    isActive('/profile?tab=votes', pathname, currentTab)
                      ? 'page'
                      : undefined
                  }
                  className={navLinkClass('/profile?tab=votes')}
                >
                  <CheckCircle2
                    size={18}
                    className={iconClass('/profile?tab=votes')}
                    strokeWidth={2}
                  />
                  <span>My Votes</span>
                </Link>

                <Link
                  href="/profile?tab=favorites"
                  onClick={onClose}
                  aria-current={
                    isActive('/profile?tab=favorites', pathname, currentTab)
                      ? 'page'
                      : undefined
                  }
                  className={navLinkClass('/profile?tab=favorites')}
                >
                  <Bookmark
                    size={18}
                    className={iconClass('/profile?tab=favorites')}
                    strokeWidth={2}
                  />
                  <span>Favorites &amp; Saved</span>
                </Link>
              </>
            )}

            <Link
              href="/rules"
              onClick={onClose}
              aria-current={isActive('/rules', pathname, currentTab) ? 'page' : undefined}
              className={navLinkClass('/rules')}
            >
              <Award size={18} className={iconClass('/rules')} strokeWidth={2} />
              <span>Rules &amp; Prizes</span>
            </Link>

            <Link
              href="/onboarding"
              onClick={onClose}
              aria-current={
                isActive('/onboarding', pathname, currentTab) ? 'page' : undefined
              }
              className={navLinkClass('/onboarding')}
            >
              <HelpCircle
                size={18}
                className={iconClass('/onboarding')}
                strokeWidth={2}
              />
              <span>How It Works</span>
            </Link>
          </nav>

          {/* Admin / Creator / Moderator Tools */}
          {(isAdminOrMod || activeProfile?.role === 'creator') && (
            <div className="space-y-1 border-t border-line pt-4">
              <span className="block px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
                Management &amp; Tools
              </span>
              <Link
                href="/create"
                onClick={onClose}
                aria-current={
                  isActive('/create', pathname, currentTab) ? 'page' : undefined
                }
                className={navLinkClass('/create')}
              >
                <PlusCircle
                  size={18}
                  strokeWidth={2.2}
                  className={
                    isActive('/create', pathname, currentTab)
                      ? 'text-accent'
                      : 'text-accent-soft'
                  }
                />
                <span>Create Contest</span>
              </Link>
              <Link
                href="/admin"
                onClick={onClose}
                aria-current={
                  isActive('/admin', pathname, currentTab) ? 'page' : undefined
                }
                className={navLinkClass('/admin')}
              >
                <Shield
                  size={18}
                  strokeWidth={2.2}
                  className={
                    isActive('/admin', pathname, currentTab)
                      ? 'text-accent'
                      : 'text-accent-soft'
                  }
                />
                <span>
                  {activeProfile?.role === 'creator'
                    ? 'Creator Studio'
                    : 'Admin & Post-Production'}
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* Pinned Footer (Account + Dev Cycle Control) */}
        <div className="shrink-0 space-y-2.5 border-t border-line bg-surface-2 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleAuthAction}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            {activeProfile ? <LogOut size={14} /> : <LogIn size={14} />}
            <span>{activeProfile ? 'Sign Out' : 'Continue with Google'}</span>
          </button>

          {showDevTools && (
            <button
              type="button"
              onClick={handleAdvanceCycle}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <FastForward size={14} />
              <span>Advance to 06:00 UTC</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

export default SideDrawer;
