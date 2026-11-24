'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Chrome = {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  filtersOpen: boolean;
  openFilters: () => void;
  closeFilters: () => void;
  activeFilterCount: number;
  setActiveFilterCount: (n: number) => void;
};

const ChromeContext = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const openDrawer = useCallback(() => {
    setFiltersOpen(false);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const openFilters = useCallback(() => {
    setDrawerOpen(false);
    setFiltersOpen(true);
  }, []);

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const value = useMemo(
    () => ({
      drawerOpen,
      openDrawer,
      closeDrawer,
      filtersOpen,
      openFilters,
      closeFilters,
      activeFilterCount,
      setActiveFilterCount,
    }),
    [
      drawerOpen,
      openDrawer,
      closeDrawer,
      filtersOpen,
      openFilters,
      closeFilters,
      activeFilterCount,
    ]
  );

  return (
    <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
  );
}

export function useChrome() {
  const v = useContext(ChromeContext);
  if (!v) throw new Error('useChrome must be used inside ChromeProvider');
  return v;
}
