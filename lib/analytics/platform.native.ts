/**
 * Firebase Analytics implementation for native platforms (iOS/Android).
 *
 * This file is automatically selected by Metro bundler on iOS and Android.
 * Uses the modular API introduced in React Native Firebase v22.
 *
 * @module lib/analytics/platform.native
 * @see {@link https://rnfirebase.io/migrating-to-v22 Migration Guide}
 */

import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  resetAnalyticsData,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

// Get the analytics instance once for reuse
const analyticsInstance = getAnalytics();

/**
 * Initializes Firebase Analytics for native platforms.
 *
 * On native, Firebase is configured via GoogleService-Info.plist (iOS)
 * and google-services.json (Android), so minimal setup is needed here.
 * The config parameter is ignored on native.
 */
export async function initializePlatformAnalytics(_config?: AnalyticsConfig): Promise<void> {
  try {
    if (isDebugMode()) {
      await setAnalyticsCollectionEnabled(analyticsInstance, true);
      logger.info('Firebase Analytics initialized for native', {
        category: LogCategory.ANALYTICS,
      });
    }
  } catch (error) {
    logger.error(
      'Failed to initialize native analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Tracks an analytics event.
 *
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (isDebugMode()) {
    const { error_message, error_stack, error_name, ...safeParams } = params || {};
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...safeParams });
  }

  logEvent(analyticsInstance, eventName, params).catch((error: unknown) => {
    logger.error(
      `Failed to track event ${eventName}`,
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  });
}

/**
 * Computes a simple deterministic hash of a string for privacy-safe logging.
 *
 * Uses a djb2-style hash algorithm that's fast and deterministic.
 * This is suitable for logging purposes (not cryptographic security).
 *
 * @param input - The string to hash
 * @returns The hex-encoded hash, or null if input is null/undefined
 *
 * @example
 * ```ts
 * const hash = hashUserIdForLogging('user-123');
 * // Returns: 'a1b2c3d4...' (deterministic hash)
 * ```
 */
function hashUserIdForLogging(input: string | null): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  // Simple djb2-style hash for deterministic, one-way hashing
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) + hash + input.charCodeAt(i);
    hash = hash | 0; // Convert to 32-bit integer
  }

  // Convert to positive hex string (16 chars for 32-bit hash)
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return hashHex;
}

/**
 * Sets the user ID for analytics.
 *
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    const hashed = hashUserIdForLogging(userId);
    if (hashed === null) {
      logger.debug('setUserId: null', { category: LogCategory.ANALYTICS });
    } else {
      logger.debug(`setUserId: <hashed: ${hashed}>`, { category: LogCategory.ANALYTICS });
    }
  }

  setUserId(analyticsInstance, userId).catch((error: unknown) => {
    logger.error(
      'Failed to set user ID',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  });
}

/**
 * Sanitizes user properties for safe logging by redacting sensitive values.
 *
 * @param properties - User properties to sanitize
 * @returns Sanitized properties with sensitive values replaced with "<redacted>"
 */
function sanitizeUserPropertiesForLogging(
  properties: UserProperties
): Record<string, string | null> {
  const sensitiveKeys = new Set([
    'email',
    'name',
    'phone',
    'phone_number',
    'display_name',
    'full_name',
    'first_name',
    'last_name',
    'user_name',
    'username',
  ]);

  const sanitized: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '<redacted>';
    } else if (value === null) {
      sanitized[key] = null;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value ? 'true' : 'false';
    } else {
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}

/**
 * Sets user properties for analytics.
 *
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 *
 * Firebase requires user properties to be string or null. Boolean values are
 * converted to strings ('true'/'false') to preserve semantic meaning.
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  if (isDebugMode()) {
    const sanitized = sanitizeUserPropertiesForLogging(properties);
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...sanitized });
  }

  // Convert boolean values to strings for Firebase compatibility
  const normalized: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    if (value === null) {
      normalized[key] = null;
    } else if (typeof value === 'boolean') {
      normalized[key] = value ? 'true' : 'false';
    } else {
      normalized[key] = String(value);
    }
  }

  setUserProperties(analyticsInstance, normalized).catch((error: unknown) => {
    logger.error(
      'Failed to set user properties',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  });
}

/**
 * Tracks a screen view event.
 *
 * Uses logEvent with 'screen_view' instead of the dedicated logScreenView function
 * to avoid deprecation warnings in React Native Firebase v22+.
 *
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  if (isDebugMode()) {
    logger.debug(`Screen view: ${screenName}`, { category: LogCategory.ANALYTICS });
  }

  // Use logEvent with 'screen_view' instead of the deprecated logScreenView function
  // Type assertion needed because Firebase typings have strict overloads
  (
    logEvent as (
      analytics: typeof analyticsInstance,
      event: string,
      params?: Record<string, unknown>
    ) => Promise<void>
  )(analyticsInstance, 'screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  }).catch((error: unknown) => {
    logger.error(
      'Failed to track screen view',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  });
}

/**
 * Resets analytics for logout.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  try {
    if (isDebugMode()) {
      logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
    }

    await resetAnalyticsData(analyticsInstance);
  } catch (error) {
    logger.error(
      'Failed to reset analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}
