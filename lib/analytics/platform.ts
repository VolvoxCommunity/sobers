/**
 * Fallback analytics implementation for unknown platforms.
 *
 * This file provides type information for TypeScript and serves as a
 * fallback for platforms where neither .web.ts nor .native.ts applies.
 * At runtime on web/iOS/Android, Metro loads the appropriate platform file.
 *
 * @module lib/analytics/platform
 */

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { logger, LogCategory } from '@/lib/logger';

/**
 * Logs a warning that the fallback analytics implementation is active on unsupported platforms.
 *
 * @param _config - Optional analytics configuration; ignored by the fallback implementation
 */
export async function initializePlatformAnalytics(_config?: AnalyticsConfig): Promise<void> {
  logger.warn('Analytics: Using fallback implementation (platform not supported)', {
    category: LogCategory.ANALYTICS,
  });
}

/**
 * Fallback implementation that ignores analytics events on unsupported platforms.
 *
 * @param _eventName - The event name to track; ignored by this fallback.
 * @param _params - Optional event parameters; ignored by this fallback.
 */
export function trackEventPlatform(_eventName: string, _params?: EventParams): void {
  // No-op on unsupported platforms
}

/**
 * Fallback implementation that accepts a user identifier but does nothing on unsupported platforms.
 *
 * @param _userId - The user identifier to set; ignored by this fallback implementation
 */
export function setUserIdPlatform(_userId: string | null): void {
  // No-op on unsupported platforms
}

/**
 * Stores user properties for the current user; in this fallback implementation the call has no effect.
 *
 * @param _properties - Key-value map of user attributes to associate with the current user
 */
export function setUserPropertiesPlatform(_properties: UserProperties): void {
  // No-op on unsupported platforms
}

/**
 * Fallback implementation for tracking a screen view on unsupported platforms; performs no action.
 */
export function trackScreenViewPlatform(_screenName: string, _screenClass?: string): void {
  // No-op on unsupported platforms
}

/**
 * Resets any platform-specific analytics state; on unsupported platforms this is a no-op.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  // No-op on unsupported platforms
}
