/**
 * Analytics implementation for web platform.
 *
 * This file is automatically selected by Metro bundler on web.
 * Supports both Firebase Analytics and Vercel Analytics with centralized event dispatching.
 *
 * @module lib/analytics/platform.web
 *
 * @todo PRODUCT DECISION REQUIRED: Determine analytics strategy:
 *   - Option 1: Use Firebase Analytics only (current default)
 *   - Option 2: Use Vercel Analytics only (for Vercel-hosted deployments)
 *   - Option 3: Use both Firebase and Vercel (requires deduplication logic)
 *   Configure via EXPO_PUBLIC_ANALYTICS_PROVIDER: 'firebase' | 'vercel' | 'both' | 'none'
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
/**
 * Analytics provider configuration.
 */
type AnalyticsProvider = 'firebase' | 'vercel' | 'both' | 'none';

/**
 * Vercel Analytics API (if available).
 */
interface VercelAnalytics {
  track: (eventName: string, properties?: Record<string, unknown>) => void;
}

// =============================================================================
// Constants
// =============================================================================
/**
 * Analytics provider configuration from environment.
 * Defaults to 'firebase' for backward compatibility.
 */
const ANALYTICS_PROVIDER: AnalyticsProvider =
  (process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProvider) || 'firebase';

/**
 * Whether Firebase Analytics is enabled.
 */
const IS_FIREBASE_ENABLED: boolean =
  ANALYTICS_PROVIDER === 'firebase' || ANALYTICS_PROVIDER === 'both';

/**
 * Whether Vercel Analytics is enabled.
 */
const IS_VERCEL_ENABLED: boolean = ANALYTICS_PROVIDER === 'vercel' || ANALYTICS_PROVIDER === 'both';

// =============================================================================
// Module State
// =============================================================================
let analytics: Analytics | null = null;
let app: FirebaseApp | null = null;
let vercelAnalytics: VercelAnalytics | null = null;

/**
 * Guard flag to prevent multiple initialization attempts.
 * This prevents duplicate Firebase connections during hot reload or React Strict Mode.
 */
let isInitialized = false;

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

/**
 * Reserved logger keys that should not be overwritten by user params.
 * These keys are used internally by the logger for error information.
 */
const RESERVED_LOGGER_KEYS = ['error_message', 'error_stack', 'error_name'] as const;

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
 * Sanitizes event params for safe logging by:
 * 1. Removing reserved logger keys to prevent overwrites
 * 2. Redacting PII-prone keys to prevent data leaks
 * 3. Returning a sanitized object suitable for nested logging
 *
 * @param params - The original event params to sanitize
 * @returns Sanitized params object with PII redacted and reserved keys removed
 */
function sanitizeParamsForLogging(params?: EventParams): Record<string, unknown> {
  if (!params) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    // Skip reserved logger keys to prevent overwrites
    if (RESERVED_LOGGER_KEYS.includes(key as (typeof RESERVED_LOGGER_KEYS)[number])) {
      continue;
    }

    // Redact PII-prone keys
    if (PII_KEYS.includes(key.toLowerCase() as (typeof PII_KEYS)[number])) {
      sanitized[key] = '[Filtered]';
      continue;
    }

    // For nested objects, recursively sanitize
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeParamsForLogging(value as EventParams);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
/**
 * Initializes Vercel Analytics if enabled and available.
 *
 * @returns Promise that resolves when initialization is complete
 */
async function initializeVercelAnalytics(): Promise<void> {
  if (!IS_VERCEL_ENABLED) {
    return;
  }

  try {
    // Dynamic import to avoid build errors if @vercel/analytics is not installed
    // TypeScript will error here if the package isn't installed, but that's expected
    // The try-catch handles the runtime case where the package doesn't exist
    // @ts-ignore - @vercel/analytics is optional and may not be installed
    // eslint-disable-next-line import/no-unresolved
    const vercelModule = await import('@vercel/analytics');
    // @ts-ignore - Dynamic import type is unknown
    const track = vercelModule.track as (
      eventName: string,
      properties?: Record<string, unknown>
    ) => void;
    vercelAnalytics = { track };

    if (isDebugMode()) {
      logger.info('Vercel Analytics initialized for web', {
        category: LogCategory.ANALYTICS,
      });
    }
  } catch (error) {
    // @vercel/analytics not installed or failed to load - log warning but don't fail
    if (isDebugMode()) {
      logger.warn('Vercel Analytics not available (package may not be installed)', {
        category: LogCategory.ANALYTICS,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    vercelAnalytics = null;
  }
}

/**
 * Centralized event dispatcher that sends events to configured providers.
 * Prevents duplicate events when multiple providers are enabled.
 *
 * @param eventName - The name of the event
 * @param params - Optional event parameters
 */
function dispatchEvent(eventName: string, params?: EventParams): void {
  // Send to Firebase if enabled
  if (IS_FIREBASE_ENABLED && analytics) {
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

  // Send to Vercel if enabled
  if (IS_VERCEL_ENABLED && vercelAnalytics) {
    try {
      vercelAnalytics.track(eventName, params as Record<string, unknown>);
    } catch (error) {
      logger.error(
        `Failed to track event ${eventName} in Vercel Analytics`,
        error instanceof Error ? error : new Error(String(error)),
        { category: LogCategory.ANALYTICS }
      );
    }
  }
}

// =============================================================================
// Main Logic
// =============================================================================
/**
 * Initialize configured analytics providers for the web platform.
 *
 * This function is idempotent: once initialized, subsequent calls are no-ops.
 * If Firebase analytics is enabled, `config` must contain the Firebase app settings.
 *
 * @param config - Firebase configuration required when Firebase analytics is enabled.
 *   If Firebase is enabled but config is missing or invalid (empty apiKey, projectId, or appId),
 *   Firebase initialization will fail silently and be logged. Subsequent analytics calls
 *   will be no-ops until the next successful initialization (requires page reload or
 *   calling `__resetForTesting()` in tests).
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  // Guard against multiple initialization attempts (hot reload, React Strict Mode, etc.)
  if (isInitialized) {
    if (isDebugMode()) {
      logger.debug('Analytics already initialized, skipping re-initialization', {
        category: LogCategory.ANALYTICS,
      });
    }
    return;
  }

  // Mark as initialized immediately to prevent race conditions
  isInitialized = true;

  // Initialize Firebase if enabled
  if (IS_FIREBASE_ENABLED) {
    try {
      const supported = await isSupported();
      if (!supported) {
        if (isDebugMode()) {
          logger.warn('Firebase Analytics not supported in this browser', {
            category: LogCategory.ANALYTICS,
          });
        }
      } else {
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
      }
    } catch (error) {
      // Reset flag to allow retry on critical failures
      isInitialized = false;
      logger.error(
        'Failed to initialize Firebase Analytics',
        error instanceof Error ? error : new Error(String(error)),
        { category: LogCategory.ANALYTICS }
      );
      return;
    }
  }

  // Initialize Vercel Analytics if enabled
  await initializeVercelAnalytics();

  if (isDebugMode()) {
    logger.info('Analytics initialization complete', {
      category: LogCategory.ANALYTICS,
      provider: ANALYTICS_PROVIDER,
      firebaseEnabled: IS_FIREBASE_ENABLED && analytics !== null,
      vercelEnabled: IS_VERCEL_ENABLED && vercelAnalytics !== null,
    });
  }
}

/**
 * Tracks an analytics event.
 *
 * Events are dispatched to all enabled analytics providers (Firebase, Vercel, or both).
 * Uses centralized dispatcher to prevent duplicate events.
 *
 * @param eventName - The name of the event
 * @param params - Optional event parameters
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  // Check if any provider is initialized
  const hasProvider = (IS_FIREBASE_ENABLED && analytics) || (IS_VERCEL_ENABLED && vercelAnalytics);

  if (!hasProvider) {
    if (isDebugMode()) {
      const sanitizedParams = sanitizeParamsForLogging(params);
      logger.debug(`Event (not sent - no provider initialized): ${eventName}`, {
        category: LogCategory.ANALYTICS,
        provider: ANALYTICS_PROVIDER,
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
 * Sets the user ID for analytics.
 *
 * Note: Vercel Analytics does not support user ID setting.
 * Only Firebase Analytics will receive the user ID.
 *
 * @param userId - The user ID or null to clear
 */
export function setUserIdPlatform(userId: string | null): void {
  if (!IS_FIREBASE_ENABLED || !analytics) {
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
 * Sets user properties for analytics.
 *
 * Note: Vercel Analytics does not support user properties.
 * Only Firebase Analytics will receive the user properties.
 *
 * @param properties - The user properties to set
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  // Sanitize properties for safe logging (whitelist non-PII, avoid reserved keys)
  const sanitizedMetadata = sanitizeUserPropertiesForLogging(properties);

  if (!IS_FIREBASE_ENABLED || !analytics) {
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
 * Clears the Firebase Analytics user ID and user properties. No-op for Vercel Analytics because it does not expose a reset API.
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
 * Clears the internal initialization guard and removes stored Firebase and Vercel analytics instances so the module can be re-initialized in a test.
 *
 * @throws Will throw an Error if called when NODE_ENV is not 'test'.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
  analytics = null;
  app = null;
  vercelAnalytics = null;
}

// =============================================================================
// Exports
// =============================================================================
// All exports are defined above with their implementations
