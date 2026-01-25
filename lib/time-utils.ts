/**
 * Time calculation utilities for expiration tracking.
 */

/**
 * Result of time remaining calculation.
 */
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

/**
 * Calculate time remaining until expiration.
 *
 * @param expiresAt - ISO timestamp string of expiration
 * @param expiringSoonDays - Days threshold for "expiring soon" (default: 2)
 * @returns Time remaining breakdown with status flags
 *
 * @example
 * ```ts
 * const time = getTimeRemaining(inviteCode.expires_at);
 * if (time.isExpired) showToast.error('Code expired');
 * ```
 */
export function getTimeRemaining(expiresAt: string, expiringSoonDays = 2): TimeRemaining {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, isExpiringSoon: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const isExpiringSoon = days < expiringSoonDays;

  return { days, hours, minutes, isExpired: false, isExpiringSoon };
}

/**
 * Format time remaining as a human-readable string.
 *
 * @param time - TimeRemaining object
 * @param format - 'short' for "2d 3h", 'long' for "2 days, 3 hours"
 * @returns Formatted time string
 */
export function formatTimeRemaining(
  time: TimeRemaining,
  format: 'short' | 'long' = 'short'
): string {
  if (time.isExpired) {
    return 'Expired';
  }

  if (format === 'short') {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`;
    }
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    return `${time.minutes}m`;
  }

  // Long format
  const parts: string[] = [];
  if (time.days > 0) {
    parts.push(`${time.days} day${time.days === 1 ? '' : 's'}`);
  }
  if (time.hours > 0) {
    parts.push(`${time.hours} hour${time.hours === 1 ? '' : 's'}`);
  }
  if (time.minutes > 0 && time.days === 0) {
    parts.push(`${time.minutes} minute${time.minutes === 1 ? '' : 's'}`);
  }

  return parts.join(', ') || 'Less than a minute';
}
