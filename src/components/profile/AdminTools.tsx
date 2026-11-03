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
      {/* Primary button "Create Contest" */}
      {canCreate && (
        <Link
          href="/create"
          aria-label="Create contest"
          className="flex-1 bg-accent-solid hover:bg-accent-hover text-white rounded-full font-bold px-5 py-2.5 shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Create Contest</span>
        </Link>
      )}

      {/* Secondary button "Moderation" */}
      {canModerate && (
        <Link
          href="/admin"
          aria-label="Moderation dashboard"
          className="flex-1 bg-surface border border-line-strong text-ink hover:bg-surface-2 rounded-full font-bold px-5 py-2.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent text-sm"
        >
          <Shield size={18} strokeWidth={2.2} className="text-accent" />
          <span>Moderation</span>
        </Link>
      )}
    </div>
  );
}

export default AdminTools;
