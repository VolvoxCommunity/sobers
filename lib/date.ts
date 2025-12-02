/**
 * Shared date utility functions
 */

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

// =============================================================================
// Constants
// =============================================================================

/**
 * Device timezone, cached at module load time for performance.
 *
 * This avoids creating a new DateTimeFormat instance on every function call.
 *
 * @remarks
 * **Limitation**: This value is cached when the module loads and will not update
 * if the user changes their device timezone during the session. This is acceptable
 * for most use cases since timezone changes during app usage are rare.
 * The app will use the updated timezone after a restart.
 */
export const DEVICE_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts the date portion (YYYY-MM-DD) from a Date object in a specific timezone.
 *
 * @param date - The Date object to extract from
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles')
 * @returns Date string in YYYY-MM-DD format
 */
function getDateStringInTimezone(date: Date, timezone: string): string {
  return format(new TZDate(date, timezone), 'yyyy-MM-dd');
}

/**
 * Formats a Date object as YYYY-MM-DD using the LOCAL date components.
 *
 * IMPORTANT: Use this instead of `date.toISOString().split('T')[0]` which uses UTC
 * and can return the wrong date for users in timezones behind UTC.
 *
 * @param date - The Date object to format
 * @returns Date string in YYYY-MM-DD format based on local time
 *
 * @example
 * ```ts
 * // User in EST (UTC-5) at 8 PM on Nov 1:
 * // toISOString() would give "2025-11-02" (UTC date) - WRONG!
 * // formatLocalDate() gives "2025-11-01" (local date) - CORRECT!
 * const dateStr = formatLocalDate(selectedDate);
 * ```
 */
export function formatLocalDate(date: Date): string {
  return formatDateWithTimezone(date, DEVICE_TIMEZONE);
}

/**
 * Formats a Date object as YYYY-MM-DD using specified timezone.
 *
 * @param date - The Date object to format
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles'). Defaults to device timezone
 * @returns Date string in YYYY-MM-DD format based on specified timezone
 *
 * @example
 * ```ts
 * // Format date in user's stored timezone
 * const dateStr = formatDateWithTimezone(selectedDate, userTimezone);
 * ```
 */
export function formatDateWithTimezone(date: Date, timezone: string = DEVICE_TIMEZONE): string {
  return getDateStringInTimezone(date, timezone);
}

/**
 * Parses a YYYY-MM-DD date string as midnight in a specific timezone.
 *
 * When a user sets a sobriety date like "2024-01-01", they mean midnight
 * in their timezone. This function creates a Date object that represents
 * that moment in time.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone string (e.g., 'America/Los_Angeles'). Defaults to device timezone
 * @returns Date object representing midnight on that date in the specified timezone
 *
 * @example
 * ```ts
 * // Parse date in user's stored timezone
 * const date = parseDateAsLocal("2025-01-01", userProfile.timezone);
 * ```
 */
export function parseDateAsLocal(dateStr: string, timezone: string = DEVICE_TIMEZONE): Date {
  // Create a TZDate at midnight in the specified timezone, then convert to regular Date
  return new TZDate(`${dateStr}T00:00:00`, timezone);
}

/**
 * Calculates the day difference between two YYYY-MM-DD date strings.
 *
 * Uses UTC dates to avoid any system timezone interference. This ensures
 * consistent results regardless of where the code is running.
 *
 * @param startDateStr - Start date in YYYY-MM-DD format
 * @param endDateStr - End date in YYYY-MM-DD format
 * @returns Number of days between the two dates
 */
function daysBetweenDateStrings(startDateStr: string, endDateStr: string): number {
  // Parse date parts directly to avoid Date constructor timezone interpretation
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  // Create UTC timestamps - this avoids any timezone issues
  const startUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const endUtc = Date.UTC(endYear, endMonth - 1, endDay);

  // Calculate difference in days
  // Math.round handles potential floating-point precision issues in division
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endUtc - startUtc) / msPerDay);
}

/**
 * Calculates the difference in calendar days between two dates in a specific timezone.
 *
 * This function extracts the date portion (YYYY-MM-DD) for both dates in the target
 * timezone, then calculates the difference. This approach avoids system timezone
 * interference that can occur when using date-fns functions with shifted Date objects.
 *
 * Day counts increment at midnight in the user's timezone, not UTC. This is critical
 * for sobriety tracking where users expect day counts to change at their local midnight.
 *
 * @param startDate - The earlier date (Date object or YYYY-MM-DD string)
 * @param endDate - The later date (defaults to now)
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
  timezone: string = DEVICE_TIMEZONE
): number {
  // Get the date string for the start date
  // If it's already a string (YYYY-MM-DD), use it directly
  // If it's a Date, extract the date portion in the target timezone
  const startDateStr =
    typeof startDate === 'string' ? startDate : getDateStringInTimezone(startDate, timezone);

  // Get the date string for the end date in the target timezone
  const endDateStr = getDateStringInTimezone(endDate, timezone);

  // Calculate the difference using pure date string comparison
  // This avoids any system timezone interference
  const diffDays = daysBetweenDateStrings(startDateStr, endDateStr);

  return Math.max(0, diffDays);
}
