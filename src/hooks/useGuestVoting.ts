"use client";

import { useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

const GUEST_VOTES_KEY = 'guest_votes_used';
const GUEST_VOTES_MAX = 2;

export interface GuestVoteState {
  used: number;
  remaining: number;
  exhausted: boolean;
}

/**
 * Manages guest (unauthenticated) voting allowance.
 * Guests can cast up to GUEST_VOTES_MAX votes stored in localStorage.
 * After exhaustion, they see a sign-up prompt.
 */
export function useGuestVoting() {
  const { info: toastInfo } = useToast();
  const router = useRouter();

  const getState = useCallback((): GuestVoteState => {
    if (typeof window === 'undefined') return { used: 0, remaining: GUEST_VOTES_MAX, exhausted: false };
    try {
      const raw = localStorage.getItem(GUEST_VOTES_KEY);
      const used = raw ? parseInt(raw, 10) : 0;
      return {
        used,
        remaining: Math.max(0, GUEST_VOTES_MAX - used),
        exhausted: used >= GUEST_VOTES_MAX,
      };
    } catch {
      return { used: 0, remaining: GUEST_VOTES_MAX, exhausted: false };
    }
  }, []);

  /**
   * Call before casting a guest vote.
   * Returns true if the vote can proceed, false if blocked (shows toast + optional redirect).
   */
  const tryGuestVote = useCallback((): boolean => {
    const state = getState();

    if (state.exhausted) {
      toastInfo(
        `You've used your ${GUEST_VOTES_MAX} guest votes — sign up to keep voting!`,
        '🔒'
      );
      // Short delay so toast is visible before redirect
      setTimeout(() => router.push('/auth?reason=guest_limit'), 1400);
      return false;
    }

    // Record the vote
    try {
      localStorage.setItem(GUEST_VOTES_KEY, String(state.used + 1));
    } catch {}

    const remaining = state.remaining - 1;
    if (remaining === 1) {
      toastInfo('1 guest vote remaining — sign up to vote without limits!', '💡');
    } else if (remaining === 0) {
      toastInfo('Last guest vote used! Create a free account to continue.', '🎉');
    }

    return true;
  }, [getState, toastInfo, router]);

  const resetGuestVotes = useCallback(() => {
    try { localStorage.removeItem(GUEST_VOTES_KEY); } catch {}
  }, []);

  return { getState, tryGuestVote, resetGuestVotes, GUEST_VOTES_MAX };
}
