/**
 * Supabase client configuration.
 * Uses the local in-browser persistent Mock Database by default
 * so all features (Login, Logout, Photo Contests, Battles, Submissions,
 * Votes, Profiles, Moderation) work flawlessly in live mode without external dependencies.
 */

import { mockSupabase } from './mockDb';

// Re-export the local mock database client as the single shared Supabase instance.
export const supabase: any = mockSupabase;

// Export helper to reset mock database if needed during testing
export function resetLocalMockDatabase() {
  if (typeof window !== 'undefined' && (window as any).__MOCK_DB__) {
    (window as any).__MOCK_DB__.resetToDefault();
    window.location.reload();
  }
}
