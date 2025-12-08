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
 * Sets the user ID for analytics.
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
 * Sets user properties for analytics.
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
 * Tracks a screen view event.
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
