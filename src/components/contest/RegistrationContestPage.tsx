"use client";

import React, { useState, useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Share2, X, Check, AlertCircle } from 'lucide-react';
import type { Contest } from '@/services/contestService';
import type { Participant } from '@/services/participantService';

// Default rule sections when contest.rulesSections is not provided
const DEFAULT_RULES_SECTIONS = [
  {
    title: 'Who can join',
    body: 'Open to all registered creators and photographers worldwide. All experience levels are welcome.',
  },
  {
    title: 'Entry requirements',
    body: 'Submit original work adhering to the contest topic. High-resolution files (JPG/PNG) with minimal compression.',
  },
  {
    title: 'Timeline',
    body: 'Applications remain open until the registration deadline. Community voting begins immediately after registration closes.',
  },
  {
    title: 'Voting',
    body: 'Community 1v1 battle match-ups with Trust Index weighting to ensure fair and tamper-proof evaluation.',
  },
  {
    title: 'Prizes',
    body: 'Top winners receive cash awards, winner badges, and a prominent feature on the Opinion Net homepage and spotlight.',
  },
  {
    title: 'Not allowed',
    body: 'Plagiarism, uncredited third-party assets, deceptive AI generation without disclosure, or offensive material.',
  },
];

const DEFAULT_QUICK_RULES = [
  'Original photography and submissions only',
  'Maximum 1 entry per verified participant',
  'No intrusive watermarks or extreme filters',
  'Winner determined by community Trust Index',
];

// ─────────────────────────────────────────────────────────────────────────────
// QuickFacts Component (Three quick-fact tiles in a row)
// ─────────────────────────────────────────────────────────────────────────────
export interface QuickFactsProps {
  spotsLeft: number | string;
  daysLeft: number;
  isDeadlinePassed: boolean;
  prize: string;
}

export function QuickFacts({ spotsLeft, daysLeft, isDeadlinePassed, prize }: QuickFactsProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 my-4 sm:my-5" role="region" aria-label="Contest quick facts">
      {/* Spots left tile */}
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="text-base sm:text-lg font-black text-white tracking-tight">
          {spotsLeft}
        </span>
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">
          Spots left
        </span>
      </div>

      {/* Days left tile */}
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className={`text-base sm:text-lg font-black tracking-tight ${isDeadlinePassed ? 'text-red-400' : 'text-white'}`}>
          {isDeadlinePassed ? '0d' : `${daysLeft}d`}
        </span>
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">
          {isDeadlinePassed ? 'Closed' : 'To apply'}
        </span>
      </div>

      {/* Prize tile */}
      <div className="bg-[#141418] border border-neutral-800/80 rounded-2xl p-3 text-center flex flex-col items-center justify-center transition-colors">
        <span className="text-base sm:text-lg font-black text-[#ff6a2b] tracking-tight truncate max-w-full px-1">
          {prize}
        </span>
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">
          Prize
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RulesSheet Component (Full rules bottom sheet)
// ─────────────────────────────────────────────────────────────────────────────
export interface RulesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rulesSections: { title: string; body: string }[];
  contestTitle: string;
}

export function RulesSheet({ isOpen, onClose, rulesSections, contestTitle }: RulesSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const titleId = useId();

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = sheetRef.current;
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

    // Initial focus on sheet close button or container
    const timer = setTimeout(() => {
      const closeBtn = sheetRef.current?.querySelector<HTMLElement>('button');
      closeBtn?.focus();
    }, 50);

    // Prevent background scrolling while sheet is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Touch swipe-down tracking
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const diffY = touchCurrentY.current - touchStartY.current;
      // If swiped down more than 60px, close the sheet
      if (diffY > 60) {
        onClose();
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet dialog container (stays max-w-md, leaves bottom bar accessible) */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md bg-[#131316] border-t border-x border-neutral-800 rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[85vh] animate-slide-up outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
        tabIndex={-1}
      >
        {/* Drag handle area with swipe down gestures */}
        <div
          className="pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="w-12 h-1.5 bg-neutral-600 rounded-full mx-auto" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 pb-3 pt-1 flex items-center justify-between border-b border-neutral-800/80">
          <div>
            <h2 id={titleId} className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
              Rules & Conditions
            </h2>
            <p className="text-xs text-neutral-400 truncate max-w-[240px]">
              {contestTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules sheet"
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Internal Scrollable Content */}
        <div className="px-5 pt-4 pb-28 overflow-y-auto space-y-5 text-sm">
          {rulesSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              <h3 className="font-bold text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a2b]" />
                {section.title}
              </h3>
              <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed pl-3.5 border-l border-neutral-800">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContestPage Component (Registration Open View)
// ─────────────────────────────────────────────────────────────────────────────
export interface ContestPageProps {
  contest: Contest;
  participants?: Participant[];
  userHasApplied?: boolean;
}

export function ContestPage({ contest, participants = [], userHasApplied = false }: ContestPageProps) {
  const router = useRouter();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const rulesTriggerRef = useRef<HTMLButtonElement>(null);

  // Compute spots left
  const capacity = contest.max_participants;
  const entriesCount = participants.length;
  const spotsLeft = capacity !== null && capacity !== undefined
    ? Math.max(0, capacity - entriesCount)
    : 'Open';
  const isContestFull = typeof spotsLeft === 'number' && spotsLeft <= 0;

  // Compute days left to apply
  const now = new Date();
  const deadline = contest.registration_end ? new Date(contest.registration_end) : null;
  let daysLeft = 0;
  let isDeadlinePassed = false;
  if (deadline) {
    const diffMs = deadline.getTime() - now.getTime();
    if (diffMs <= 0) {
      isDeadlinePassed = true;
      daysLeft = 0;
    } else {
      daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  // Prize text
  const prize = contest.prize || '$1,500';

  // Quick rules data (exactly 3-5 items)
  const quickRules = contest.quickRules && contest.quickRules.length >= 3
    ? contest.quickRules.slice(0, 5)
    : DEFAULT_QUICK_RULES;

  // Rules sections data
  const rulesSections = contest.rulesSections && contest.rulesSections.length > 0
    ? contest.rulesSections
    : DEFAULT_RULES_SECTIONS;

  // Share handler with navigator.share and copy-link fallback
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: contest.title,
      text: contest.description || `Register for ${contest.title} on Opinion Net!`,
      url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy link
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareToast('Link copied to clipboard!');
        setTimeout(() => setShareToast(null), 3000);
      }
    } catch {
      setShareToast('Failed to copy link');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  // Back handler
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Handle closing sheet and restoring focus
  const handleCloseRules = () => {
    setIsRulesOpen(false);
    setTimeout(() => {
      rulesTriggerRef.current?.focus();
    }, 50);
  };

  // Button disabled state & text
  const isRegisterDisabled = isContestFull || isDeadlinePassed || userHasApplied;
  let registerButtonLabel = 'Register entry';
  let registerDisabledReason = '';

  if (userHasApplied) {
    registerButtonLabel = 'Entry Submitted ✓';
  } else if (isContestFull) {
    registerButtonLabel = 'Registration Closed';
    registerDisabledReason = 'Contest is full (All spots taken)';
  } else if (isDeadlinePassed) {
    registerButtonLabel = 'Registration Closed';
    registerDisabledReason = 'Deadline has passed';
  }

  const coverUrl = contest.cover_url || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1080&q=80';

  // Extract thumbnails for participants when entries > 0
  const participantPhotos = participants
    .map((p) => {
      const photo = p.submission_data?.photos?.[0];
      return {
        id: p.id,
        name: p.submission_data?.name || 'Entry',
        photo: photo || null,
      };
    })
    .filter((p) => Boolean(p.photo));

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center">
      {/* Mobile-first Max-W-MD Viewport Frame */}
      <main className="w-full max-w-md min-h-screen flex flex-col relative pb-28 bg-[#0b0b0d]">
        {/* ── Toast notification for share copy fallback ── */}
        {shareToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-4 inset-x-0 mx-auto w-fit z-[70] bg-[#1a1a20] border border-[#ff6a2b] text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-fade-in"
          >
            <Check size={14} className="text-[#ff6a2b]" strokeWidth={3} />
            <span>{shareToast}</span>
          </div>
        )}

        {/* ── COVER IMAGE WITH OVERLAID BUTTONS ── */}
        <div className="relative w-full h-48 bg-neutral-900 overflow-hidden">
          <Image
            src={coverUrl}
            alt={contest.title}
            fill
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
          />
          {/* Subtle gradient overlay on cover */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

          {/* Overlaid round back button (top-left) */}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all border border-white/10 z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          {/* Overlaid round share button (top-right) */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share contest"
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all border border-white/10 z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
          >
            <Share2 size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* ── CONTENT OVERLAPPING THE COVER SLIGHTLY ── */}
        <div className="relative -mt-5 z-10 px-5 pt-2 flex flex-col flex-1">
          {/* Status pill: "Registration open" (orange) */}
          <div className="flex items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#ff6a2b] text-[#0b0b0d] shadow-md shadow-[#ff6a2b]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0b0b0d] animate-pulse" />
              Registration open
            </span>
          </div>

          {/* Contest Title (uppercase, bold, large) */}
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-3 leading-tight">
            {contest.title}
          </h1>

          {/* Description (max 2-3 lines, line-clamp-3) */}
          <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed mt-2 line-clamp-3 font-normal">
            {contest.description || 'Open registration phase. Submit your best entry and compete in community-judged match-ups.'}
          </p>

          {/* ── THREE QUICK-FACT TILES IN A ROW ── */}
          <QuickFacts
            spotsLeft={spotsLeft}
            daysLeft={daysLeft}
            isDeadlinePassed={isDeadlinePassed}
            prize={prize}
          />

          {/* ── QUICK RULES (exactly 3-5 one-line rules with small numbered orange circles) ── */}
          <div className="mt-2 space-y-2.5">
            <div className="space-y-2">
              {quickRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-neutral-200">
                  {/* Small numbered orange circle */}
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-full bg-[#ff6a2b] text-[#0b0b0d] font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                  >
                    {idx + 1}
                  </span>
                  <span className="line-clamp-1 font-medium">{rule}</span>
                </div>
              ))}
            </div>

            {/* Text button "Show full rules and conditions ›" opens bottom sheet */}
            <div className="pt-1">
              <button
                ref={rulesTriggerRef}
                type="button"
                onClick={() => setIsRulesOpen(true)}
                className="text-xs sm:text-sm text-[#ff6a2b] hover:text-[#ff824c] font-semibold inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] rounded-md transition-colors group cursor-pointer"
              >
                <span>Show full rules and conditions</span>
                <span className="text-base leading-none group-hover:translate-x-0.5 transition-transform">›</span>
              </button>
            </div>
          </div>

          {/* ── ENTRIES STRIP (horizontal scroll of thumbnails ONLY when entries > 0) ── */}
          {entriesCount > 0 && (
            <div className="mt-6 pt-4 border-t border-neutral-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Current Entries ({entriesCount})
                </span>
              </div>
              <div
                className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none"
                tabIndex={0}
                aria-label="Contest entries thumbnails"
              >
                {participantPhotos.length > 0 ? (
                  participantPhotos.map((entry) => (
                    <div
                      key={entry.id}
                      className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-neutral-800 bg-neutral-900 group"
                      title={entry.name}
                    >
                      <Image
                        src={entry.photo!}
                        alt={entry.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))
                ) : (
                  // If participants exist without photos, show avatar representations
                  participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className="w-16 h-16 rounded-xl shrink-0 border border-neutral-800 bg-[#16161a] flex flex-col items-center justify-center text-neutral-400 text-xs font-bold"
                    >
                      <span>#{idx + 1}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FULL RULES BOTTOM SHEET ── */}
        <RulesSheet
          isOpen={isRulesOpen}
          onClose={handleCloseRules}
          rulesSections={rulesSections}
          contestTitle={contest.title}
        />

        {/* ── STICKY BOTTOM BAR WITH ONE PRIMARY BUTTON "Register entry" ── */}
        {/* Stays visible under the sheet at z-[60] */}
        <div className="fixed bottom-0 inset-x-0 mx-auto max-w-md p-4 bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/95 to-transparent z-[60] pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            {isRegisterDisabled && registerDisabledReason && (
              <span className="text-[11px] font-semibold text-red-400 flex items-center gap-1 bg-red-950/60 border border-red-800/60 px-2.5 py-0.5 rounded-full">
                <AlertCircle size={12} />
                {registerDisabledReason}
              </span>
            )}

            {isRegisterDisabled ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-6 rounded-full font-bold text-sm sm:text-base bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50 shadow-none text-center"
              >
                {registerButtonLabel}
              </button>
            ) : (
              <Link
                href={`/apply/${contest.id}`}
                className="w-full py-3.5 px-6 rounded-full font-black text-sm sm:text-base bg-[#ff6a2b] hover:bg-[#ff7a3d] text-[#0b0b0d] transition-all shadow-lg shadow-[#ff6a2b]/25 active:scale-[0.99] text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center tracking-wide"
              >
                {registerButtonLabel}
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ContestPage;
