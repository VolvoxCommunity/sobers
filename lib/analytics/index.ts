/**
 * Unified Firebase Analytics module for Sobers.
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
 * Initialization state to prevent race conditions at the public API level.
 *
 * Uses Promise-based pattern instead of boolean flag:
 * - null: not started
 * - Promise: initialization in progress (concurrent callers await the same Promise)
 * - 'completed': successfully initialized
 * - 'skipped': analytics disabled (no config)
 *
 * This prevents the race condition where resetting a boolean flag on failure
 * could allow concurrent calls to both proceed with initialization.
 */
let initializationPromise: Promise<void> | null = null;
let initializationState: 'pending' | 'completed' | 'skipped' | 'failed' | null = null;

/**
 * Internal initialization logic. Called by initializeAnalytics wrapper.
 *
 * @param config - Analytics configuration
 */
async function doInitialize(config: AnalyticsConfig): Promise<void> {
  await initializePlatformAnalytics(config);
}

/**
 * Initialize Firebase Analytics for the app.
 *
 * Call this once at app startup, before any other analytics calls.
 * On native platforms, Firebase is configured via config files.
 * On web, it uses environment variables.
 *
 * This function uses a Promise-based pattern to prevent race conditions:
 * - Concurrent calls during initialization will await the same Promise
 * - Once completed, subsequent calls return immediately
 * - On failure, retry is allowed (state is reset)
 *
 * @example
 * ```ts
 * // In app/_layout.tsx
 * import { initializeAnalytics } from '@/lib/analytics';
 * initializeAnalytics();
 * ```
 */
export async function initializeAnalytics(): Promise<void> {
  // Already completed or skipped - return immediately
  if (initializationState === 'completed' || initializationState === 'skipped') {
    if (isDebugMode()) {
      logger.debug(`Analytics already ${initializationState}, skipping`, {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  // Initialization in progress - wait for the existing Promise
  // This prevents race conditions from concurrent calls
  if (initializationPromise !== null && initializationState === 'pending') {
    if (isDebugMode()) {
      logger.debug('Analytics initialization in progress, waiting...', {
        category: LogCategory.ANALYTICS,
      });
    }
    return initializationPromise;
  }

  // Check if analytics should be initialized
  if (!shouldInitializeAnalytics()) {
    if (isDebugMode()) {
      logger.warn('Firebase not configured - analytics disabled', {
        category: LogCategory.ANALYTICS,
      });
    }
    initializationState = 'skipped';
    return;
  }

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

  // Start new initialization
  initializationState = 'pending';
  initializationPromise = doInitialize(config)
    .then(() => {
      initializationState = 'completed';
    })
    .catch((error) => {
      // Reset state to allow retry
      initializationState = 'failed';
      initializationPromise = null;
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize analytics platform', err, {
        category: LogCategory.ANALYTICS,
      });
      // Don't rethrow - analytics failures shouldn't crash the app
    });

  return initializationPromise;
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
 *
 * Note: This does NOT reset the analytics initialization state.
 * Analytics initialization persists after reset.
 */
export async function resetAnalytics(): Promise<void> {
  await resetAnalyticsPlatform();
}

// =============================================================================
// Testing Utilities
// =============================================================================
/**
 * Reset the module's analytics initialization state for tests.
 *
 * Clears the internal initialization state so the module can be re-initialized in a test.
 *
 * @throws Will throw an Error if called when NODE_ENV is not 'test'.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  initializationState = null;
  initializationPromise = null;
}
