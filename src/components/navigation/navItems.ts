import { Home, Search, PlusCircle, Shield, User } from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
};

export const navItems: NavItem[] = [
  {
    label: 'Feed',
    href: '/',
    icon: Home,
  },
  {
    label: 'Search',
    href: '/search',
    icon: Search,
  },
  {
    label: 'Create',
    href: '/create',
    icon: PlusCircle,
  },
  {
    label: 'Admin',
    href: '/admin',
    icon: Shield,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];
