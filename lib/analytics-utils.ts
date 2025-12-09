// lib/analytics-utils.ts
/**
 * Utility functions for Firebase Analytics.
 *
 * These helpers handle PII sanitization, bucket calculations,
 * and initialization checks.
 *
 * @module lib/analytics-utils
 */

import { Platform } from 'react-native';

import type { EventParams, DaysSoberBucket } from '@/types/analytics';

/**
 * PII fields that must be stripped from analytics events.
 * These fields could identify users and must never be sent to Firebase.
 */
const PII_FIELDS = [
  'email',
  'name',
  'first_name',
  'last_name',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'sobriety_date',
  'relapse_date',
] as const;

/**
 * Removes PII fields from event parameters before sending to Firebase.
 *
 * @param params - The event parameters to sanitize
 * @returns Sanitized parameters with PII fields removed
 *
 * @example
 * ```ts
 * const safe = sanitizeParams({ task_id: '123', email: 'user@test.com' });
 * // Returns: { task_id: '123' }
 * ```
 */
export function sanitizeParams(params: EventParams | undefined): EventParams {
  if (!params) return {};

  const sanitized = { ...params };

  for (const field of PII_FIELDS) {
    delete sanitized[field];
  }

  return sanitized;
}

/**
 * Calculates the appropriate bucket for days sober.
 *
 * We use buckets instead of exact values to protect user privacy
 * while still enabling cohort analysis in Firebase.
 *
 * @param days - The number of days sober
 * @returns The bucket range the days fall into
 *
 * @example
 * ```ts
 * calculateDaysSoberBucket(45); // Returns: '31-90'
 * calculateDaysSoberBucket(400); // Returns: '365+'
 * ```
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
 * Checks if Firebase Analytics should be initialized.
 *
 * On native platforms (iOS/Android), Firebase is configured via platform-specific
 * config files (GoogleService-Info.plist / google-services.json), so we always
 * attempt initialization - the native SDK validates its own config.
 *
 * On web, we check for the measurement ID environment variable since web
 * requires explicit configuration via environment variables.
 *
 * @returns True if analytics should be initialized
 */
export function shouldInitializeAnalytics(): boolean {
  // Native platforms use config files, not env vars - always initialize
  // The native Firebase SDK will handle missing config gracefully
  if (Platform.OS !== 'web') {
    return true;
  }

  // Web requires explicit configuration via environment variables
  const measurementId = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
  return Boolean(measurementId && measurementId.length > 0);
}

/**
 * Checks if the app is running in debug mode.
 *
 * In debug mode, analytics events are logged to console
 * and GA4 DebugView is enabled.
 *
 * @returns True if in debug mode
 */
export function isDebugMode(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true';
}

/**
 * Gets the current environment for analytics tagging.
 *
 * @returns The environment name
 */
export function getAnalyticsEnvironment(): string {
  if (__DEV__) return 'development';
  return process.env.EXPO_PUBLIC_APP_ENV || 'production';
}
