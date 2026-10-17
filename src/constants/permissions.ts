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
export const CONTEST_CREATOR_ROLES: UserRole[] = ['admin', 'developer', 'creator', 'moderator'];

// Roles allowed to approve/reject participant applications
export const CONTEST_MODERATOR_ROLES: UserRole[] = ['admin', 'developer', 'moderator'];

// Roles with full admin panel access (Superadmins / Platform Owners)
export const ADMIN_ROLES: UserRole[] = ['admin', 'developer'];

// Roles allowed to manage contests in the dashboard
export const DASHBOARD_ACCESS_ROLES: UserRole[] = ['admin', 'developer', 'moderator', 'creator'];

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

export function isPlatformAdmin(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isCreator(role: UserRole | string | undefined | null): boolean {
  return role === 'creator';
}

export function canAccessAdminDashboard(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return DASHBOARD_ACCESS_ROLES.includes(role as UserRole);
}

/**
 * Superadmins have unrestricted post-production control over all contests.
 * Independent creators can only edit basic details (title, cover, info) of their own contests.
 */
export function canManageContest(
  role: UserRole | string | undefined | null,
  contestCreatedBy?: string | null,
  currentUserId?: string | null
): boolean {
  if (!role) return false;
  if (isPlatformAdmin(role)) return true;
  if (role === 'creator') {
    // If no created_by specified yet or created by current user, creator can manage
    if (!contestCreatedBy || !currentUserId) return true;
    return contestCreatedBy === currentUserId;
  }
  return false;
}

/**
 * High-privilege platform operations: freezing/unfreezing, hiding from public feed,
 * permanent deletion, force state jumping, and user moderation.
 * Reserved exclusively for platform administrators.
 */
export function canPerformPlatformActions(role: UserRole | string | undefined | null): boolean {
  return isPlatformAdmin(role);
}

export function canVote(role: UserRole | string | undefined | null): boolean {
  // All authenticated users can vote
  return !!role;
}

export function canSubmitApplication(role: UserRole | string | undefined | null): boolean {
  // All authenticated users can submit contest applications
  return !!role;
}
