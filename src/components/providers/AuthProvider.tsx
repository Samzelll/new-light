"use client";

import { useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { setAuth, clearAuth, setInitialized } from '@/features/auth/authSlice';
import { RootState } from '@/lib/store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);

  // Handle onboarding redirect
  useEffect(() => {
    if (isInitialized && isAuthenticated && pathname !== '/onboarding') {
      const onboarded = localStorage.getItem('onboarded');
      if (onboarded !== 'true') {
        router.push('/onboarding');
      }
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  useEffect(() => {
    let isMounted = true;

    async function syncUserSession(user: any) {
      if (!user) {
        if (isMounted) dispatch(clearAuth());
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (isMounted) {
          dispatch(
            setAuth({
              user: { id: user.id, email: user.email || '' },
              profile: profile || {
                id: user.id,
                username: user.email?.split('@')[0] || 'user',
                role: 'user',
                avatar_url: null,
              },
            })
          );
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (isMounted) {
          dispatch(
            setAuth({
              user: { id: user.id, email: user.email || '' },
              profile: {
                id: user.id,
                username: user.email?.split('@')[0] || 'user',
                role: 'user',
                avatar_url: null,
              },
            })
          );
        }
      }
    }

    // Initial session check from local storage
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        syncUserSession(session.user).finally(() => {
          if (isMounted) dispatch(setInitialized());
        });
      } else {
        if (isMounted) {
          dispatch(clearAuth());
          dispatch(setInitialized());
        }
      }
    });

    // Listen to real-time auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      if (session?.user) {
        await syncUserSession(session.user);
      } else {
        if (isMounted) dispatch(clearAuth());
      }
      if (isMounted) dispatch(setInitialized());
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
