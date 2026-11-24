import type { ReactNode } from 'react';

const SIZES = {
  narrow: 'max-w-md',
  medium: 'max-w-3xl',
  wide: 'max-w-6xl',
  full: 'max-w-[1440px]',
} as const;

export function PageShell({
  size = 'wide',
  className = '',
  children,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`mx-auto w-full ${SIZES[size]} px-4 pb-16 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </main>
  );
}
