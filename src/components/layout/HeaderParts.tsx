'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, SlidersHorizontal, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Opinion Net home"
      className={`items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${className}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-on-accent">
        <Flame size={18} strokeWidth={2.2} />
      </span>
      <span className="hidden leading-tight md:block">
        <span className="block font-display text-title font-semibold text-ink">
          Opinion Net
        </span>
        <span className="hidden text-caption uppercase tracking-wide text-faint lg:block">
          Contest platform
        </span>
      </span>
    </Link>
  );
}

export function FilterButton({
  className = '',
  count = 0,
  onClick,
}: {
  className?: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={count ? `Filters, ${count} active` : 'Filters'}
      className={`relative h-11 w-11 shrink-0 place-items-center rounded-full text-accent transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none ${className}`}
    >
      <SlidersHorizontal size={20} strokeWidth={2.2} />
      {count > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-on-accent tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

export function AvatarButton({
  onClick,
  avatarUrl: propAvatarUrl,
  username: propUsername,
  className = '',
}: {
  onClick: () => void;
  avatarUrl?: string | null;
  username?: string;
  className?: string;
}) {
  const { profile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rawAvatar =
    propAvatarUrl !== undefined
      ? propAvatarUrl
      : profile?.avatar_url || (profile as { avatarUrl?: string | null } | null)?.avatarUrl || null;

  const rawResolved = rawAvatar ? resolveImageUrl(rawAvatar, 'avatars') : null;
  const validAvatarUrl =
    rawResolved &&
    (rawResolved.startsWith('http://') ||
      rawResolved.startsWith('https://') ||
      rawResolved.startsWith('data:') ||
      rawResolved.startsWith('/'))
      ? rawResolved
      : null;

  const username =
    propUsername ??
    profile?.username ??
    (profile as { displayName?: string } | null)?.displayName ??
    '';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile menu"
      className={`group relative grid h-11 w-11 shrink-0 place-items-center rounded-full p-0.5 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none ${className}`}
    >
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-accent/50 bg-surface-2 ring-1 ring-accent/30 shadow-sm transition-all group-hover:border-accent group-hover:ring-accent/50">
        {mounted && validAvatarUrl ? (
          <Image
            src={validAvatarUrl}
            alt={username || 'User profile'}
            fill
            unoptimized={shouldBeUnoptimized(validAvatarUrl)}
            className="object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-full w-full select-none items-center justify-center bg-surface-2 font-display text-sm font-bold text-accent">
            {mounted && username ? (
              username.charAt(0).toUpperCase()
            ) : (
              <User size={18} strokeWidth={2.2} />
            )}
          </span>
        )}
      </span>
    </button>
  );
}
