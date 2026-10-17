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

  // Hide on onboarding or when in a full-screen battle detail
  if (pathname === '/onboarding') {
    return null;
  }

  const allowedRoles = ['admin', 'developer', 'creator'];
  const canCreate = profile && allowedRoles.includes(profile.role);
  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  const visibleItems = navItems.filter((item) => {
    if (item.href === '/create' && !canCreate) return false;
    if (item.href === '/admin' && !isAdmin) return false;
    return true;
  });

  return (
    <nav
      aria-label="Desktop and tablet navigation"
      className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e12]/92 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]"
    >
      <div className="w-full max-w-md mx-auto px-3 py-1.5 flex items-center justify-around pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)]">
        {visibleItems.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
          const isCreate = item.href === '/create';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                active
                  ? 'text-[#ff6a2b]'
                  : 'text-neutral-400 hover:text-white active:scale-95'
              }`}
            >
              <div className="relative">
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={`transition-transform duration-200 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,106,43,0.6)]' : ''}`}
                />
                {active && !isCreate && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ff6a2b]" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight font-bold ${active ? 'text-[#ff6a2b]' : 'text-neutral-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Profile / Sign In button */}
        {!isAuthenticated ? (
          <Link
            href="/auth"
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
              pathname === '/auth'
                ? 'bg-[#ff6a2b] text-white shadow-md shadow-[#ff6a2b]/30'
                : 'bg-white/10 hover:bg-white/15 text-white active:scale-95'
            }`}
          >
            <LogIn size={15} strokeWidth={2.2} />
            <span>Вход</span>
          </Link>
        ) : (
          !visibleItems.some((i) => i.href === '/profile') && (
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                pathname === '/profile' ? 'text-[#ff6a2b]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-[10px] font-bold">Профиль</span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
