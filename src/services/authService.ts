import { supabase } from './supabase';

// ── Types ────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
}

// Production URL for magic link redirects (fallback if OTP template not updated)
const SITE_URL = 'https://arcadia-f834f.web.app';

// ── signUpWithPassword ──────────────────────────────────────────────
export async function signUpWithPassword(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { user: null, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters long.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password: password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return {
    user: data.user ? { id: data.user.id, email: data.user.email ?? '' } : null,
    error: null,
  };
}

// ── signInWithPassword ──────────────────────────────────────────────
export async function signInWithPassword(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { user: null, error: 'Please enter a valid email address.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: password,
  });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Login failed' };
  }

  return {
    user: { id: data.user.id, email: data.user.email ?? '' },
    error: null,
  };
}

// ── signOut ───────────────────────────────────────────────────────
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

// ── getCurrentUser ────────────────────────────────────────────────
// Returns the currently authenticated user, or null.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { id: user.id, email: user.email ?? '' };
}

// ── onAuthStateChange ─────────────────────────────────────────────
// Subscribe to auth state changes. Returns unsubscribe function.
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    if (session?.user) {
      callback({ id: session.user.id, email: session.user.email ?? '' });
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}
