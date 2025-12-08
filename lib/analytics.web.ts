/**
 * Firebase Analytics implementation for web platform.
 *
 * This module uses the Firebase JS SDK to track analytics events
 * in web browsers. It should only be imported on web platform.
 *
 * @module lib/analytics.web
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
 * Initializes Firebase Analytics for web.
 *
 * @param config - Firebase configuration from environment variables
 */
export async function initializeWebAnalytics(config: AnalyticsConfig): Promise<void> {
  try {
    // Check if analytics is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      if (isDebugMode()) {
        logger.warn('Firebase Analytics not supported in this browser', {
          category: LogCategory.ANALYTICS,
        });
      }
      return;
    }

    // Don't reinitialize if already set up
    if (getApps().length > 0) {
      if (isDebugMode()) {
        logger.info('Firebase app already initialized', { category: LogCategory.ANALYTICS });
      }
      return;
    }

    // Initialize Firebase app
    app = initializeApp({
      apiKey: config.apiKey,
      projectId: config.projectId,
      appId: config.appId,
      measurementId: config.measurementId,
    });

    // Initialize Analytics
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
 * Tracks an analytics event on web.
 *
 * @param eventName - The name of the event
 * @param params - Optional event parameters
 */
export function trackEventWeb(eventName: string, params?: EventParams): void {
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
 * Sets the user ID for analytics.
 *
 * @param userId - The user ID or null to clear
 */
export function setUserIdWeb(userId: string | null): void {
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
 * Sets user properties for analytics.
 *
 * @param properties - The user properties to set
 */
export function setUserPropertiesWeb(properties: UserProperties): void {
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

  // Firebase expects CustomParams type which requires index signature
  firebaseSetUserProperties(analytics, properties as Record<string, string | boolean>);
}

/**
 * Tracks a screen view event on web.
 *
 * @param screenName - The name of the screen
 * @param screenClass - Optional screen class name
 */
export function trackScreenViewWeb(screenName: string, screenClass?: string): void {
  trackEventWeb('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Resets analytics for logout.
 * Clears user ID and any user-specific data.
 */
export async function resetAnalyticsWeb(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  setUserIdWeb(null);
}
