/**
 * timeService (Mock implementation with injected virtual clock)
 * Rules:
 * - now() returns server time
 * - nextCycleBoundary(date) returns the next 06:00 UTC
 * - devJumpToNextCycle() advances clock to the next 06:00 UTC
 */

let virtualTimeOffsetMs = 0;

export const timeService = {
  now(): Date {
    return new Date(Date.now() + virtualTimeOffsetMs);
  },

  nowIso(): string {
    return this.now().toISOString();
  },

  nextCycleBoundary(fromDate?: Date): Date {
    const d = fromDate ? new Date(fromDate) : this.now();
    // 06:00 UTC cycle
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6, 0, 0, 0));
    if (next.getTime() <= d.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  },

  formatTimeUntil(targetDate: Date | string): string {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const diffMs = target.getTime() - this.now().getTime();
    if (diffMs <= 0) return '0 min';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },

  devJumpToNextCycle(): Date {
    const next = this.nextCycleBoundary();
    virtualTimeOffsetMs += (next.getTime() - this.now().getTime()) + 1000;
    return this.now();
  },

  devResetTime(): void {
    virtualTimeOffsetMs = 0;
  },
};
