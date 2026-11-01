"use client";

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * TopLoader creates a high-performance, glowing top progress bar (YouTube/GitHub-style)
 * during client-side route transitions in Next.js App Router.
 *
 * It provides instant 0ms visual feedback when a user clicks any internal link or card,
 * eliminating the "frozen interface" feeling during dynamic chunk loading.
 */
export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    setIsLoading(true);
    setProgress(15);

    // Trickle progress up to 88% while waiting for the new page
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 50) return prev + Math.random() * 15;
        if (prev < 75) return prev + Math.random() * 8;
        if (prev < 88) return prev + Math.random() * 3;
        return prev;
      });
    }, 120);
  };

  const complete = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    setProgress(100);
    finishTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, 280);
  };

  // Complete progress whenever route actually finishes changing
  useEffect(() => {
    complete();
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [pathname, searchParams]);

  // Intercept clicks on links for instant 0ms feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore external links, mailto, tel, empty anchors, or new tabs
      if (
        href.startsWith('http') && !href.startsWith(window.location.origin) ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.target === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if target points to a different route
      try {
        const nextUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (
          nextUrl.pathname !== currentUrl.pathname ||
          nextUrl.search !== currentUrl.search
        ) {
          start();
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    // Listen for custom manual events as well
    const handleManualStart = () => start();
    const handleManualDone = () => complete();

    document.addEventListener('click', handleDocumentClick, { capture: true });
    window.addEventListener('toploader:start', handleManualStart);
    window.addEventListener('toploader:done', handleManualDone);

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      window.removeEventListener('toploader:start', handleManualStart);
      window.removeEventListener('toploader:done', handleManualDone);
    };
  }, []);

  if (!isLoading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300"
      style={{ opacity: isLoading || progress === 100 ? 1 : 0 }}
    >
      <div
        className="h-[3px] bg-gradient-to-r from-[#ff6a2b] via-[#ff884d] to-[#ffaa75] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '200ms' : '280ms',
          boxShadow: '0 0 12px rgba(255, 106, 43, 0.9), 0 0 4px #ff6a2b',
        }}
      />
    </div>
  );
}
