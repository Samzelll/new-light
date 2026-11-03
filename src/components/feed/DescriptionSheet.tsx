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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-scrim backdrop-blur-xs animate-fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detailed contest description"
        className="relative z-10 w-full max-w-md mx-auto bg-surface border-t border-line rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl animate-slide-up"
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-line-strong mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                {stageInfo || 'Contest Details'}
              </span>
              {(contest.is_featured || (contest as any).isFeatured) && (
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent-soft text-[10px] font-bold">
                  ★ Popular
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-ink font-display uppercase tracking-tight truncate">
              {contest.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close description"
            className="w-8 h-8 rounded-full bg-surface-2 hover:bg-line text-muted hover:text-ink flex items-center justify-center shrink-0 border border-line transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-xs font-semibold text-muted">
            <Tag size={12} className="text-accent" />
            <span>Category: {contest.categoryId?.replace('cat-', '') || 'Photography'}</span>
          </span>
          {contest.prize && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-xs font-semibold text-accent">
              <Award size={12} />
              <span>Prize: {contest.prize}</span>
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Description
          </h3>
          <p className="text-sm text-ink leading-relaxed bg-surface-2 p-3 rounded-2xl border border-line">
            {contest.description}
          </p>
        </div>

        {/* Quick Rules */}
        {contest.quickRules && contest.quickRules.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={13} className="text-accent" />
              <span>Voting Rules</span>
            </h3>
            <ul className="space-y-1.5 bg-surface-2 p-3 rounded-2xl border border-line text-xs text-muted">
              {contest.quickRules.map((rule: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">•</span>
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
            className="w-full py-3 px-4 rounded-2xl bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/20 transition-all active:scale-[0.99]"
          >
            <span>Open Contest Page</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
