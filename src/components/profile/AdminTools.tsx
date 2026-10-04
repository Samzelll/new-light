"use client";

import React from 'react';
import Link from 'next/link';
import { Plus, Shield } from 'lucide-react';
import { canCreateContest, canModerateContests } from '@/constants/permissions';

export interface AdminToolsProps {
  role?: string;
}

export function AdminTools({ role }: AdminToolsProps) {
  const canCreate = canCreateContest(role);
  const canModerate = canModerateContests(role);

  // If user has neither permission, do not render tools row
  if (!canCreate && !canModerate) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5 my-3.5 w-full" role="region" aria-label="Admin tools">
      {/* Primary orange button "Create Contest" (about 44px high) */}
      {canCreate && (
        <Link
          href="/create"
          aria-label="Create contest"
          className="h-11 flex-1 bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm rounded-2xl px-4 flex items-center justify-center gap-2 shadow-md shadow-[#ff6a2b]/25 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Create Contest</span>
        </Link>
      )}

      {/* Secondary button "Moderation" (admins/mods only, about 44px high) */}
      {canModerate && (
        <Link
          href="/admin"
          aria-label="Moderation dashboard"
          className="h-11 flex-1 bg-[#18181c] border border-neutral-800 hover:border-neutral-700 hover:bg-[#202026] text-white font-bold text-sm rounded-2xl px-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
        >
          <Shield size={18} strokeWidth={2.2} className="text-[#ff6a2b]" />
          <span>Moderation</span>
        </Link>
      )}
    </div>
  );
}

export default AdminTools;
