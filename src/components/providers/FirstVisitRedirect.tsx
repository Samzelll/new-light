"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SKIP_PATHS = ['/onboarding', '/auth', '/api'];

/**
 * Redirects first-time visitors to the onboarding flow.
 * Skipped for: /onboarding, /auth, /api routes.
 * State: localStorage key 'onboarded' = 'true' after completion.
 */
export function FirstVisitRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip if already on an excluded path
    if (SKIP_PATHS.some((p) => pathname?.startsWith(p))) return;

    // Check if already onboarded
    try {
      const done = localStorage.getItem('onboarded');
      if (!done) {
        router.replace('/onboarding');
      }
    } catch {
      // localStorage unavailable (private browsing extreme mode) — skip
    }
  }, [pathname, router]);

  return null;
}
