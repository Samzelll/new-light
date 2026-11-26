import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

function mapFirebaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export async function signInWithGoogle(): Promise<{
  user: AuthUser | null;
  error: string | null;
}> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return {
      user: mapFirebaseUser(cred.user),
      error: null,
    };
  } catch (err: any) {
    const code = err?.code as string | undefined;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { user: null, error: 'Sign-in popup was closed before completing.' };
    }
    return {
      user: null,
      error: err?.message || 'Google Sign-In failed.',
    };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to sign out.' };
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return mapFirebaseUser(auth.currentUser);
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(mapFirebaseUser(firebaseUser));
  });
}
