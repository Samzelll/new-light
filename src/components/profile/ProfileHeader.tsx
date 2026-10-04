"use client";

import React from 'react';
import Image from 'next/image';
import { ChevronLeft, Pencil, User } from 'lucide-react';
import { isAdmin, canModerateContests } from '@/constants/permissions';

export interface ProfileHeaderProps {
  displayName: string;
  username: string;
  role?: string;
  avatarUrl?: string | null;
  bio?: string;
  trustScore: number;
  onEditClick: () => void;
  onBackClick: () => void;
}

export function ProfileHeader({
  displayName,
  username,
  role,
  avatarUrl,
  bio,
  trustScore,
  onEditClick,
  onBackClick,
}: ProfileHeaderProps) {
  // Only show role pill for admins / moderators. Regular users see none.
  const showAdminPill = role && (isAdmin(role) || canModerateContests(role) || role === 'admin' || role === 'developer');

  // Trust progress: 0 to 1000 scale
  const trustPercent = Math.min(100, Math.max(0, (trustScore / 1000) * 100));

  return (
    <div className="w-full flex flex-col">
      {/* ── Top Bar: Back button (left) and Edit pencil button (right) ── */}
      {/* No title, no search, no sign-out, no create/moderation icons here */}
      <header className="flex items-center justify-between py-3">
        <button
          type="button"
          onClick={onBackClick}
          aria-label="Back"
          className="w-10 h-10 rounded-full text-[#ff6a2b] hover:text-[#ff854d] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] -ml-2"
        >
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={onEditClick}
          aria-label="Edit Profile"
          className="w-10 h-10 rounded-full text-[#ff6a2b] hover:text-[#ff854d] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] -mr-2 cursor-pointer"
        >
          <Pencil size={22} strokeWidth={2.2} />
        </button>
      </header>

      {/* ── Centered Profile Block ── */}
      <div className="flex flex-col items-center text-center mt-1">
        {/* Avatar (72px, orange ring) */}
        <div className="relative w-[72px] h-[72px] rounded-full ring-2 ring-[#ff6a2b] ring-offset-2 ring-offset-[#0b0b0d] overflow-hidden bg-[#241712] flex items-center justify-center shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#ff824c] to-[#ff6a2b] text-white">
              <User size={40} strokeWidth={2} className="text-[#0b0b0d] fill-current translate-y-1" />
            </div>
          )}
        </div>

        {/* Display name (single line, truncate with ellipsis) */}
        <h1 className="text-2xl font-black text-white mt-3 leading-tight tracking-tight truncate max-w-full px-4">
          {displayName}
        </h1>

        {/* @username with a small role pill ("Admin" only for admins/moderators) */}
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="text-sm font-medium text-neutral-400">
            @{username || 'user'}
          </span>
          {showAdminPill && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#331308] text-[#ff6a2b] border border-[#ff6a2b]/35 shadow-sm">
              Admin
            </span>
          )}
        </div>

        {/* Bio (max 1 line, truncate) */}
        {bio ? (
          <p className="text-sm text-neutral-300 mt-1.5 max-w-full px-4 truncate font-normal leading-relaxed">
            {bio}
          </p>
        ) : null}

        {/* Trust row: label "Trust", slim progress bar, numeric value */}
        <div className="w-full flex items-center justify-between mt-3.5 px-1 sm:px-2">
          <span className="text-sm font-semibold text-neutral-400 shrink-0">
            Trust
          </span>
          <div
            className="flex-1 h-1.5 bg-[#202026] rounded-full overflow-hidden mx-3"
            role="progressbar"
            aria-valuenow={trustScore}
            aria-valuemin={0}
            aria-valuemax={1000}
            aria-label="Trust Index"
          >
            <div
              className="h-full bg-[#ff6a2b] rounded-full transition-all duration-700"
              style={{ width: `${trustPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold text-white shrink-0 tabular-nums">
            {trustScore}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
