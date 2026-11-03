"use client";

import { ReactNode, useEffect, useState } from 'react';
import { SideNav } from './SideNav';

export function AppShell({ children }: { children: ReactNode }) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Quick initial screen load animation
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only mount desktop navigation if screen is desktop width (>= 1024px)
    const checkIsDesktop = () => {
      setIsDesktop(typeof window !== 'undefined' && window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  return (
    <div className="app-shell relative">
      {/* Screen Loading Splash Overlay on mount */}
      {initialLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg text-ink transition-opacity duration-300">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-2xl p-0.5 shadow-[0_0_30px_rgba(196,165,116,0.3)] animate-pulse flex items-center justify-center bg-gradient-to-br from-accent via-accent-solid to-surface-2">
              <div className="w-full h-full bg-bg rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-black text-accent font-display tracking-wider">
                  ON
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span>Loading Opinion Net...</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop-only side navigation — strictly rendered only on desktop monitors (>= 1024px) */}
      {isDesktop && (
        <aside
          aria-label="Desktop navigation"
          className="desktop-only-nav fixed left-0 top-0 bottom-0 w-[240px] z-30 hidden lg:block"
        >
          <SideNav />
        </aside>
      )}

      <div className="app-shell-main w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
