// lib/analytics/platform.web.ts
/**
 * Amplitude Analytics implementation for web platform.
 *
 * This file is automatically selected by Metro bundler on web.
 *
 * @module lib/analytics/platform.web
 */

import * as amplitude from '@amplitude/analytics-browser';

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
 * Initialize Amplitude for the web platform using the provided analytics configuration.
 *
 * This is a no-op if analytics are already initialized. On success it marks the module as initialized.
 *
 * @param config - Analytics configuration; `config.apiKey` is used to initialize Amplitude.
 * @throws Error if Amplitude initialization fails.
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
      logLevel: isDebugMode() ? amplitude.Types.LogLevel.Warn : amplitude.Types.LogLevel.None,
    }).promise;

    isInitialized = true;

    if (isDebugMode()) {
      logger.info('Amplitude Analytics initialized for web', {
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
 * Sends an analytics event to Amplitude when the analytics system has been initialized.
 *
 * @param eventName - The event name to record
 * @param params - Optional event parameters/properties to attach to the event
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (isDebugMode()) {
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  if (!isInitialized) return;

  try {
    amplitude.track(eventName, params);
  } catch (error) {
    logger.error(
      'Failed to track event',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS, eventName }
    );
  }
}

/**
 * Set the current analytics user identifier.
 *
 * If `userId` is `null` the analytics user identifier is cleared. If the analytics
 * subsystem has not been initialized this function is a no-op; errors during the
 * underlying SDK call are caught and logged.
 *
 * @param userId - The user identifier to set, or `null` to clear the identifier
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId ? '<set>' : 'null'}`, { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  try {
    amplitude.setUserId(userId ?? undefined);
  } catch (error) {
    logger.error(
      'Failed to set user ID',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Update the current user's analytics properties, applying only keys with defined values.
 *
 * @param properties - Mapping of user property names to values; properties with value `undefined` are ignored.
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
 * Record a screen view event with an associated screen name and optional screen class.
 *
 * @param screenName - The name of the screen being viewed
 * @param screenClass - Optional screen class; when omitted, `screenName` is used
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform(AnalyticsEvents.SCREEN_VIEWED, {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Reset the Amplitude analytics client state for the web platform.
 *
 * If analytics has not been initialized this function does nothing. Errors thrown by the underlying client are caught and logged and are not rethrown.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  try {
    amplitude.reset();
  } catch (error) {
    logger.error(
      'Failed to reset analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Reset module initialization state for tests.
 *
 * @internal
 * @throws Error if called outside a test environment (NODE_ENV !== 'test')
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
}
