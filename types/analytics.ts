// types/analytics.ts
/**
 * Firebase Analytics type definitions for Sobers.
 *
 * These types define the contract for analytics events and user properties
 * tracked across all platforms (iOS, Android, web).
 *
 * @module types/analytics
 */

/**
 * Allowed values for event parameters.
 * Firebase Analytics supports strings, numbers, and booleans.
 */
export type EventParamValue = string | number | boolean | undefined;

/**
 * Generic event parameters object.
 * All custom event parameters must use this interface.
 *
 * @example
 * ```ts
 * const params: EventParams = {
 *   task_id: '123',
 *   days_to_complete: 3,
 *   is_first_task: true,
 * };
 * ```
 */
export interface EventParams {
  [key: string]: EventParamValue;
}

/**
 * Bucketed ranges for days sober.
 * We use buckets instead of exact values to protect user privacy.
 */
export type DaysSoberBucket = '0-7' | '8-30' | '31-90' | '91-180' | '181-365' | '365+';

/**
 * User properties tracked in Firebase Analytics.
 * These are set once and persist across sessions until changed.
 *
 * @remarks
 * All properties are optional - only set properties that have values.
 * Never include PII (email, name, exact dates) in user properties.
 */
export interface UserProperties {
  /** Bucketed sobriety duration for cohort analysis */
  days_sober_bucket?: DaysSoberBucket;
  /** Whether user has an active sponsor relationship */
  has_sponsor?: boolean;
  /** Whether user is sponsoring others */
  has_sponsees?: boolean;
  /** User's theme preference */
  theme_preference?: 'light' | 'dark' | 'system';
  /** Authentication method used */
  sign_in_method?: 'email' | 'google' | 'apple';
}

/**
 * Firebase web SDK configuration.
 * These values come from Firebase Console > Project Settings > Web App.
 */
export interface AnalyticsConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  measurementId: string;
}

/**
 * Analytics event names used throughout the app.
 * Using a const object ensures consistency and enables autocomplete.
 */
export const AnalyticsEvents = {
  // Authentication
  AUTH_SIGN_UP: 'auth_sign_up',
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_SOBRIETY_DATE_SET: 'onboarding_sobriety_date_set',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Core Features
  SCREEN_VIEW: 'screen_view',
  TASK_VIEWED: 'task_viewed',
  TASK_STARTED: 'task_started',
  TASK_COMPLETED: 'task_completed',
  STEP_VIEWED: 'step_viewed',

  // Milestones
  MILESTONE_REACHED: 'milestone_reached',
  MILESTONE_SHARED: 'milestone_shared',

  // Social
  SPONSOR_CONNECTED: 'sponsor_connected',
  SPONSOR_INVITE_SENT: 'sponsor_invite_sent',
  SPONSOR_INVITE_ACCEPTED: 'sponsor_invite_accepted',
  MESSAGE_SENT: 'message_sent',

  // Retention
  APP_OPENED: 'app_opened',
  DAILY_CHECK_IN: 'daily_check_in',
} as const;

/**
 * Type for valid analytics event names.
 */
export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
