// lib/analytics-utils.ts
/**
 * Utility functions for Amplitude Analytics.
 *
 * These helpers handle PII sanitization, bucket calculations,
 * and initialization checks.
 *
 * @module lib/analytics-utils
 */

import type { EventParams, DaysSoberBucket, StepsCompletedBucket } from '@/types/analytics';

/**
 * PII fields that must be stripped from analytics events.
 * These fields could identify users and must never be sent to analytics.
 */
const PII_FIELDS = [
  'email',
  'name',
  'display_name',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'sobriety_date',
  'relapse_date',
] as const;

/**
 * Maximum recursion depth to prevent infinite loops.
 */
const MAX_DEPTH = 10;

/**
 * Remove personally identifiable information (PII) keys from a value recursively.
 *
 * Recursively traverses arrays and plain objects and returns a copy with any keys listed in `PII_FIELDS` removed at all depths. Tracks visited objects to break reference cycles (in which case `undefined` is returned for that branch) and stops recursion when `depth` exceeds `MAX_DEPTH`, returning the value unchanged.
 *
 * @param value - The value to sanitize; may be a primitive, array, or object.
 * @param visited - Internal WeakSet used to track objects already traversed to avoid cycles.
 * @param depth - Current recursion depth; when greater than `MAX_DEPTH` the original `value` is returned.
 * @returns The sanitized value with PII keys removed, `undefined` for a cyclic branch, or the original value if recursion depth is exceeded.
 */
function sanitizeValue(
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
  depth: number = 0
): unknown {
  if (depth > MAX_DEPTH) return value;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, visited, depth + 1));
  }

  if (typeof value === 'object') {
    if (visited.has(value)) return undefined;
    visited.add(value);

    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (PII_FIELDS.includes(key as (typeof PII_FIELDS)[number])) continue;
      sanitized[key] = sanitizeValue(val, visited, depth + 1);
    }

    visited.delete(value);
    return sanitized;
  }

  return value;
}

/**
 * Strip PII fields from event parameters.
 *
 * @param params - Event parameters to sanitize; may be undefined.
 * @returns The parameters with PII keys removed; returns an empty object if `params` is falsy or sanitization fails.
 */
export function sanitizeParams(params: EventParams | undefined): EventParams {
  if (!params) return {};
  const sanitized = sanitizeValue(params) as EventParams;
  return sanitized || {};
}

/**
 * Determine the bucket label for a given number of sober days.
 *
 * @param days - The number of days sober used to select a bucket.
 * @returns One of: `'0-7'`, `'8-30'`, `'31-90'`, `'91-180'`, `'181-365'`, or `'365+'`. Each numeric range is inclusive of its lower and upper bounds; `'365+'` represents values greater than 365.
 */
export function calculateDaysSoberBucket(days: number): DaysSoberBucket {
  if (days <= 7) return '0-7';
  if (days <= 30) return '8-30';
  if (days <= 90) return '31-90';
  if (days <= 180) return '91-180';
  if (days <= 365) return '181-365';
  return '365+';
}

/**
 * Map a steps-completed count to its predefined bucket label.
 *
 * @param count - The number of steps completed in a multi-step flow
 * @returns `'0'` if `count` <= 0, `'1-3'` if `count` is between 1 and 3, `'4-6'` if between 4 and 6, `'7-9'` if between 7 and 9, otherwise `'10-12'`
 */
export function calculateStepsCompletedBucket(count: number): StepsCompletedBucket {
  if (count <= 0) return '0';
  if (count <= 3) return '1-3';
  if (count <= 6) return '4-6';
  if (count <= 9) return '7-9';
  return '10-12';
}

/**
 * Determine whether Amplitude Analytics should be initialized based on the configured API key.
 *
 * @returns `true` if the environment variable `EXPO_PUBLIC_AMPLITUDE_API_KEY` exists and is not empty after trimming, `false` otherwise.
 */
export function shouldInitializeAnalytics(): boolean {
  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY?.trim();
  return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Determines whether analytics should run in debug mode.
 *
 * @returns `true` if `__DEV__` is truthy or `EXPO_PUBLIC_ANALYTICS_DEBUG` equals `'true'`, `false` otherwise.
 */
export function isDebugMode(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true';
}

/**
 * Determine the analytics environment tag.
 *
 * @returns `'development'` when `__DEV__` is truthy; otherwise the value of `EXPO_PUBLIC_APP_ENV` if set, or `'production'`.
 */
export function getAnalyticsEnvironment(): string {
  if (__DEV__) return 'development';
  return process.env.EXPO_PUBLIC_APP_ENV || 'production';
}
