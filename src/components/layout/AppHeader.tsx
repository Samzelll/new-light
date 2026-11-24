'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useChrome } from '@/components/navigation/ChromeContext';
import { AvatarButton, BrandMark, FilterButton } from './HeaderParts';

export type MainTab = 'contests' | 'feed' | 'battles';

const TABS: { id: MainTab; label: string }[] = [
  { id: 'contests', label: 'Contests' },
  { id: 'feed', label: 'Feed' },
  { id: 'battles', label: 'Battles' },
];

export function AppHeader({
  mainTab,
  onTabChange,
}: {
  mainTab: MainTab;
  onTabChange: (t: MainTab) => void;
}) {
  const router = useRouter();
  const { openDrawer, openFilters, activeFilterCount } = useChrome();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const index = Math.max(
    0,
    TABS.findIndex((t) => t.id === mainTab)
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        Boolean(el?.isContentEditable);
      if (
        e.key === '/' &&
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        searchRef.current?.offsetParent
      ) {
        e.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full select-none border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto grid h-14 w-full max-w-[1440px] grid-cols-[44px_1fr_44px] items-center gap-2 px-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:h-16 lg:px-8">
        <div className="flex items-center justify-start">
          <FilterButton
            className="grid sm:hidden"
            count={activeFilterCount}
            onClick={openFilters}
          />
          <BrandMark className="hidden sm:flex" />
        </div>

        <nav
          aria-label="Main sections"
          className="relative mx-auto grid h-full w-full max-w-[280px] grid-cols-3 text-center sm:h-10 sm:w-[264px] sm:max-w-none sm:rounded-full sm:border sm:border-line sm:bg-surface sm:p-1 lg:w-[312px]"
        >
          {/* Mobile active dot indicator */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 left-0 flex w-1/3 justify-center transition-transform duration-200 ease-out motion-reduce:transition-none sm:hidden"
            style={{ transform: `translateX(${index * 100}%)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>

          {/* Tablet/Desktop sliding pill indicator */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 hidden w-[calc((100%-0.5rem)/3)] rounded-full border border-accent/30 bg-accent/15 transition-transform duration-200 ease-out motion-reduce:transition-none sm:block"
            style={{ transform: `translateX(${index * 100}%)` }}
          />

          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-current={t.id === mainTab ? 'page' : undefined}
              className={`relative z-10 text-tab font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none sm:rounded-full ${
                t.id === mainTab
                  ? 'text-ink sm:text-accent-soft'
                  : 'text-faint hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <form
            role="search"
            className="relative hidden lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.trim();
              router.push(v ? `/search?q=${encodeURIComponent(v)}` : '/search');
            }}
          >
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search contests"
              placeholder="Search contests"
              className="h-10 w-[200px] rounded-full border border-line bg-surface pl-10 pr-9 text-body text-ink outline-none transition-[width,border-color] duration-200 placeholder:text-faint focus:border-accent/60 motion-reduce:transition-none xl:w-[240px] xl:focus:w-[320px]"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line px-1.5 text-caption text-faint">
              /
            </kbd>
          </form>

          <Link
            href="/search"
            aria-label="Search"
            className="hidden h-11 w-11 place-items-center rounded-full text-accent transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none sm:grid lg:hidden"
          >
            <Search size={20} />
          </Link>

          <FilterButton
            className="hidden sm:grid"
            count={activeFilterCount}
            onClick={openFilters}
          />

          <AvatarButton onClick={openDrawer} />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
