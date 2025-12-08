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
 * Initializes Firebase Analytics for web.
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
 * Tracks an analytics event.
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
 * Sets the user ID for analytics.
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
 * Sets user properties for analytics.
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
 * Tracks a screen view event.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Resets analytics for logout.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  setUserIdPlatform(null);
}
