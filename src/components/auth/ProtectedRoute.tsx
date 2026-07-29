"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/constants/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[] | string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, profile } = useAuth();

  useEffect(() => {
    if (isInitialized) {
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // Redirect to homepage if user doesn't have permissions
        router.push('/');
      }
    }
  }, [isInitialized, isAuthenticated, profile, allowedRoles, router]);

  if (!isInitialized) {
    return (
      <div className="page-container flex flex-col justify-center items-center">
        <div className="skeleton w-12 h-12 rounded-full mb-4" />
        <div className="skeleton w-32 h-4 rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null; // Redirecting
  }

  return <>{children}</>;
}
