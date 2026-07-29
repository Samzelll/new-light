"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { navItems } from './navItems';
import type { RootState } from '@/lib/store';
import { LogIn, Layers, Shield, Zap } from 'lucide-react';

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  developer: {
    label: 'Developer',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.15)',
    icon: <Zap size={10} />,
  },
  admin: {
    label: 'Admin',
    color: 'var(--color-accent-red)',
    bg: 'rgba(255,87,87,0.12)',
    icon: <Shield size={10} />,
  },
  creator: {
    label: 'Creator',
    color: 'var(--color-accent-yellow)',
    bg: 'rgba(255,200,87,0.12)',
    icon: <Zap size={10} />,
  },
  moderator: {
    label: 'Moderator',
    color: 'var(--color-accent-green)',
    bg: 'rgba(0,229,160,0.12)',
    icon: <Shield size={10} />,
  },
};

export function SideNav() {
  const pathname = usePathname();
  const { isAuthenticated, profile } = useSelector((state: RootState) => state.auth);

  const allowedRoles = ['admin', 'developer', 'creator'];
  const canCreate = profile && allowedRoles.includes(profile.role);
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  const roleBadge = profile?.role ? ROLE_BADGE[profile.role] : null;

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
          <Layers size={20} color="white" strokeWidth={2} />
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
          const isCreateItem = item.href === '/create';
          const isAdminItem = item.href === '/admin';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidenav-link${active ? ' active' : ''}${isAdminItem ? ' sidenav-link-admin' : ''}${isCreateItem ? ' sidenav-link-create' : ''}`}
            >
              <span className="sidenav-link-icon flex items-center justify-center">
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={`transition-all duration-300 ${
                    isAdminItem
                      ? 'text-accent-red drop-shadow-[0_0_8px_rgba(255,87,87,0.6)]'
                      : isCreateItem
                      ? 'text-accent-yellow'
                      : active
                      ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(56,97,255,0.6)]'
                      : 'text-gray-400'
                  }`}
                />
              </span>
              <span className="sidenav-link-label">{item.label}</span>
              {isAdminItem && (
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: '800',
                    letterSpacing: '0.1em',
                    color: 'var(--color-accent-red)',
                    background: 'rgba(255,87,87,0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(255,87,87,0.2)',
                  }}
                >
                  ADMIN
                </span>
              )}
              {active && !isAdminItem && <span className="sidenav-link-dot" />}
            </Link>
          );
        })}
      </div>

      {/* Footer user card */}
      {isAuthenticated && profile ? (
        <div>
          {/* Role banner for privileged users */}
          {roleBadge && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '10px',
                background: roleBadge.bg,
                border: `1px solid ${roleBadge.color}30`,
                marginBottom: '8px',
              }}
            >
              <span style={{ color: roleBadge.color, display: 'flex', alignItems: 'center' }}>
                {roleBadge.icon}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: roleBadge.color, letterSpacing: '0.05em' }}>
                {roleBadge.label} Mode
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: roleBadge.color,
                  boxShadow: `0 0 6px ${roleBadge.color}`,
                  animation: 'glowPulse 2s infinite',
                }}
              />
            </div>
          )}

          <Link href="/profile" className="sidenav-user-card">
            <div className="sidenav-user-avatar">
              {profile.username ? profile.username[0].toUpperCase() : '?'}
            </div>
            <div className="sidenav-user-info">
              <div className="sidenav-user-name">@{profile.username}</div>
              <div className="sidenav-user-role">{profile.role}</div>
            </div>
          </Link>
        </div>
      ) : (
        <Link href="/auth" className="sidenav-signin-btn">
          <span className="flex items-center justify-center mr-2">
            <LogIn size={16} strokeWidth={2.5} />
          </span>
          Sign In
        </Link>
      )}
    </nav>
  );
}
