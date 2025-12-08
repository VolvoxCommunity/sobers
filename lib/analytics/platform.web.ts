/**
 * Firebase Analytics implementation for web platform.
 *
 * This file is automatically selected by Metro bundler on web.
 *
 * @module lib/analytics/platform.web
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
  isSupported,
  Analytics,
} from 'firebase/analytics';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;

/**
 * Initialize Firebase Analytics for the current web platform when supported and no Firebase app exists.
 *
 * If analytics is not supported or a Firebase app is already initialized, the function exits without side effects.
 *
 * @param config - Configuration containing `apiKey`, `projectId`, `appId`, and `measurementId` used to initialize the Firebase app and analytics
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  try {
    const supported = await isSupported();
    if (!supported) {
      if (isDebugMode()) {
        logger.warn('Firebase Analytics not supported in this browser', {
          category: LogCategory.ANALYTICS,
        });
      }
      return;
    }

    if (getApps().length > 0) {
      if (isDebugMode()) {
        logger.info('Firebase app already initialized', { category: LogCategory.ANALYTICS });
      }
      return;
    }

    app = initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      appId: config.appId,
      measurementId: config.measurementId,
    });

    analytics = getAnalytics(app);

    if (isDebugMode()) {
      logger.info('Firebase Analytics initialized for web', { category: LogCategory.ANALYTICS });
    }
  } catch (error) {
    logger.error(
      'Failed to initialize Firebase Analytics',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Record an analytics event with optional parameters.
 *
 * If analytics has not been initialized, the call is a no-op.
 *
 * @param eventName - The name of the event to record
 * @param params - Optional parameters to include with the event
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (!analytics) {
    if (isDebugMode()) {
      logger.debug(`Event (not sent - not initialized): ${eventName}`, {
        category: LogCategory.ANALYTICS,
        ...params,
      });
    }
    return;
  }

  if (isDebugMode()) {
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  logEvent(analytics, eventName, params);
}

/**
 * Set the analytics user identifier used for subsequent events.
 *
 * If analytics is not initialized this function is a no-op. Passing `null` clears the currently set user id.
 *
 * @param userId - The user identifier to set, or `null` to clear it
 */
export function setUserIdPlatform(userId: string | null): void {
  if (!analytics) {
    if (isDebugMode()) {
      logger.debug(`setUserId (not sent - not initialized): ${userId}`, {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId}`, { category: LogCategory.ANALYTICS });
  }

  firebaseSetUserId(analytics, userId);
}

/**
 * Set user-level properties on the analytics instance.
 *
 * Applies the provided properties to the current analytics user. If the analytics
 * instance is not initialized, this function does nothing.
 *
 * @param properties - Key-value pairs of user properties; values must be strings or booleans
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  if (!analytics) {
    if (isDebugMode()) {
      logger.debug('setUserProperties (not sent - not initialized)', {
        category: LogCategory.ANALYTICS,
        ...properties,
      });
    }
    return;
  }

  if (isDebugMode()) {
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
  }

  firebaseSetUserProperties(analytics, properties as Record<string, string | boolean>);
}

/**
 * Record a screen view as a `screen_view` analytics event.
 *
 * @param screenName - The name of the screen being viewed
 * @param screenClass - Optional screen class or identifier; when omitted, `screenName` is used
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Reset analytics state for the current session, clearing the analytics user identifier.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  setUserIdPlatform(null);
}