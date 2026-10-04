"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, Award, Shield, Tag, ExternalLink, Calendar, Users } from 'lucide-react';
import type { Contest } from '@/services/types';

export interface DescriptionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contest: any;
  stageInfo?: string;
}

export function DescriptionSheet({
  isOpen,
  onClose,
  contest,
  stageInfo,
}: DescriptionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contest) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detailed contest description"
        className="relative z-10 w-full max-w-md mx-auto bg-[#161619] border-t border-neutral-800 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-slide-up"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-neutral-700 mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#ff6a2b] uppercase tracking-wider">
                {stageInfo || 'Contest Details'}
              </span>
              {(contest.is_featured || (contest as any).isFeatured) && (
                <span className="px-2 py-0.5 rounded-full bg-[#ff6a2b]/20 text-[#ff6a2b] text-[10px] font-bold">
                  ★ Popular
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-white uppercase tracking-tight truncate">
              {contest.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close description"
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#222226] text-xs font-semibold text-neutral-300">
            <Tag size={12} className="text-[#ff6a2b]" />
            <span>Category: {contest.categoryId?.replace('cat-', '') || 'Photography'}</span>
          </span>
          {contest.prize && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#222226] text-xs font-semibold text-emerald-400">
              <Award size={12} />
              <span>Prize: {contest.prize}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-sm text-neutral-200 leading-relaxed bg-[#121215] p-3 rounded-2xl border border-neutral-800/60">
            {contest.description}
          </p>
        </div>

        {/* Quick Rules */}
        {contest.quickRules && contest.quickRules.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={13} className="text-[#ff6a2b]" />
              <span>Voting Rules</span>
            </h3>
            <ul className="space-y-1.5 bg-[#121215] p-3 rounded-2xl border border-neutral-800/60 text-xs text-neutral-300">
              {contest.quickRules.map((rule: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#ff6a2b] font-bold shrink-0">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to Full Contest Page */}
        <div className="pt-2">
          <Link
            href={`/contest/${contest.id}`}
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#ff6a2b]/20 transition-all active:scale-[0.99]"
          >
            <span>Open Contest Page</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
