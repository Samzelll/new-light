'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useChrome } from '@/components/navigation/ChromeContext';
import { AvatarButton, BrandMark } from './HeaderParts';

export interface PageHeaderProps {
  title?: string;
  backHref?: string;
  actions?: ReactNode;
  overlay?: boolean;
}

export function PageHeader({
  title,
  backHref,
  actions,
  overlay = false,
}: PageHeaderProps) {
  const router = useRouter();
  const { openDrawer } = useChrome();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const wrapperClass = overlay
    ? 'absolute inset-x-0 top-0 z-40 select-none bg-linear-to-b from-bg/70 to-transparent pt-[env(safe-area-inset-top)] lg:sticky lg:border-b lg:border-line lg:bg-none lg:bg-bg/90 lg:backdrop-blur-md'
    : 'sticky top-0 z-40 w-full select-none border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md';

  const backBtnClass = overlay
    ? 'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line/60 bg-bg/60 text-ink backdrop-blur-md transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none lg:border-transparent lg:bg-transparent lg:backdrop-blur-none'
    : 'grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 motion-reduce:transition-none';

  return (
    <header className={wrapperClass}>
      <div className="mx-auto grid h-14 w-full max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:h-16 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className={backBtnClass}
          >
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <BrandMark className="hidden sm:flex" />
        </div>

        <div className="min-w-0 sm:text-center">
          {title && (
            <h1 className="truncate font-display text-title font-semibold text-ink">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {actions}
          <AvatarButton onClick={openDrawer} />
        </div>
      </div>
    </header>
  );
}

export default PageHeader;
