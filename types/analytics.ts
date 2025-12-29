// types/analytics.ts
/**
 * Amplitude Analytics type definitions for Sobers.
 *
 * These types define the contract for analytics events and user properties
 * tracked across all platforms (iOS, Android, web).
 *
 * @module types/analytics
 */

/**
 * Allowed values for event parameters.
 * Amplitude supports strings, numbers, booleans, and arrays.
 */
export type EventParamValue = string | number | boolean | string[] | undefined;

/**
 * Generic event parameters object.
 * All custom event parameters must use this interface.
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
 * Bucketed ranges for steps completed count.
 */
export type StepsCompletedBucket = '0' | '1-3' | '4-6' | '7-9' | '10-12';

/**
 * User properties tracked in Amplitude Analytics.
 * These are set once and persist across sessions until changed.
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
  /** Whether user completed onboarding */
  onboarding_completed?: boolean;
  /** Current task streak count */
  task_streak_current?: number;
  /** Bucketed 12-step progress */
  steps_completed_count?: StepsCompletedBucket;
  /** Whether user has set a savings goal */
  savings_goal_set?: boolean;
}

/**
 * Amplitude configuration.
 * Uses a single API key for all platforms.
 */
export interface AnalyticsConfig {
  apiKey: string;
}

/**
 * Analytics event names used throughout the app.
 * Using Title Case per Amplitude conventions for better dashboard rendering.
 */
export const AnalyticsEvents = {
  // Authentication
  AUTH_SIGN_UP: 'Auth Sign Up',
  AUTH_LOGIN: 'Auth Login',
  AUTH_LOGOUT: 'Auth Logout',

  // Onboarding
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_SOBRIETY_DATE_SET: 'Onboarding Sobriety Date Set',
  ONBOARDING_COMPLETED: 'Onboarding Completed',
  ONBOARDING_SCREEN_VIEWED: 'Onboarding Screen Viewed',
  ONBOARDING_FIELD_COMPLETED: 'Onboarding Field Completed',
  ONBOARDING_ABANDONED: 'Onboarding Abandoned',

  // Core Features
  SCREEN_VIEWED: 'Screen Viewed',
  TASK_VIEWED: 'Task Viewed',
  TASK_STARTED: 'Task Started',
  TASK_COMPLETED: 'Task Completed',
  TASK_CREATED: 'Task Created',
  TASK_SKIPPED: 'Task Skipped',
  TASK_STREAK_UPDATED: 'Task Streak Updated',

  // Steps (12-step)
  STEP_VIEWED: 'Step Viewed',
  STEP_STARTED: 'Step Started',
  STEP_PROGRESS_SAVED: 'Step Progress Saved',
  STEP_COMPLETED: 'Step Completed',

  // Milestones
  MILESTONE_REACHED: 'Milestone Reached',
  MILESTONE_SHARED: 'Milestone Shared',
  MILESTONE_CELEBRATED: 'Milestone Celebrated',

  // Social
  SPONSOR_CONNECTED: 'Sponsor Connected',
  SPONSOR_INVITE_SENT: 'Sponsor Invite Sent',
  SPONSOR_INVITE_ACCEPTED: 'Sponsor Invite Accepted',
  SPONSEE_ADDED: 'Sponsee Added',
  MESSAGE_SENT: 'Message Sent',
  MESSAGE_READ: 'Message Read',

  // Engagement
  APP_OPENED: 'App Opened',
  APP_BACKGROUNDED: 'App Backgrounded',
  APP_SESSION_STARTED: 'App Session Started',
  DAILY_CHECK_IN: 'Daily Check In',

  // Settings
  SETTINGS_CHANGED: 'Settings Changed',

  // Savings
  SAVINGS_GOAL_SET: 'Savings Goal Set',
  SAVINGS_UPDATED: 'Savings Updated',
} as const;

/**
 * Type for valid analytics event names.
 */
export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
