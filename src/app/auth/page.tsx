"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Layers, Eye, EyeOff } from 'lucide-react';

type Mode = 'signin' | 'register';

// Wrapped in Suspense because useSearchParams() requires it in Next.js 14
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason'); // e.g. 'guest_limit'
  const { login, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>(reason === 'guest_limit' ? 'register' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';
  const isDisabled = isLoading || !email || !password || password.length < 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    setIsLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw new Error(signUpError);
      } else {
        const { error: loginError } = await login(email, password);
        if (loginError) {
          if (loginError.toLowerCase().includes('invalid login credentials')) {
            throw new Error('Invalid email or password.');
          }
          throw new Error(loginError);
        }
      }
      // Redirect: go back if there's a referrer, else home
      const from = document.referrer;
      if (from && !from.includes('/auth') && from.includes(window.location.host)) {
        router.back();
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative', overflow: 'hidden',
      background: 'var(--color-surface-900)',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-80px',
        width: '380px', height: '380px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,97,255,0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-60px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.11) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(56,97,255,0.4)',
          }}>
            <Layers size={26} color="white" strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: 0 }}>
            Opinion Net
          </h1>
        </div>

        {/* Guest limit notice */}
        {reason === 'guest_limit' && (
          <div style={{
            padding: '12px 16px', borderRadius: '14px', marginBottom: '16px',
            background: 'rgba(255,200,87,0.08)', border: '1px solid rgba(255,200,87,0.25)',
            display: 'flex', gap: '10px', alignItems: 'center',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>🎉</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-accent-yellow)' }}>
                You've used your free votes!
              </div>
              <div style={{ fontSize: '12px', color: 'rgb(156,163,175)', marginTop: '2px' }}>
                Create a free account to keep voting and track your streak.
              </div>
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div style={{
          display: 'flex', borderRadius: '14px', padding: '4px',
          background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
          marginBottom: '20px',
        }}>
          {(['signin', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: '10px', border: 'none',
                fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m
                  ? 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-500))'
                  : 'transparent',
                color: mode === m ? 'white' : 'rgb(107,114,128)',
                boxShadow: mode === m ? '0 2px 8px rgba(56,97,255,0.3)' : 'none',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--color-surface-800)',
          border: '1px solid var(--color-surface-600)',
          borderRadius: '24px', padding: '32px 28px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: '0 0 6px' }}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgb(107,114,128)', margin: 0, lineHeight: '1.5' }}>
              {isRegister ? 'Sign up free — no credit card required' : 'Enter your credentials to continue'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 14px', borderRadius: '12px', marginBottom: '16px',
              background: 'rgba(255,87,87,0.08)', border: '1px solid rgba(255,87,87,0.25)',
              color: 'var(--color-accent-red)', fontSize: '13px', lineHeight: '1.4',
            }}>
              <span style={{ fontWeight: '700' }}>⚠️ </span>{error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label htmlFor="auth-email" style={{
                display: 'block', fontSize: '11px', fontWeight: '700',
                color: 'rgb(156,163,175)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: '8px',
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'rgb(107,114,128)', pointerEvents: 'none',
                }}>
                  <Mail size={16} strokeWidth={2} />
                </div>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  style={{ paddingLeft: '42px' }}
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" style={{
                display: 'block', fontSize: '11px', fontWeight: '700',
                color: 'rgb(156,163,175)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: '8px',
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'rgb(107,114,128)', pointerEvents: 'none',
                }}>
                  <Lock size={16} strokeWidth={2} />
                </div>
                <input
                  id="auth-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  style={{ paddingLeft: '42px', paddingRight: '44px' }}
                />
                {/* Show/hide toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgb(107,114,128)', display: 'flex', alignItems: 'center',
                    padding: '4px', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgb(107,114,128)')}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                </button>
              </div>
              {isRegister && password.length > 0 && password.length < 6 && (
                <p style={{ fontSize: '11px', color: 'var(--color-accent-red)', marginTop: '6px' }}>
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isDisabled}
              style={{
                width: '100%', padding: '13px 20px', borderRadius: '14px', border: 'none',
                background: isDisabled
                  ? 'var(--color-surface-600)'
                  : 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
                color: 'white', fontSize: '14px', fontWeight: '700',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDisabled ? 'none' : '0 6px 18px rgba(56,97,255,0.35)',
                marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
              onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite', display: 'inline-block',
                  }} />
                  {isRegister ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                isRegister ? 'Create Account →' : 'Sign In →'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: 'rgb(75,85,99)' }}>
          By continuing you agree to our{' '}
          <span style={{ color: 'rgb(107,114,128)', cursor: 'pointer' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: 'rgb(107,114,128)', cursor: 'pointer' }}>Privacy Policy</span>
        </p>
      </div>
    </main>
  );
}
