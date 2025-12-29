// lib/analytics/platform.native.ts
/**
 * Amplitude Analytics implementation for native platforms (iOS/Android).
 *
 * This file is automatically selected by Metro bundler on iOS and Android.
 *
 * @module lib/analytics/platform.native
 */

import * as amplitude from '@amplitude/analytics-react-native';

import {
  AnalyticsEvents,
  type EventParams,
  type UserProperties,
  type AnalyticsConfig,
} from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

let isInitialized = false;

/**
 * Initializes Amplitude Analytics for native platforms.
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  if (isInitialized) {
    if (isDebugMode()) {
      logger.debug('Amplitude already initialized', { category: LogCategory.ANALYTICS });
    }
    return;
  }

  try {
    await amplitude.init(config.apiKey, undefined, {
      logLevel: isDebugMode() ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.None,
    });

    isInitialized = true;

    if (isDebugMode()) {
      logger.info('Amplitude Analytics initialized for native', {
        category: LogCategory.ANALYTICS,
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to initialize Amplitude', err, { category: LogCategory.ANALYTICS });
    throw err; // Rethrow so caller can handle and allow retry
  }
}

/**
 * Tracks an analytics event.
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (isDebugMode()) {
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  if (!isInitialized) return;

  amplitude.track(eventName, params);
}

/**
 * Sets the user ID for analytics.
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId ? '<set>' : 'null'}`, { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  amplitude.setUserId(userId ?? undefined);
}

/**
 * Sets user properties for analytics.
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  if (isDebugMode()) {
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
  }

  if (!isInitialized) return;

  try {
    const identify = new amplitude.Identify();
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        identify.set(key, value);
      }
    }
    amplitude.identify(identify);
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
 * @param screenName - The name of the screen being viewed
 * @param screenClass - Optional screen class. Defaults to screenName if not provided.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform(AnalyticsEvents.SCREEN_VIEWED, {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Resets analytics state.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  await amplitude.reset();
}

/**
 * Reset for testing.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
}
