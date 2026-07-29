// ============================================================
// PERMISSIONS — extensible role-based access control
// ============================================================
// To add paid "creator" accounts in the future:
// 1. Add 'creator' to the UserRole type
// 2. Add 'creator' to CONTEST_CREATOR_ROLES
// 3. Set role = 'creator' in the profiles table for paying users
// ============================================================

export type UserRole = 'user' | 'expert' | 'moderator' | 'admin' | 'developer' | 'creator';

// Roles allowed to create contests.
export const CONTEST_CREATOR_ROLES: UserRole[] = ['admin', 'developer', 'user', 'creator', 'expert', 'moderator'];

// Roles allowed to approve/reject participant applications
export const CONTEST_MODERATOR_ROLES: UserRole[] = ['admin', 'developer', 'moderator'];

// Roles with full admin panel access
export const ADMIN_ROLES: UserRole[] = ['admin', 'developer'];

// ── Permission checks (use these everywhere, never compare role strings directly) ──

export function canCreateContest(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return CONTEST_CREATOR_ROLES.includes(role as UserRole);
}

export function canModerateContests(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return CONTEST_MODERATOR_ROLES.includes(role as UserRole);
}

export function isAdmin(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as UserRole);
}

export function canVote(role: UserRole | string | undefined | null): boolean {
  // All authenticated users can vote
  return !!role;
}

export function canSubmitApplication(role: UserRole | string | undefined | null): boolean {
  // All authenticated users can submit contest applications
  return !!role;
}
