/**
 * Data Layer Contract Entry Point
 * Defined in docs/DATA_LAYER.md
 * Currently bound to the mock adapter (services/mock).
 */

import * as mock from './mock';

export const {
  authService,
  contestService,
  entryService,
  feedService,
  voteService,
  profileService,
  adminService,
  storageService,
  timeService,
} = mock;

export * from './types';
