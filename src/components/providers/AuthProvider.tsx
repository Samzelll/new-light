"use client";

import { useEffect, ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, testConnection } from '@/lib/firebase';
import { setAuth, clearAuth, setInitialized } from '@/features/auth/authSlice';
import { ensureProfileExists } from '@/services/profileService';
import { ensureSeedDataInFirestore } from '@/services/seedData';
import { resolveImageUrl } from '@/services/storageService';
import type { Profile as AuthProfile } from '@/features/contests/types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    testConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (isMounted) {
          dispatch(clearAuth());
          dispatch(setInitialized());
        }
        return;
      }

      try {
        const profile = await ensureProfileExists(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName,
          firebaseUser.photoURL
        );

        if (profile.role === 'admin') {
          ensureSeedDataInFirestore().catch(() => {});
        }

        if (isMounted) {
          const resolvedProfile: AuthProfile = {
            ...profile,
            avatar_url: profile.avatar_url
              ? resolveImageUrl(profile.avatar_url, 'avatars')
              : null,
          };

          dispatch(
            setAuth({
              user: {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              },
              profile: resolvedProfile,
            })
          );
        }
      } catch (err) {
        console.error('Error syncing Firebase user profile:', err);
        if (isMounted) {
          dispatch(
            setAuth({
              user: {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              },
              profile: {
                id: firebaseUser.uid,
                username: firebaseUser.email?.split('@')[0] || 'user',
                display_name: firebaseUser.displayName || null,
                role: 'user',
                avatar_url: firebaseUser.photoURL || null,
              },
            })
          );
        }
      } finally {
        if (isMounted) {
          dispatch(setInitialized());
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
