/**
 * Shared date utility functions
 */

import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { differenceInCalendarDays } from 'date-fns';

/**
 * Parses a date string (YYYY-MM-DD) as midnight in a specific timezone.
 *
 * When users set a sobriety date like "January 1st", they mean midnight
 * in their timezone, not UTC. This function creates a UTC Date that
 * represents midnight in the specified timezone.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone string
 * @returns Date object (in UTC) that represents midnight in the specified timezone
 */
function parseDateInTimezone(dateString: string, timezone: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Use Intl to find what UTC time corresponds to midnight in the timezone
  // We'll test with noon UTC to get a stable offset (avoiding DST edge cases)
  const testUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Get what hour noon UTC is in the timezone
  const tzTimeStr = formatter.format(testUtc);
  const [tzHour] = tzTimeStr.split(':').map(Number);
  
  // Calculate offset: if UTC noon is hour X in timezone, offset is (12 - X) hours
  // Example: UTC noon = 4am PST (UTC-8), so offset is +8 hours
  const offsetHours = 12 - tzHour;
  
  // Create UTC midnight, then adjust by offset to get what UTC time
  // corresponds to midnight in the timezone
  const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return new Date(utcMidnight.getTime() + offsetHours * 3600000);
}

/**
 * Calculates the difference in calendar days between two dates in a specific timezone.
 *
 * Uses calendar day comparison rather than timestamp math to ensure day counts
 * increment at midnight in the user's timezone, not UTC. This is critical for
 * sobriety tracking where users expect day counts to change at their local midnight.
 *
 * @param startDate - The earlier date (Date object or YYYY-MM-DD string, interpreted in timezone)
 * @param endDate - The later date (defaults to now, interpreted in timezone)
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles'). Defaults to device timezone
 * @returns Number of calendar days between dates in the specified timezone, minimum 0
 *
 * @example
 * ```ts
 * // User in PST sets sobriety date as "January 1st"
 * const days = getDateDiffInDays('2024-01-01', new Date(), 'America/Los_Angeles');
 * // Day count increments at PST midnight, not UTC midnight
 * ```
 */
export function getDateDiffInDays(
  startDate: Date | string,
  endDate: Date = new Date(),
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): number {
  // If startDate is a string (YYYY-MM-DD), parse it as midnight in the timezone
  let start: Date;
  if (typeof startDate === 'string') {
    start = parseDateInTimezone(startDate, timezone);
  } else {
    start = startDate;
  }

  // Convert both dates to the user's timezone for calendar day comparison
  const zonedStart = toZonedTime(start, timezone);
  const zonedEnd = toZonedTime(endDate, timezone);

  // Calculate calendar day difference (not timestamp-based)
  // This counts full calendar days, so Jan 1 23:59 to Jan 2 00:01 = 1 day
  const diffDays = differenceInCalendarDays(zonedEnd, zonedStart);

  return Math.max(0, diffDays);
}
