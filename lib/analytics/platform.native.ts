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
 * Initialize Firebase Analytics for native platforms.
 *
 * On iOS and Android the native Firebase configuration files are used; the
 * optional `config` argument is ignored by the native implementation.
 *
 * @param _config - Optional analytics configuration; ignored on native platforms
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
 * Log an analytics event with the specified name and optional parameters.
 *
 * @param eventName - The analytics event name to record
 * @param params - Optional event parameters as key/value pairs to include with the event
 */
export async function trackEventPlatform(eventName: string, params?: EventParams): Promise<void> {
  try {
    if (isDebugMode()) {
      logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
    }

    await analytics().logEvent(eventName, params);
  } catch (error) {
    logger.error(
      `Failed to track event ${eventName}`,
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Set the analytics user identifier for the current user.
 *
 * @param userId - The user ID to set, or `null` to clear the currently set user ID.
 */
export async function setUserIdPlatform(userId: string | null): Promise<void> {
  try {
    if (isDebugMode()) {
      logger.debug(`setUserId: ${userId}`, { category: LogCategory.ANALYTICS });
    }

    await analytics().setUserId(userId);
  } catch (error) {
    logger.error(
      'Failed to set user ID',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Set multiple user properties for analytics reporting.
 *
 * @param properties - Object mapping property names to string values; use `null` to clear a property
 */
export async function setUserPropertiesPlatform(properties: UserProperties): Promise<void> {
  try {
    if (isDebugMode()) {
      logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
    }

    await analytics().setUserProperties(properties as Record<string, string | null>);
  } catch (error) {
    logger.error(
      'Failed to set user properties',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Record a screen view in the native analytics backend.
 *
 * @param screenName - The displayed name of the screen to record
 * @param screenClass - Optional screen class or identifier; defaults to `screenName` when omitted
 */
export async function trackScreenViewPlatform(
  screenName: string,
  screenClass?: string
): Promise<void> {
  try {
    if (isDebugMode()) {
      logger.debug(`Screen view: ${screenName}`, { category: LogCategory.ANALYTICS });
    }

    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    logger.error(
      'Failed to track screen view',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Clear analytics state and stored analytics data (commonly used on user logout).
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