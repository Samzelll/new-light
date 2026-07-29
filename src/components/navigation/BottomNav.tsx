"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { navItems } from './navItems';
import type { RootState } from '@/lib/store';
import { LogIn } from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, profile } = useSelector((state: RootState) => state.auth);

  const allowedRoles = ['admin', 'developer', 'creator'];
  const canCreate = profile && allowedRoles.includes(profile.role);
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  const visibleItems = navItems.filter((item) => {
    if (item.href === '/create' && !canCreate) return false;
    if (item.href === '/admin' && !isAdmin) return false;
    return true;
  });

  return (
    <nav className="bottomnav">
      <div className="bottomnav-inner">
        {visibleItems.map((item) => {
          const active = item.href === '/' ? pathname === item.href : pathname?.startsWith(item.href);
          const isCreate = item.href === '/create';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottomnav-link${active ? ' active' : ''}${isCreate ? ' create' : ''}`}
            >
              <span className="bottomnav-icon flex items-center justify-center">
                <item.icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2}
                  className={`transition-all duration-300 ${active ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(56,97,255,0.6)]' : 'text-gray-400'}`}
                />
              </span>
              <span className="bottomnav-label">{item.label}</span>
              {active && !isCreate && <span className="bottomnav-dot" />}
            </Link>
          );
        })}

        {/* Sign In button for unauthenticated users */}
        {!isAuthenticated && (
          <Link
            href="/auth"
            className={`bottomnav-link${pathname === '/auth' ? ' active' : ''}`}
            style={{
              background: pathname !== '/auth'
                ? 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-500))'
                : undefined,
              borderRadius: '14px',
              color: 'white',
              padding: '6px 14px',
              boxShadow: pathname !== '/auth' ? '0 4px 12px rgba(56,97,255,0.35)' : undefined,
            }}
          >
            <span className="bottomnav-icon flex items-center justify-center">
              <LogIn size={20} strokeWidth={2.5} className="drop-shadow-md" />
            </span>
            <span className="bottomnav-label">Sign In</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
