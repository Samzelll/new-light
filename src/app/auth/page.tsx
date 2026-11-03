"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, KeyRound, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setAuth } from '@/features/auth/authSlice';

export default function AuthPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, router]);

  // 10-minute timer for OTP
  useEffect(() => {
    if (step !== 'otp') return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setTimer(600);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }
    setIsLoading(true);
    setError(null);

    // Mock adapter verification: accepts 000000 or any 6-digit code
    setTimeout(() => {
      setIsLoading(false);
      const username = email.split('@')[0];
      dispatch(
        setAuth({
          user: { id: `usr-${Date.now()}`, email },
          profile: {
            id: `usr-${Date.now()}`,
            username,
            displayName: username.charAt(0).toUpperCase() + username.slice(1),
            role: 'user',
            avatarUrl: null,
          } as any,
        })
      );
      router.push('/profile');
    }, 450);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
          <p className="text-xs text-muted mt-1">
            {step === 'email'
              ? 'Sign in with a one-time email code'
              : `Code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-surface-2 border border-danger/40 text-xs text-danger text-center animate-fade-in font-medium">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted">
                Your email address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-2 border border-line text-ink placeholder-faint text-sm focus:outline-none focus:border-accent transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-muted" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3.5 rounded-full bg-accent-solid hover:bg-accent-hover disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Sending...' : 'Get verification code'}
            </button>

            <p className="text-[11px] text-faint text-center leading-relaxed">
              We will send a 6-digit code. No passwords required.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-muted">
                  6-digit code
                </label>
                <span className="text-[11px] font-bold text-muted tabular-nums">
                  Expires in: {formatTimer(timer)}
                </span>
              </div>
              <div className="relative">
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.35em] text-lg font-bold py-3 rounded-xl bg-surface-2 border border-line text-ink placeholder-faint focus:outline-none focus:border-accent transition-colors"
                />
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-muted" />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-2 border border-line text-[11px] text-muted text-center">
              💡 For quick testing enter <span className="text-accent font-bold">000000</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full py-3.5 rounded-full bg-accent-solid hover:bg-accent-hover disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
              className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
