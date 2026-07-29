"use client";

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { signUpWithPassword as apiSignUp, signInWithPassword as apiSignIn, signOut as apiSignOut } from '@/services/authService';
import { clearAuth, setAuth } from '@/features/auth/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, profile, isAuthenticated, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  const signUp = async (email: string, password: string) => {
    const { user: authedUser, error } = await apiSignUp(email, password);
    if (!error && authedUser) {
      const defaultProfile = {
        id: authedUser.id,
        username: authedUser.email.split('@')[0],
        role: 'user' as const,
        avatar_url: null,
      };
      dispatch(setAuth({ user: authedUser, profile: defaultProfile }));
    }
    return { error };
  };

  const login = async (email: string, password: string) => {
    const { user: authedUser, error } = await apiSignIn(email, password);
    if (!error && authedUser) {
      const defaultProfile = {
        id: authedUser.id,
        username: authedUser.email.split('@')[0],
        role: 'user' as const,
        avatar_url: null,
      };
      dispatch(setAuth({ user: authedUser, profile: defaultProfile }));
    }
    return { error };
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
    signUp,
    login,
    logout,
  };
}
