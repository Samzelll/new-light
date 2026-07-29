"use client";

import { ReactNode, useEffect, useState } from 'react';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: ReactNode }) {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Quick initial screen load animation
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell relative">
      {/* Screen Loading Splash Overlay on mount */}
      {initialLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-900 text-white transition-opacity duration-300">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-blue p-0.5 shadow-[0_0_25px_rgba(var(--brand-500-rgb),0.4)] animate-pulse flex items-center justify-center">
              <div className="w-full h-full bg-surface-900 rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-blue">
                  ON
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              <span>Loading application...</span>
            </div>
          </div>
        </div>
      )}

      <div className="app-shell-desktop-nav">
        <SideNav />
      </div>
      <div className="app-shell-main">
        {children}
      </div>
      <div className="app-shell-bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}

