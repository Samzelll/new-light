import '../app/globals.css';
import type { Metadata } from 'next';
import { Manrope, Unbounded, Onest } from 'next/font/google';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppShell } from '@/components/navigation/AppShell';
import { PwaRegister } from '@/components/providers/PwaRegister';

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-onest',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport = {
  themeColor: '#0b0b0d',
};

export const metadata: Metadata = {
  title: 'Opinion Net',
  description: 'Curated spotlight feed for opinion voting contests, battles, and platform rankings.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
  },
};

import { PerfInit } from '@/perf/PerfInit';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="en" className={`${manrope.variable} ${unbounded.variable} ${onest.variable}`} suppressHydrationWarning>
      <head>
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} />}
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className="bg-bg text-ink font-sans min-h-screen">
        <PerfInit />
        <ReduxProvider>
          <AuthProvider>
            <PwaRegister />
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
