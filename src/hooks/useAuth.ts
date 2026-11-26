"use client";

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import {
  signInWithGoogle as apiSignInWithGoogle,
  signOut as apiSignOut,
} from '@/services/authService';
import { ensureProfileExists } from '@/services/profileService';
import { resolveImageUrl } from '@/services/storageService';
import { clearAuth, setAuth } from '@/features/auth/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, profile, isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  const signInWithGoogle = async () => {
    const { user: authedUser, error } = await apiSignInWithGoogle();
    if (!error && authedUser) {
      try {
        const ensured = await ensureProfileExists(
          authedUser.id,
          authedUser.email,
          authedUser.displayName,
          authedUser.photoURL
        );
        dispatch(
          setAuth({
            user: authedUser,
            profile: {
              ...ensured,
              avatar_url: ensured.avatar_url
                ? resolveImageUrl(ensured.avatar_url, 'avatars')
                : null,
            },
          })
        );
      } catch (err) {
        console.error('Failed ensuring profile on Google sign-in:', err);
      }
    }
    return { user: authedUser, error };
  };

  const logout = async () => {
    const { error } = await apiSignOut();
    if (!error) {
      dispatch(clearAuth());
    }
    return { error };
  };

  return {
    user,
    profile,
    isAuthenticated,
    isInitialized,
    signInWithGoogle,
    logout,
  };
}
