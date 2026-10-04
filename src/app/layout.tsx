import '../app/globals.css';
import type { Metadata } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppShell } from '@/components/navigation/AppShell';
import { PwaRegister } from '@/components/providers/PwaRegister';

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
  description: 'Contests & 1v1 battle platform',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <body className="bg-bg text-ink font-sans min-h-screen">
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
