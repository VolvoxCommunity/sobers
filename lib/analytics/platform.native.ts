/**
 * Firebase Analytics implementation for native platforms (iOS/Android).
 *
 * This file is automatically selected by Metro bundler on iOS and Android.
 *
 * @module lib/analytics/platform.native
 */

import analytics from '@react-native-firebase/analytics';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

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
      await analytics().setAnalyticsCollectionEnabled(true);
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
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  analytics()
    .logEvent(eventName, params)
    .catch((error: unknown) => {
      logger.error(
        `Failed to track event ${eventName}`,
        error instanceof Error ? error : new Error(String(error)),
        { category: LogCategory.ANALYTICS }
      );
    });
}

/**
 * Sets the user ID for analytics.
 *
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId}`, { category: LogCategory.ANALYTICS });
  }

  analytics()
    .setUserId(userId)
    .catch((error: unknown) => {
      logger.error(
        'Failed to set user ID',
        error instanceof Error ? error : new Error(String(error)),
        { category: LogCategory.ANALYTICS }
      );
    });
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
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
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

  analytics()
    .setUserProperties(normalized)
    .catch((error: unknown) => {
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
 * This function is synchronous (fire-and-forget) to match the public API in index.ts.
 * Errors are caught and logged but not propagated to avoid unhandled promise rejections.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  if (isDebugMode()) {
    logger.debug(`Screen view: ${screenName}`, { category: LogCategory.ANALYTICS });
  }

  analytics()
    .logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    })
    .catch((error: unknown) => {
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

    await analytics().resetAnalyticsData();
  } catch (error) {
    logger.error(
      'Failed to reset analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}
