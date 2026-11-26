"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, signInWithGoogle } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, isInitialized, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError);
      setIsLoading(false);
    } else {
      router.push('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4 selection:bg-accent/30 font-sans">
      <div className="w-full max-w-sm mx-auto bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-xl relative">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent-solid flex items-center justify-center mx-auto mb-3 shadow-md">
            <Flame size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-ink font-display">
            Opinion <span className="text-accent">Net</span>
          </h1>
          <p className="text-xs text-muted mt-1.5">
            Sign in with your Google account to vote, submit entries, and track your trust rank.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-surface-2 border border-danger/40 text-xs text-danger text-center animate-fade-in font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-full bg-accent-solid hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"
              />
            </svg>
            <span>{isLoading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-faint pt-1">
            <ShieldCheck size={13} className="text-accent shrink-0" />
            <span>Secured by Firebase Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}
