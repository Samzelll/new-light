'use client';

import { Suspense, type ReactNode } from 'react';
import { ChromeProvider } from './ChromeContext';
import SideDrawer from '../layout/SideDrawer';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ChromeProvider>
      <div className="app-shell relative min-h-dvh">{children}</div>
      <Suspense fallback={null}>
        <SideDrawer />
      </Suspense>
    </ChromeProvider>
  );
}

export default AppShell;
