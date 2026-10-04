"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { navItems } from './navItems';
import type { RootState } from '@/lib/store';
import { LogIn, Flame } from 'lucide-react';

export function SideNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, profile } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allowedRoles = ['admin', 'developer', 'creator'];
  const canCreate = mounted && profile && allowedRoles.includes(profile.role);
  const isAdmin = mounted && profile && ['admin', 'developer'].includes(profile.role);

  const visibleItems = navItems.filter((item) => {
    if (item.href === '/create' && !canCreate) return false;
    if (item.href === '/admin' && !isAdmin) return false;
    return true;
  });

  return (
    <nav className="sidenav">
      {/* Logo */}
      <div className="sidenav-logo">
        <div className="sidenav-logo-icon flex items-center justify-center">
          <Flame size={20} color="#F9F9F9" strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidenav-logo-title">Opinion Net</div>
          <div className="sidenav-logo-sub">Contest Platform</div>
        </div>
      </div>

      {/* Nav links */}
      <div className="sidenav-items">
        {visibleItems.map((item) => {
          const active = item.href === '/' ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidenav-link${active ? ' active' : ''}`}
            >
              <span className="sidenav-link-icon flex items-center justify-center">
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={`transition-all duration-200 ${
                    active
                      ? 'text-[#E85102] drop-shadow-[0_0_8px_rgba(232,81,2,0.6)]'
                      : 'text-[#646464] hover:text-[#F9F9F9]'
                  }`}
                />
              </span>
              <span className="sidenav-link-label">{item.label}</span>
              {active && <span className="sidenav-link-dot" />}
            </Link>
          );
        })}
      </div>

      {/* Footer user card */}
      {mounted && isAuthenticated && profile ? (
        <Link href="/profile" className="sidenav-user-card" suppressHydrationWarning>
          <div className="sidenav-user-avatar">
            {profile.username ? profile.username[0].toUpperCase() : '?'}
          </div>
          <div className="sidenav-user-info">
            <div className="sidenav-user-name">@{profile.username}</div>
            <div className="sidenav-user-role">{profile.role}</div>
          </div>
        </Link>
      ) : (
        <Link href="/auth" className="sidenav-signin-btn" suppressHydrationWarning>
          <span className="flex items-center justify-center mr-2">
            <LogIn size={16} strokeWidth={2.5} />
          </span>
          Sign In
        </Link>
      )}
    </nav>
  );
}
