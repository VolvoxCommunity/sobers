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
 * Initialize Amplitude analytics with the provided configuration for native platforms.
 *
 * If analytics have already been initialized this function is a no-op.
 *
 * @param config - Configuration containing the Amplitude `apiKey` used to initialize the SDK
 * @throws An `Error` if Amplitude initialization fails
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
      trackingSessionEvents: true,
      // Disable cookie storage - fixes "Cannot set property 'cookie' of undefined"
      // error on native platforms. The SDK will use AsyncStorage instead.
      disableCookies: true,
    }).promise;

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
 * Record an analytics event with optional parameters.
 *
 * If analytics has not been initialized this function is a no-op. Any runtime
 * errors encountered while sending the event are logged and not thrown.
 *
 * @param eventName - The name of the event to record
 * @param params - Optional key/value parameters to attach to the event
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
 * Set the analytics user identifier for the current session.
 *
 * @param userId - The user identifier to assign; pass `null` to clear the current user id
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
 * Apply a set of user properties to the current analytics user via Amplitude Identify.
 *
 * Properties with the value `undefined` are ignored. If analytics has not been initialized, this is a no-op. Errors are caught and logged and will not be thrown to the caller.
 *
 * @param properties - Key/value map of user properties to set; values other than `undefined` will be written to the analytics user profile
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
 * Reset analytics state for the native Amplitude integration.
 *
 * If analytics have not been initialized this function is a no-op. Any errors
 * encountered while resetting are logged and not rethrown.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  try {
    await amplitude.reset();
  } catch (error) {
    logger.error(
      'Failed to reset analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Reset the module's initialization state for test environments.
 *
 * Sets the internal initialized flag to `false`. This function is intended for use only during tests.
 *
 * @internal
 * @throws Error If called when NODE_ENV is not `'test'`.
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
}
