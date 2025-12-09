/**
 * Unified Firebase Analytics module for Sobriety Waypoint.
 *
 * This is the ONLY module that app code should import for analytics.
 * Metro automatically selects the correct platform implementation:
 * - platform.web.ts for web
 * - platform.native.ts for iOS/Android
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

// Platform-specific implementation - Metro resolves to correct file
import {
  initializePlatformAnalytics,
  trackEventPlatform,
  setUserIdPlatform,
  setUserPropertiesPlatform,
  trackScreenViewPlatform,
  resetAnalyticsPlatform,
} from './platform';

// Re-export types and constants for convenience
export { AnalyticsEvents, type AnalyticsEventName } from '@/types/analytics';
export { calculateDaysSoberBucket } from '@/lib/analytics-utils';

// =============================================================================
// Module State
// =============================================================================
/**
 * Guard flag to prevent multiple initialization attempts at the index level.
 * This provides defense-in-depth against hot reload and React Strict Mode double-invocations.
 */
let isInitialized = false;

/**
 * Initialize Firebase Analytics for the app.
 *
 * Call this once at app startup, before any other analytics calls.
 * On native platforms, Firebase is configured via config files.
 * On web, it uses environment variables.
 *
 * @example
 * ```ts
 * // In app/_layout.tsx
 * import { initializeAnalytics } from '@/lib/analytics';
 * initializeAnalytics();
 * ```
 */
export async function initializeAnalytics(): Promise<void> {
  // Defense-in-depth: prevent re-initialization at the public API level
  if (isInitialized) {
    if (isDebugMode()) {
      logger.debug('Analytics already initialized, skipping', {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  if (!shouldInitializeAnalytics()) {
    if (isDebugMode()) {
      logger.warn('Firebase not configured - analytics disabled', {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  // Mark as initialized before async operations to prevent race conditions
  isInitialized = true;

  // On native, Firebase reads config from GoogleService-Info.plist / google-services.json
  // On web, we need explicit configuration via environment variables
  const config: AnalyticsConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  };

  // Only warn about missing config on web - native uses config files, not env vars
  if (Platform.OS === 'web' && (!config.apiKey || !config.projectId || !config.appId)) {
    logger.warn('Firebase config incomplete - some required values are missing', {
      category: LogCategory.ANALYTICS,
      hasApiKey: !!config.apiKey,
      hasProjectId: !!config.projectId,
      hasAppId: !!config.appId,
      hasMeasurementId: !!config.measurementId,
    });
  }

  await initializePlatformAnalytics(config);
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
  trackEventPlatform(eventName, sanitized);
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
  setUserIdPlatform(userId);
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
  setUserPropertiesPlatform(properties);
}

/**
 * Record a screen view for analytics.
 *
 * Typically invoked automatically by navigation tracking; call manually for non-standard or ephemeral screens.
 *
 * @param screenName - The logical name of the screen (e.g., "Home", "Settings")
 * @param screenClass - Optional class or category of the screen (e.g., "TabScreen")
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  trackScreenViewPlatform(screenName, screenClass);
}

/**
 * Resets analytics state for the current user.
 *
 * Clears the analytics user identifier and any user-specific analytics data.
 */
export async function resetAnalytics(): Promise<void> {
  await resetAnalyticsPlatform();
}
