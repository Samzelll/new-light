"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, KeyRound, CheckCircle2, Flame, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center justify-center p-4 selection:bg-[#ff6a2b]/30">
      <div className="w-full max-w-sm mx-auto bg-[#161619] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff6a2b] to-[#ff944d] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#ff6a2b]/30">
            <Flame size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            Opinion <span className="text-[#ff6a2b]">Net</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {step === 'email'
              ? 'Sign in with a one-time email code'
              : `Code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 text-center animate-fade-in">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
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
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#222226] border border-neutral-700/80 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#ff6a2b] transition-colors"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3.5 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#ff6a2b]/25 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Sending...' : 'Get verification code'}
            </button>

            <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
              We will send a 6-digit code. No passwords required.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  6-digit code
                </label>
                <span className="text-[11px] font-bold text-neutral-400 tabular-nums">
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
                  className="w-full text-center tracking-[0.35em] text-lg font-bold py-3 rounded-2xl bg-[#222226] border border-neutral-700/80 text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff6a2b] transition-colors"
                />
                <KeyRound size={16} className="absolute left-3.5 top-3.5 text-neutral-400" />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#202026] border border-neutral-800 text-[11px] text-neutral-400 text-center">
              💡 For quick testing enter <span className="text-[#ff6a2b] font-bold">000000</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full py-3.5 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#ff6a2b]/25 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Verifying...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
              className="w-full text-center text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
