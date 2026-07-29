import '../app/globals.css';
import type { Metadata } from 'next';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppShell } from '@/components/navigation/AppShell';
import { PwaRegister } from '@/components/providers/PwaRegister';
import { ToastProvider } from '@/components/ui/Toast';
import { FirstVisitRedirect } from '@/components/providers/FirstVisitRedirect';

export const viewport = {
  themeColor: '#0b0d12',
};

export const metadata: Metadata = {
  title: 'Opinion Net',
  description: 'Vote on trending contests and watch results unfold in real time.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'Opinion Net',
    description: 'Vote on trending contests and watch results unfold in real time.',
    siteName: 'Opinion Net',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Opinion Net',
    description: 'Vote on trending contests and watch results unfold in real time.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ReduxProvider>
          <AuthProvider>
            <ToastProvider>
              <PwaRegister />
              <FirstVisitRedirect />
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
