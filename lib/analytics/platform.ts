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
 * Initializes Firebase Analytics (fallback - no-op).
 */
export async function initializePlatformAnalytics(_config?: AnalyticsConfig): Promise<void> {
  logger.warn('Analytics: Using fallback implementation (platform not supported)', {
    category: LogCategory.ANALYTICS,
  });
}

/**
 * Tracks an analytics event (fallback - no-op).
 */
export function trackEventPlatform(_eventName: string, _params?: EventParams): void {
  // No-op on unsupported platforms
}

/**
 * Sets the user ID (fallback - no-op).
 */
export function setUserIdPlatform(_userId: string | null): void {
  // No-op on unsupported platforms
}

/**
 * Sets user properties (fallback - no-op).
 */
export function setUserPropertiesPlatform(_properties: UserProperties): void {
  // No-op on unsupported platforms
}

/**
 * Tracks a screen view (fallback - no-op).
 */
export function trackScreenViewPlatform(_screenName: string, _screenClass?: string): void {
  // No-op on unsupported platforms
}

/**
 * Resets analytics (fallback - no-op).
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  // No-op on unsupported platforms
}
