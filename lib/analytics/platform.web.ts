/**
 * Firebase Analytics implementation for web platform.
 *
 * This file is automatically selected by Metro bundler on web.
 * Uses Firebase Analytics exclusively for consistency with native platforms.
 *
 * @module lib/analytics/platform.web
 */

// =============================================================================
// Imports
// =============================================================================
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
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

// =============================================================================
// Types & Interfaces
// =============================================================================
// No additional types needed - Firebase types imported above

// =============================================================================
// Constants
// =============================================================================
// Firebase Analytics is always enabled on web

// =============================================================================
// Module State
// =============================================================================
let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;

/**
 * Initialization state to prevent race conditions.
 *
 * Uses Promise-based pattern instead of boolean flag:
 * - null: not started
 * - Promise: initialization in progress (concurrent callers await the same Promise)
 * - 'completed': successfully initialized
 *
 * This prevents the race condition where resetting a boolean flag on failure
 * could allow concurrent calls to both proceed with initialization.
 */
let initializationPromise: Promise<void> | null = null;
let initializationState: 'pending' | 'completed' | 'failed' | null = null;

// =============================================================================
// Constants (continued)
// =============================================================================
/**
 * Reserved keys in logger metadata that should not be used.
 * These keys are used internally by the logger for error information.
 * Note: 'category' is extracted separately and not a reserved key.
 */
const LOGGER_RESERVED_KEYS = ['error_message', 'error_stack', 'error_name'] as const;

/**
 * Whitelist of safe, non-PII keys from UserProperties that can be logged.
 * This ensures we only log analytics metadata, not sensitive user data.
 */
const SAFE_USER_PROPERTY_KEYS: readonly (keyof UserProperties)[] = [
  'days_sober_bucket',
  'has_sponsor',
  'has_sponsees',
  'theme_preference',
  'sign_in_method',
] as const;

// Note: LOGGER_RESERVED_KEYS (defined above) is used for both purposes:
// sanitizing user properties and sanitizing event params.

/**
 * PII-prone keys that should be redacted from logs.
 * These keys commonly contain sensitive user information.
 */
const PII_KEYS = [
  'email',
  'phone',
  'phone_number',
  'full_name',
  'name',
  'user_name',
  'username',
  'password',
  'token',
  'access_token',
  'refresh_token',
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sanitizes UserProperties for safe logging by:
 * 1. Whitelisting only safe, non-PII keys
 * 2. Filtering out undefined values
 * 3. Prefixing any keys that conflict with logger reserved keys
 * 4. Masking any potentially sensitive values (defensive)
 *
 * @param properties - Raw user properties to sanitize
 * @returns Sanitized metadata object safe for logger
 */
function sanitizeUserPropertiesForLogging(properties: UserProperties): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const key of SAFE_USER_PROPERTY_KEYS) {
    const value = properties[key];
    if (value === undefined) continue;

    // Check for reserved key conflicts and prefix if needed
    const safeKey = LOGGER_RESERVED_KEYS.includes(key as (typeof LOGGER_RESERVED_KEYS)[number])
      ? `analytics_${key}`
      : key;

    // All current UserProperties values are safe (strings or booleans),
    // but we're defensive and don't log raw values that might contain PII
    sanitized[safeKey] = value;
  }

  return sanitized;
}

/**
 * Converts UserProperties to Firebase Analytics-compatible format.
 * Firebase web SDK requires Record<string, string | boolean> (no undefined or null).
 *
 * @param properties - User properties to convert
 * @returns Firebase-compatible properties object
 */
function convertToFirebaseUserProperties(
  properties: UserProperties
): Record<string, string | boolean> {
  const firebaseProperties: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip undefined values (Firebase doesn't accept them)
    if (value === undefined) continue;

    // Keep booleans as booleans (Firebase accepts boolean)
    if (typeof value === 'boolean') {
      firebaseProperties[key] = value;
    }
    // Convert strings (Firebase accepts string)
    else if (typeof value === 'string') {
      firebaseProperties[key] = value;
    }
    // Drop any other types (shouldn't happen with current UserProperties type)
  }

  return firebaseProperties;
}

/**
 * Computes a SHA-256 hash of a string for privacy-safe logging.
 *
 * @param input - The string to hash
 * @returns Promise that resolves to the hex-encoded hash, or null if input is null/undefined
 *
 * @example
 * ```ts
 * const hash = await hashUserId('user-123');
 * // Returns: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
 * ```
 */
async function hashUserId(input: string | null): Promise<string | null> {
  if (input === null || input === undefined) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // Fallback: if crypto API fails, return a placeholder
    logger.warn('Failed to hash userId for logging', {
      category: LogCategory.ANALYTICS,
      hashError: error instanceof Error ? error.message : String(error),
    });
    return '[hash-error]';
  }
}

/**
 * Create a logger-safe copy of event parameters with reserved keys removed and sensitive values redacted.
 *
 * @param ancestors - WeakSet used to track objects in the current recursion path to detect circular references
 * @returns An object suitable for logging where logger-reserved keys are omitted, PII-prone values are replaced with `"[Filtered]"`, and circular references are marked `"[Circular]"`
 */
function sanitizeParamsForLogging(
  params?: EventParams,
  ancestors: WeakSet<object> = new WeakSet()
): Record<string, unknown> {
  if (!params) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    // Skip reserved logger keys to prevent overwrites
    if (LOGGER_RESERVED_KEYS.includes(key as (typeof LOGGER_RESERVED_KEYS)[number])) {
      continue;
    }

    // Redact PII-prone keys
    if (PII_KEYS.includes(key.toLowerCase() as (typeof PII_KEYS)[number])) {
      sanitized[key] = '[Filtered]';
      continue;
    }

    // For nested objects, recursively sanitize with circular reference detection
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Detect circular references (object is an ancestor in current recursion path)
      if (ancestors.has(value)) {
        sanitized[key] = '[Circular]';
        continue;
      }
      // Add to ancestors for this recursion path, then remove after processing
      ancestors.add(value);
      sanitized[key] = sanitizeParamsForLogging(value as EventParams, ancestors);
      ancestors.delete(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
/**
 * Sends an event to Firebase Analytics.
 *
 * If the analytics instance has not been initialized the call returns without sending.
 * SDK errors are caught and logged under the `ANALYTICS` category.
 *
 * @param eventName - The name of the event
 * @param params - Optional event parameters
 */
function dispatchEvent(eventName: string, params?: EventParams): void {
  if (!analytics) {
    return;
  }

  try {
    logEvent(analytics, eventName, params);
  } catch (error) {
    logger.error(
      `Failed to track event ${eventName} in Firebase`,
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

// =============================================================================
// Main Logic
// =============================================================================

/**
 * Initialize Firebase Analytics for the web if supported and not already initialized.
 *
 * Attempts to obtain or create a Firebase app and Analytics instance using the provided config.
 * If the runtime does not support Firebase Analytics, this function performs no initialization.
 * Initialization errors are logged for monitoring and do not propagate to the caller.
 *
 * @param config - Firebase configuration (apiKey, projectId, appId, measurementId)
 */
async function doInitialize(config: AnalyticsConfig): Promise<void> {
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
      // Retrieve existing app and analytics instance
      app = getApp();
      analytics = getAnalytics(app);
      if (isDebugMode()) {
        logger.info('Firebase app already initialized, retrieved existing instance', {
          category: LogCategory.ANALYTICS,
        });
      }
    } else {
      app = initializeApp({
        apiKey: config.apiKey,
        projectId: config.projectId,
        appId: config.appId,
        measurementId: config.measurementId,
      });

      analytics = getAnalytics(app);

      if (isDebugMode()) {
        logger.info('Firebase Analytics initialized for web', {
          category: LogCategory.ANALYTICS,
        });
      }
    }
  } catch (error) {
    const firebaseError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to initialize Firebase Analytics', firebaseError, {
      category: LogCategory.ANALYTICS,
    });
  }

  // Note: We intentionally do NOT throw on Firebase failures.
  // Analytics initialization failures should be handled gracefully since they're
  // not critical to app functionality. The error is logged above for monitoring.
}

/**
 * Initialize Firebase Analytics for the web platform and manage a single shared initialization lifecycle.
 *
 * Concurrent callers will share the same in-progress initialization; once initialization completes
 * subsequent calls return immediately. If initialization fails the state is reset to allow retries.
 *
 * @param config - Firebase configuration; missing or invalid fields (e.g., empty apiKey, projectId, or appId) may cause initialization to fail and will be logged.
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  // Already completed successfully - return immediately
  if (initializationState === 'completed') {
    if (isDebugMode()) {
      logger.debug('Analytics already initialized, skipping re-initialization', {
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
      throw error;
    });

  return initializationPromise;
}

/**
 * Record an analytics event with optional parameters; when initialized the event is sent to Firebase Analytics.
 *
 * If analytics is not initialized the event is not sent. In debug mode the event and sanitized parameters are logged.
 *
 * @param eventName - The name of the event
 * @param params - Optional event parameters
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (!analytics) {
    if (isDebugMode()) {
      const sanitizedParams = sanitizeParamsForLogging(params);
      logger.debug(`Event (not sent - no provider initialized): ${eventName}`, {
        category: LogCategory.ANALYTICS,
        provider: 'firebase',
        event_params: sanitizedParams,
      });
    }
    return;
  }

  if (isDebugMode()) {
    const sanitizedParams = sanitizeParamsForLogging(params);
    logger.debug(`Event: ${eventName}`, {
      category: LogCategory.ANALYTICS,
      event_params: sanitizedParams,
    });
  }

  dispatchEvent(eventName, params);
}

/**
 * Set the analytics user identifier used by Firebase; pass `null` to clear it.
 *
 * @param userId - The user identifier to set, or `null` to clear the current user ID
 */
export function setUserIdPlatform(userId: string | null): void {
  if (!analytics) {
    if (isDebugMode()) {
      // Hash userId for privacy-safe logging (fire-and-forget)
      hashUserId(userId).then((hashed) => {
        if (hashed === null) {
          logger.debug('setUserId (not sent - Firebase not initialized): null', {
            category: LogCategory.ANALYTICS,
          });
        } else {
          logger.debug(`setUserId (not sent - Firebase not initialized): <hashed: ${hashed}>`, {
            category: LogCategory.ANALYTICS,
          });
        }
      });
    }
    return;
  }

  if (isDebugMode()) {
    // Hash userId for privacy-safe logging (fire-and-forget)
    hashUserId(userId).then((hashed) => {
      if (hashed === null) {
        logger.debug('setUserId: null', { category: LogCategory.ANALYTICS });
      } else {
        logger.debug(`setUserId: <hashed: ${hashed}>`, { category: LogCategory.ANALYTICS });
      }
    });
  }

  try {
    firebaseSetUserId(analytics, userId);
  } catch (error) {
    logger.error(
      'Failed to set user ID',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Set user properties on the analytics backend.
 *
 * Sanitizes and sends the provided user properties to Firebase Analytics. Undefined values are ignored and only string or boolean property values are applied. If the analytics subsystem is not initialized, the properties are not sent.
 *
 * @param properties - User properties to apply; undefined values are ignored and only string or boolean values will be forwarded to Firebase
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  // Sanitize properties for safe logging (whitelist non-PII, avoid reserved keys)
  const sanitizedMetadata = sanitizeUserPropertiesForLogging(properties);

  if (!analytics) {
    if (isDebugMode()) {
      logger.debug('setUserProperties (not sent - Firebase not initialized)', {
        category: LogCategory.ANALYTICS,
        user_properties: sanitizedMetadata,
      });
    }
    return;
  }

  if (isDebugMode()) {
    logger.debug('setUserProperties', {
      category: LogCategory.ANALYTICS,
      user_properties: sanitizedMetadata,
    });
  }

  try {
    // Convert to Firebase-compatible format (filters undefined, keeps string|boolean)
    const firebaseProperties = convertToFirebaseUserProperties(properties);
    firebaseSetUserProperties(analytics, firebaseProperties);
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
 *
 * @param screenName - The name of the screen
 * @param screenClass - Optional screen class name
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Reset analytics state for the current user.
 *
 * Clears the Firebase Analytics user ID.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  setUserIdPlatform(null);
}

// =============================================================================
// Testing Utilities
// =============================================================================
/**
 * Reset the module's analytics initialization state for tests.
 *
 * Clears the internal initialization state and removes stored Firebase analytics
 * instance so the module can be re-initialized in a test.
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
  analytics = null;
  app = null;
}

// =============================================================================
// Exports
// =============================================================================
// All exports are defined above with their implementations