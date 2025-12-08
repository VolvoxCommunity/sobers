/**
 * Unified Firebase Analytics module for Sobriety Waypoint.
 *
 * This is the ONLY module that app code should import for analytics.
 * It provides a platform-agnostic API that delegates to the appropriate
 * implementation (web or native) based on the current platform.
 *
 * @module lib/analytics
 *
 * @example
 * ```ts
 * import { trackEvent, setUserId, setUserProperties } from '@/lib/analytics';
 *
 * // Track an event
 * trackEvent('task_completed', { task_id: '123' });
 *
 * // Set user ID after login
 * setUserId(user.id);
 *
 * // Set user properties
 * setUserProperties({ days_sober_bucket: '31-90' });
 * ```
 */

import { Platform } from 'react-native';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { sanitizeParams, shouldInitializeAnalytics, isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

// Platform-specific imports
import {
  initializeWebAnalytics,
  trackEventWeb,
  setUserIdWeb,
  setUserPropertiesWeb,
  trackScreenViewWeb,
  resetAnalyticsWeb,
} from '@/lib/analytics.web';

import {
  initializeNativeAnalytics,
  trackEventNative,
  setUserIdNative,
  setUserPropertiesNative,
  trackScreenViewNative,
  resetAnalyticsNative,
} from '@/lib/analytics.native';

// Re-export types and constants for convenience
export { AnalyticsEvents, type AnalyticsEventName } from '@/types/analytics';
export { calculateDaysSoberBucket } from '@/lib/analytics-utils';

const isWeb = Platform.OS === 'web';

/**
 * Initializes Firebase Analytics.
 *
 * Call this once at app startup, before any other analytics calls.
 * On native platforms, Firebase is configured via config files.
 * On web, it uses environment variables.
 *
 * @example
 * ```ts
 * // In app/_layout.tsx, at the top before React imports
 * import { initializeAnalytics } from '@/lib/analytics';
 * initializeAnalytics();
 * ```
 */
export async function initializeAnalytics(): Promise<void> {
  if (!shouldInitializeAnalytics()) {
    if (isDebugMode()) {
      logger.warn('Firebase not configured - analytics disabled', {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  if (isWeb) {
    const config: AnalyticsConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
    };
    await initializeWebAnalytics(config);
  } else {
    await initializeNativeAnalytics();
  }
}

/**
 * Tracks an analytics event.
 *
 * Event parameters are automatically sanitized to remove PII fields.
 *
 * @param eventName - The name of the event (use AnalyticsEvents constants)
 * @param params - Optional event parameters
 *
 * @example
 * ```ts
 * import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
 *
 * trackEvent(AnalyticsEvents.TASK_COMPLETED, {
 *   task_id: '123',
 *   days_to_complete: 3,
 * });
 * ```
 */
export function trackEvent(eventName: string, params?: EventParams): void {
  const sanitized = sanitizeParams(params);

  if (isWeb) {
    trackEventWeb(eventName, sanitized);
  } else {
    // Fire and forget for native - don't await
    trackEventNative(eventName, sanitized);
  }
}

/**
 * Sets the user ID for analytics.
 *
 * Call this when a user signs in. The user ID should be the
 * Supabase user ID (UUID), which is pseudonymous.
 *
 * @param userId - The user ID or null to clear
 *
 * @example
 * ```ts
 * // After sign in
 * setUserId(user.id);
 *
 * // After sign out
 * setUserId(null);
 * ```
 */
export function setUserId(userId: string | null): void {
  if (isWeb) {
    setUserIdWeb(userId);
  } else {
    setUserIdNative(userId);
  }
}

/**
 * Sets user properties for analytics.
 *
 * User properties persist across sessions and are attached to all events.
 * Only set properties that have values - undefined properties are ignored.
 *
 * @param properties - The user properties to set
 *
 * @example
 * ```ts
 * setUserProperties({
 *   days_sober_bucket: '31-90',
 *   has_sponsor: true,
 *   theme_preference: 'dark',
 * });
 * ```
 */
export function setUserProperties(properties: UserProperties): void {
  if (isWeb) {
    setUserPropertiesWeb(properties);
  } else {
    setUserPropertiesNative(properties);
  }
}

/**
 * Tracks a screen view event.
 *
 * This is typically called automatically by navigation tracking,
 * but can be called manually for non-standard screens.
 *
 * @param screenName - The name of the screen
 * @param screenClass - Optional screen class name
 *
 * @example
 * ```ts
 * trackScreenView('HomeScreen', 'TabScreen');
 * ```
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  if (isWeb) {
    trackScreenViewWeb(screenName, screenClass);
  } else {
    trackScreenViewNative(screenName, screenClass);
  }
}

/**
 * Resets analytics for logout.
 *
 * Clears the user ID and any user-specific analytics data.
 * Call this when a user signs out.
 *
 * @example
 * ```ts
 * // In sign out handler
 * await resetAnalytics();
 * ```
 */
export async function resetAnalytics(): Promise<void> {
  if (isWeb) {
    await resetAnalyticsWeb();
  } else {
    await resetAnalyticsNative();
  }
}
