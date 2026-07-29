/**
 * Formats a decimal percentage to a display string (e.g. 0.456 -> "45.6%").
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0%';
  // If the value is already in 0-100 range (which is stored in database as vote_percentage)
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * Formats ISO strings into human readable date/time representations.
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Computes a human-readable countdown timer string from a future date.
 */
export function getCountdown(targetDateInput: string | Date | undefined | null): string {
  if (!targetDateInput) return 'Closed';
  const targetTime = typeof targetDateInput === 'string' ? new Date(targetDateInput).getTime() : targetDateInput.getTime();
  const now = Date.now();
  const diff = targetTime - now;

  if (diff <= 0) return 'Ended';

  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h remaining`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m remaining`;
  }
  return `${diffMinutes}m remaining`;
}
