# Amplitude Analytics Migration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Firebase Analytics with Amplitude SDK, adopting Title Case event naming and adding 15 new events.

**Architecture:** Clean swap - remove all Firebase dependencies, replace with `@amplitude/analytics-react-native`. Same public API, different internal implementation.

**Tech Stack:** `@amplitude/analytics-react-native`, Expo Router, TypeScript

**Working Directory:** `/Users/billchirico/Developer/Volvox/sobers/.worktrees/feat-amplitude-analytics`

---

## Task 1: Update Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Remove Firebase dependencies**

```bash
pnpm remove @react-native-firebase/analytics @react-native-firebase/app firebase
```

**Step 2: Verify removal**

Run: `pnpm list | grep -i firebase`
Expected: No output (no Firebase packages)

**Step 3: Add Amplitude SDK**

```bash
pnpm add @amplitude/analytics-react-native
```

**Step 4: Verify installation**

Run: `pnpm list @amplitude/analytics-react-native`
Expected: Shows installed version

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(deps): replace Firebase Analytics with Amplitude SDK

- Remove @react-native-firebase/analytics
- Remove @react-native-firebase/app
- Remove firebase
- Add @amplitude/analytics-react-native
EOF
)"
```

---

## Task 2: Update Analytics Types

**Files:**

- Modify: `types/analytics.ts`
- Test: `__tests__/types/analytics.test.ts`

**Step 1: Update the types file**

Replace entire contents of `types/analytics.ts`:

```typescript
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
```

**Step 2: Update the types test file**

Replace entire contents of `__tests__/types/analytics.test.ts`:

```typescript
// __tests__/types/analytics.test.ts
import {
  AnalyticsEvents,
  type AnalyticsEventName,
  type EventParams,
  type UserProperties,
  type DaysSoberBucket,
  type StepsCompletedBucket,
  type AnalyticsConfig,
} from '@/types/analytics';

describe('types/analytics', () => {
  describe('AnalyticsEvents', () => {
    it('should have all required event constants', () => {
      // Auth events
      expect(AnalyticsEvents.AUTH_SIGN_UP).toBe('Auth Sign Up');
      expect(AnalyticsEvents.AUTH_LOGIN).toBe('Auth Login');
      expect(AnalyticsEvents.AUTH_LOGOUT).toBe('Auth Logout');

      // Onboarding events
      expect(AnalyticsEvents.ONBOARDING_STARTED).toBe('Onboarding Started');
      expect(AnalyticsEvents.ONBOARDING_COMPLETED).toBe('Onboarding Completed');
      expect(AnalyticsEvents.ONBOARDING_SCREEN_VIEWED).toBe('Onboarding Screen Viewed');
      expect(AnalyticsEvents.ONBOARDING_FIELD_COMPLETED).toBe('Onboarding Field Completed');
      expect(AnalyticsEvents.ONBOARDING_ABANDONED).toBe('Onboarding Abandoned');

      // Task events
      expect(AnalyticsEvents.TASK_COMPLETED).toBe('Task Completed');
      expect(AnalyticsEvents.TASK_CREATED).toBe('Task Created');
      expect(AnalyticsEvents.TASK_SKIPPED).toBe('Task Skipped');
      expect(AnalyticsEvents.TASK_STREAK_UPDATED).toBe('Task Streak Updated');

      // Step events
      expect(AnalyticsEvents.STEP_VIEWED).toBe('Step Viewed');
      expect(AnalyticsEvents.STEP_STARTED).toBe('Step Started');
      expect(AnalyticsEvents.STEP_PROGRESS_SAVED).toBe('Step Progress Saved');
      expect(AnalyticsEvents.STEP_COMPLETED).toBe('Step Completed');

      // Milestone events
      expect(AnalyticsEvents.MILESTONE_REACHED).toBe('Milestone Reached');
      expect(AnalyticsEvents.MILESTONE_CELEBRATED).toBe('Milestone Celebrated');

      // Social events
      expect(AnalyticsEvents.SPONSEE_ADDED).toBe('Sponsee Added');
      expect(AnalyticsEvents.MESSAGE_READ).toBe('Message Read');

      // Engagement events
      expect(AnalyticsEvents.APP_BACKGROUNDED).toBe('App Backgrounded');
      expect(AnalyticsEvents.APP_SESSION_STARTED).toBe('App Session Started');

      // Settings events
      expect(AnalyticsEvents.SETTINGS_CHANGED).toBe('Settings Changed');

      // Savings events
      expect(AnalyticsEvents.SAVINGS_GOAL_SET).toBe('Savings Goal Set');
      expect(AnalyticsEvents.SAVINGS_UPDATED).toBe('Savings Updated');
    });

    it('should use Title Case naming convention', () => {
      const eventValues = Object.values(AnalyticsEvents);
      eventValues.forEach((value) => {
        // Title Case: first letter of each word is uppercase
        const words = value.split(' ');
        words.forEach((word) => {
          expect(word[0]).toBe(word[0].toUpperCase());
        });
      });
    });

    it('should have exactly 35 events', () => {
      const eventCount = Object.keys(AnalyticsEvents).length;
      expect(eventCount).toBe(35);
    });
  });

  describe('Type definitions', () => {
    it('should allow valid EventParams', () => {
      const params: EventParams = {
        task_id: '123',
        count: 5,
        is_first: true,
        tags: ['tag1', 'tag2'],
      };
      expect(params).toBeDefined();
    });

    it('should allow valid UserProperties', () => {
      const props: UserProperties = {
        days_sober_bucket: '31-90',
        has_sponsor: true,
        has_sponsees: false,
        theme_preference: 'dark',
        sign_in_method: 'google',
        onboarding_completed: true,
        task_streak_current: 7,
        steps_completed_count: '4-6',
        savings_goal_set: true,
      };
      expect(props).toBeDefined();
    });

    it('should allow valid DaysSoberBucket values', () => {
      const buckets: DaysSoberBucket[] = ['0-7', '8-30', '31-90', '91-180', '181-365', '365+'];
      expect(buckets).toHaveLength(6);
    });

    it('should allow valid StepsCompletedBucket values', () => {
      const buckets: StepsCompletedBucket[] = ['0', '1-3', '4-6', '7-9', '10-12'];
      expect(buckets).toHaveLength(5);
    });

    it('should allow valid AnalyticsConfig', () => {
      const config: AnalyticsConfig = {
        apiKey: 'test-api-key',
      };
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should derive AnalyticsEventName from AnalyticsEvents values', () => {
      const eventName: AnalyticsEventName = 'Auth Sign Up';
      expect(eventName).toBe(AnalyticsEvents.AUTH_SIGN_UP);
    });
  });
});
```

**Step 3: Run tests to verify**

Run: `pnpm test -- __tests__/types/analytics.test.ts`
Expected: All tests pass

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors (may have errors in other files - that's expected, we'll fix them)

**Step 5: Commit**

```bash
git add types/analytics.ts __tests__/types/analytics.test.ts
git commit -m "$(cat <<'EOF'
feat(analytics): update types for Amplitude with Title Case events

- Change event values to Title Case (Amplitude convention)
- Add 15 new events for comprehensive tracking
- Add new user properties (onboarding_completed, task_streak_current, etc.)
- Simplify AnalyticsConfig to single apiKey
- Add StepsCompletedBucket type
EOF
)"
```

---

## Task 3: Simplify Analytics Utils

**Files:**

- Modify: `lib/analytics-utils.ts`
- Modify: `__tests__/lib/analytics-utils.test.ts`

**Step 1: Update analytics-utils.ts**

Replace entire contents:

```typescript
// lib/analytics-utils.ts
/**
 * Utility functions for Amplitude Analytics.
 *
 * These helpers handle PII sanitization, bucket calculations,
 * and initialization checks.
 *
 * @module lib/analytics-utils
 */

import type { EventParams, DaysSoberBucket, StepsCompletedBucket } from '@/types/analytics';

/**
 * PII fields that must be stripped from analytics events.
 * These fields could identify users and must never be sent to analytics.
 */
const PII_FIELDS = [
  'email',
  'name',
  'display_name',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'sobriety_date',
  'relapse_date',
] as const;

/**
 * Maximum recursion depth to prevent infinite loops.
 */
const MAX_DEPTH = 10;

/**
 * Recursively removes PII fields from event parameters at any depth.
 */
function sanitizeValue(
  value: unknown,
  visited: WeakSet<object> = new WeakSet(),
  depth: number = 0
): unknown {
  if (depth > MAX_DEPTH) return value;
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, visited, depth + 1));
  }

  if (typeof value === 'object') {
    if (visited.has(value)) return undefined;
    visited.add(value);

    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (PII_FIELDS.includes(key as (typeof PII_FIELDS)[number])) continue;
      sanitized[key] = sanitizeValue(val, visited, depth + 1);
    }

    visited.delete(value);
    return sanitized;
  }

  return value;
}

/**
 * Removes PII fields from event parameters before sending to analytics.
 */
export function sanitizeParams(params: EventParams | undefined): EventParams {
  if (!params) return {};
  const sanitized = sanitizeValue(params) as EventParams;
  return sanitized || {};
}

/**
 * Calculates the appropriate bucket for days sober.
 */
export function calculateDaysSoberBucket(days: number): DaysSoberBucket {
  if (days <= 7) return '0-7';
  if (days <= 30) return '8-30';
  if (days <= 90) return '31-90';
  if (days <= 180) return '91-180';
  if (days <= 365) return '181-365';
  return '365+';
}

/**
 * Calculates the appropriate bucket for steps completed.
 */
export function calculateStepsCompletedBucket(count: number): StepsCompletedBucket {
  if (count === 0) return '0';
  if (count <= 3) return '1-3';
  if (count <= 6) return '4-6';
  if (count <= 9) return '7-9';
  return '10-12';
}

/**
 * Checks if Amplitude Analytics should be initialized.
 * Returns true if the API key is configured.
 */
export function shouldInitializeAnalytics(): boolean {
  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY?.trim();
  return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Checks if the app is running in debug mode.
 */
export function isDebugMode(): boolean {
  return __DEV__ || process.env.EXPO_PUBLIC_ANALYTICS_DEBUG === 'true';
}

/**
 * Gets the current environment for analytics tagging.
 */
export function getAnalyticsEnvironment(): string {
  if (__DEV__) return 'development';
  return process.env.EXPO_PUBLIC_APP_ENV || 'production';
}
```

**Step 2: Update analytics-utils test**

Replace entire contents of `__tests__/lib/analytics-utils.test.ts`:

```typescript
// __tests__/lib/analytics-utils.test.ts
import {
  sanitizeParams,
  calculateDaysSoberBucket,
  calculateStepsCompletedBucket,
  shouldInitializeAnalytics,
  isDebugMode,
  getAnalyticsEnvironment,
} from '@/lib/analytics-utils';

describe('lib/analytics-utils', () => {
  describe('sanitizeParams', () => {
    it('should return empty object for undefined', () => {
      expect(sanitizeParams(undefined)).toEqual({});
    });

    it('should remove PII fields', () => {
      const params = {
        task_id: '123',
        email: 'test@example.com',
        name: 'John',
        count: 5,
      };
      expect(sanitizeParams(params)).toEqual({ task_id: '123', count: 5 });
    });

    it('should handle nested objects', () => {
      const params = {
        task_id: '123',
        metadata: { email: 'test@example.com', value: 42 },
      };
      expect(sanitizeParams(params)).toEqual({
        task_id: '123',
        metadata: { value: 42 },
      });
    });

    it('should handle arrays', () => {
      const params = {
        items: [{ email: 'a@b.com', id: 1 }, { id: 2 }],
      };
      expect(sanitizeParams(params)).toEqual({
        items: [{ id: 1 }, { id: 2 }],
      });
    });
  });

  describe('calculateDaysSoberBucket', () => {
    it.each([
      [0, '0-7'],
      [7, '0-7'],
      [8, '8-30'],
      [30, '8-30'],
      [31, '31-90'],
      [90, '31-90'],
      [91, '91-180'],
      [180, '91-180'],
      [181, '181-365'],
      [365, '181-365'],
      [366, '365+'],
      [1000, '365+'],
    ])('should return %s for %d days', (days, expected) => {
      expect(calculateDaysSoberBucket(days)).toBe(expected);
    });
  });

  describe('calculateStepsCompletedBucket', () => {
    it.each([
      [0, '0'],
      [1, '1-3'],
      [3, '1-3'],
      [4, '4-6'],
      [6, '4-6'],
      [7, '7-9'],
      [9, '7-9'],
      [10, '10-12'],
      [12, '10-12'],
    ])('should return %s for %d steps', (count, expected) => {
      expect(calculateStepsCompletedBucket(count)).toBe(expected);
    });
  });

  describe('shouldInitializeAnalytics', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true when API key is set', () => {
      process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY = 'test-key';
      expect(shouldInitializeAnalytics()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY = '';
      expect(shouldInitializeAnalytics()).toBe(false);
    });

    it('should return false when API key is whitespace', () => {
      process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY = '   ';
      expect(shouldInitializeAnalytics()).toBe(false);
    });

    it('should return false when API key is not set', () => {
      delete process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
      expect(shouldInitializeAnalytics()).toBe(false);
    });
  });

  describe('isDebugMode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true in __DEV__ mode', () => {
      // __DEV__ is true in test environment
      expect(isDebugMode()).toBe(true);
    });

    it('should return true when EXPO_PUBLIC_ANALYTICS_DEBUG is true', () => {
      process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';
      expect(isDebugMode()).toBe(true);
    });
  });

  describe('getAnalyticsEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return development in __DEV__ mode', () => {
      expect(getAnalyticsEnvironment()).toBe('development');
    });
  });
});
```

**Step 3: Run tests**

Run: `pnpm test -- __tests__/lib/analytics-utils.test.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add lib/analytics-utils.ts __tests__/lib/analytics-utils.test.ts
git commit -m "$(cat <<'EOF'
refactor(analytics): simplify utils for Amplitude

- Remove Platform import (no longer needed)
- Update shouldInitializeAnalytics to check AMPLITUDE_API_KEY
- Add calculateStepsCompletedBucket helper
- Update tests for new behavior
EOF
)"
```

---

## Task 4: Implement Amplitude Platform (Native)

**Files:**

- Modify: `lib/analytics/platform.native.ts`
- Modify: `__tests__/lib/analytics.native.test.ts`

**Step 1: Create Amplitude mock in jest.setup.js**

Add to `jest.setup.js` (after existing mocks):

```javascript
// Mock @amplitude/analytics-react-native
jest.mock('@amplitude/analytics-react-native', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  reset: jest.fn().mockResolvedValue(undefined),
  Identify: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockReturnThis(),
  })),
}));
```

**Step 2: Update platform.native.ts**

Replace entire contents:

```typescript
// lib/analytics/platform.native.ts
/**
 * Amplitude Analytics implementation for native platforms (iOS/Android).
 *
 * This file is automatically selected by Metro bundler on iOS and Android.
 *
 * @module lib/analytics/platform.native
 */

import * as amplitude from '@amplitude/analytics-react-native';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

let isInitialized = false;

/**
 * Initializes Amplitude Analytics for native platforms.
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  if (isInitialized) {
    if (isDebugMode()) {
      logger.debug('Amplitude already initialized', { category: LogCategory.ANALYTICS });
    }
    return;
  }

  try {
    await amplitude.init(config.apiKey, undefined, {
      logLevel: isDebugMode() ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.None,
    });

    isInitialized = true;

    if (isDebugMode()) {
      logger.info('Amplitude Analytics initialized for native', {
        category: LogCategory.ANALYTICS,
      });
    }
  } catch (error) {
    logger.error(
      'Failed to initialize Amplitude',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Tracks an analytics event.
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (isDebugMode()) {
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  if (!isInitialized) return;

  amplitude.track(eventName, params);
}

/**
 * Sets the user ID for analytics.
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId ? '<set>' : 'null'}`, { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  amplitude.setUserId(userId ?? undefined);
}

/**
 * Sets user properties for analytics.
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  if (isDebugMode()) {
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
  }

  if (!isInitialized) return;

  const identify = new amplitude.Identify();
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      identify.set(key, value);
    }
  }
  amplitude.identify(identify);
}

/**
 * Tracks a screen view event.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform('Screen Viewed', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Resets analytics state.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  await amplitude.reset();
}

/**
 * Reset for testing.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
}
```

**Step 3: Update native test file**

Replace entire contents of `__tests__/lib/analytics.native.test.ts`:

```typescript
// __tests__/lib/analytics.native.test.ts
/**
 * @jest-environment node
 */

import * as amplitude from '@amplitude/analytics-react-native';

import {
  initializePlatformAnalytics,
  trackEventPlatform,
  setUserIdPlatform,
  setUserPropertiesPlatform,
  trackScreenViewPlatform,
  resetAnalyticsPlatform,
  __resetForTesting,
} from '@/lib/analytics/platform.native';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogCategory: { ANALYTICS: 'analytics' },
}));

describe('lib/analytics/platform.native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTesting();
  });

  describe('initializePlatformAnalytics', () => {
    it('should initialize Amplitude with API key', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledWith('test-key', undefined, expect.any(Object));
    });

    it('should not reinitialize if already initialized', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackEventPlatform', () => {
    it('should track event after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).toHaveBeenCalledWith('Test Event', { param: 'value' });
    });

    it('should not track event before initialization', () => {
      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).not.toHaveBeenCalled();
    });
  });

  describe('setUserIdPlatform', () => {
    it('should set user ID after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform('user-123');

      expect(amplitude.setUserId).toHaveBeenCalledWith('user-123');
    });

    it('should clear user ID when null', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform(null);

      expect(amplitude.setUserId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('setUserPropertiesPlatform', () => {
    it('should set user properties after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserPropertiesPlatform({ has_sponsor: true, theme_preference: 'dark' });

      expect(amplitude.identify).toHaveBeenCalled();
    });
  });

  describe('trackScreenViewPlatform', () => {
    it('should track screen view event', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackScreenViewPlatform('Home', 'TabScreen');

      expect(amplitude.track).toHaveBeenCalledWith('Screen Viewed', {
        screen_name: 'Home',
        screen_class: 'TabScreen',
      });
    });
  });

  describe('resetAnalyticsPlatform', () => {
    it('should reset analytics state', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      await resetAnalyticsPlatform();

      expect(amplitude.reset).toHaveBeenCalled();
    });
  });
});
```

**Step 4: Run tests**

Run: `pnpm test -- __tests__/lib/analytics.native.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add lib/analytics/platform.native.ts __tests__/lib/analytics.native.test.ts jest.setup.js
git commit -m "$(cat <<'EOF'
feat(analytics): implement Amplitude SDK for native platforms

- Replace Firebase with Amplitude SDK
- Add amplitude mock to jest.setup.js
- Update native platform implementation
- Use Identify class for user properties
EOF
)"
```

---

## Task 5: Implement Amplitude Platform (Web)

**Files:**

- Modify: `lib/analytics/platform.web.ts`
- Modify: `__tests__/lib/analytics.web.test.ts`

**Step 1: Update platform.web.ts**

Replace entire contents:

```typescript
// lib/analytics/platform.web.ts
/**
 * Amplitude Analytics implementation for web platform.
 *
 * This file is automatically selected by Metro bundler on web.
 *
 * @module lib/analytics/platform.web
 */

import * as amplitude from '@amplitude/analytics-browser';

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

let isInitialized = false;

/**
 * Initializes Amplitude Analytics for web platform.
 */
export async function initializePlatformAnalytics(config: AnalyticsConfig): Promise<void> {
  if (isInitialized) {
    if (isDebugMode()) {
      logger.debug('Amplitude already initialized', { category: LogCategory.ANALYTICS });
    }
    return;
  }

  try {
    amplitude.init(config.apiKey, undefined, {
      logLevel: isDebugMode() ? amplitude.Types.LogLevel.Debug : amplitude.Types.LogLevel.None,
    });

    isInitialized = true;

    if (isDebugMode()) {
      logger.info('Amplitude Analytics initialized for web', {
        category: LogCategory.ANALYTICS,
      });
    }
  } catch (error) {
    logger.error(
      'Failed to initialize Amplitude',
      error instanceof Error ? error : new Error(String(error)),
      { category: LogCategory.ANALYTICS }
    );
  }
}

/**
 * Tracks an analytics event.
 */
export function trackEventPlatform(eventName: string, params?: EventParams): void {
  if (isDebugMode()) {
    logger.debug(`Event: ${eventName}`, { category: LogCategory.ANALYTICS, ...params });
  }

  if (!isInitialized) return;

  amplitude.track(eventName, params);
}

/**
 * Sets the user ID for analytics.
 */
export function setUserIdPlatform(userId: string | null): void {
  if (isDebugMode()) {
    logger.debug(`setUserId: ${userId ? '<set>' : 'null'}`, { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  amplitude.setUserId(userId ?? undefined);
}

/**
 * Sets user properties for analytics.
 */
export function setUserPropertiesPlatform(properties: UserProperties): void {
  if (isDebugMode()) {
    logger.debug('setUserProperties', { category: LogCategory.ANALYTICS, ...properties });
  }

  if (!isInitialized) return;

  const identify = new amplitude.Identify();
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      identify.set(key, value);
    }
  }
  amplitude.identify(identify);
}

/**
 * Tracks a screen view event.
 */
export function trackScreenViewPlatform(screenName: string, screenClass?: string): void {
  trackEventPlatform('Screen Viewed', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

/**
 * Resets analytics state.
 */
export async function resetAnalyticsPlatform(): Promise<void> {
  if (isDebugMode()) {
    logger.info('Resetting analytics state', { category: LogCategory.ANALYTICS });
  }

  if (!isInitialized) return;

  amplitude.reset();
}

/**
 * Reset for testing.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  isInitialized = false;
}
```

**Step 2: Add browser mock to jest.setup.js**

Add after the react-native mock:

```javascript
// Mock @amplitude/analytics-browser
jest.mock('@amplitude/analytics-browser', () => ({
  init: jest.fn(),
  track: jest.fn(),
  identify: jest.fn(),
  setUserId: jest.fn(),
  reset: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockReturnThis(),
  })),
  Types: {
    LogLevel: { Debug: 0, None: 4 },
  },
}));
```

**Step 3: Update web test file**

Replace entire contents of `__tests__/lib/analytics.web.test.ts`:

```typescript
// __tests__/lib/analytics.web.test.ts
import * as amplitude from '@amplitude/analytics-browser';

import {
  initializePlatformAnalytics,
  trackEventPlatform,
  setUserIdPlatform,
  setUserPropertiesPlatform,
  trackScreenViewPlatform,
  resetAnalyticsPlatform,
  __resetForTesting,
} from '@/lib/analytics/platform.web';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogCategory: { ANALYTICS: 'analytics' },
}));

describe('lib/analytics/platform.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTesting();
  });

  describe('initializePlatformAnalytics', () => {
    it('should initialize Amplitude with API key', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledWith('test-key', undefined, expect.any(Object));
    });

    it('should not reinitialize if already initialized', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackEventPlatform', () => {
    it('should track event after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).toHaveBeenCalledWith('Test Event', { param: 'value' });
    });

    it('should not track event before initialization', () => {
      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).not.toHaveBeenCalled();
    });
  });

  describe('setUserIdPlatform', () => {
    it('should set user ID after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform('user-123');

      expect(amplitude.setUserId).toHaveBeenCalledWith('user-123');
    });

    it('should clear user ID when null', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform(null);

      expect(amplitude.setUserId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('setUserPropertiesPlatform', () => {
    it('should set user properties after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserPropertiesPlatform({ has_sponsor: true, theme_preference: 'dark' });

      expect(amplitude.identify).toHaveBeenCalled();
    });
  });

  describe('trackScreenViewPlatform', () => {
    it('should track screen view event', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackScreenViewPlatform('Home', 'TabScreen');

      expect(amplitude.track).toHaveBeenCalledWith('Screen Viewed', {
        screen_name: 'Home',
        screen_class: 'TabScreen',
      });
    });
  });

  describe('resetAnalyticsPlatform', () => {
    it('should reset analytics state', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      await resetAnalyticsPlatform();

      expect(amplitude.reset).toHaveBeenCalled();
    });
  });
});
```

**Step 4: Run tests**

Run: `pnpm test -- __tests__/lib/analytics.web.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add lib/analytics/platform.web.ts __tests__/lib/analytics.web.test.ts jest.setup.js
git commit -m "$(cat <<'EOF'
feat(analytics): implement Amplitude SDK for web platform

- Replace Firebase with Amplitude browser SDK
- Add amplitude browser mock to jest.setup.js
- Update web platform implementation
EOF
)"
```

---

## Task 6: Update Main Analytics Module

**Files:**

- Modify: `lib/analytics/index.ts`
- Modify: `__tests__/lib/analytics.test.ts`

**Step 1: Update index.ts**

Replace entire contents:

```typescript
// lib/analytics/index.ts
/**
 * Unified Amplitude Analytics module for Sobers.
 *
 * This is the ONLY module that app code should import for analytics.
 * Metro automatically selects the correct platform implementation.
 *
 * @module lib/analytics
 */

import type { EventParams, UserProperties, AnalyticsConfig } from '@/types/analytics';
import { sanitizeParams, shouldInitializeAnalytics, isDebugMode } from '@/lib/analytics-utils';
import { logger, LogCategory } from '@/lib/logger';

import {
  initializePlatformAnalytics,
  trackEventPlatform,
  setUserIdPlatform,
  setUserPropertiesPlatform,
  trackScreenViewPlatform,
  resetAnalyticsPlatform,
} from './platform';

// Re-export types and constants
export { AnalyticsEvents, type AnalyticsEventName } from '@/types/analytics';
export { calculateDaysSoberBucket, calculateStepsCompletedBucket } from '@/lib/analytics-utils';

let initializationPromise: Promise<void> | null = null;
let initializationState: 'pending' | 'completed' | 'skipped' | 'failed' | null = null;

/**
 * Initialize Amplitude Analytics for the app.
 */
export async function initializeAnalytics(): Promise<void> {
  if (initializationState === 'completed' || initializationState === 'skipped') {
    return;
  }

  if (initializationPromise !== null && initializationState === 'pending') {
    return initializationPromise;
  }

  if (!shouldInitializeAnalytics()) {
    if (isDebugMode()) {
      logger.warn('Amplitude not configured - analytics disabled', {
        category: LogCategory.ANALYTICS,
      });
    }
    initializationState = 'skipped';
    return;
  }

  const config: AnalyticsConfig = {
    apiKey: process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || '',
  };

  initializationState = 'pending';
  initializationPromise = initializePlatformAnalytics(config)
    .then(() => {
      initializationState = 'completed';
    })
    .catch((error) => {
      initializationState = 'failed';
      initializationPromise = null;
      logger.error(
        'Failed to initialize analytics',
        error instanceof Error ? error : new Error(String(error)),
        {
          category: LogCategory.ANALYTICS,
        }
      );
    });

  return initializationPromise;
}

/**
 * Tracks an analytics event.
 */
export function trackEvent(eventName: string, params?: EventParams): void {
  const sanitized = sanitizeParams(params);
  trackEventPlatform(eventName, sanitized);
}

/**
 * Sets the user ID for analytics.
 */
export function setUserId(userId: string | null): void {
  setUserIdPlatform(userId);
}

/**
 * Sets user properties for analytics.
 */
export function setUserProperties(properties: UserProperties): void {
  setUserPropertiesPlatform(properties);
}

/**
 * Tracks a screen view.
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
  trackScreenViewPlatform(screenName, screenClass);
}

/**
 * Resets analytics state.
 */
export async function resetAnalytics(): Promise<void> {
  await resetAnalyticsPlatform();
}

/**
 * Reset for testing.
 * @internal
 */
export function __resetForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('__resetForTesting should only be called in test environments');
  }
  initializationState = null;
  initializationPromise = null;
}
```

**Step 2: Update the main test file**

Update `__tests__/lib/analytics.test.ts` to test the new implementation (keep existing test structure, update mocks and expectations for Amplitude).

**Step 3: Run all analytics tests**

Run: `pnpm test -- __tests__/lib/analytics`
Expected: All tests pass

**Step 4: Commit**

```bash
git add lib/analytics/index.ts __tests__/lib/analytics.test.ts
git commit -m "$(cat <<'EOF'
refactor(analytics): update main module for Amplitude

- Simplify config to single apiKey
- Update initialization to check AMPLITUDE_API_KEY
- Export calculateStepsCompletedBucket
EOF
)"
```

---

## Task 7: Update App Configuration

**Files:**

- Modify: `app.config.ts`
- Modify: `.env.example`

**Step 1: Update app.config.ts**

Remove Firebase-related configuration:

- Remove `googleServicesFile` from ios config
- Remove `googleServicesFile` from android config
- Remove `'./plugins/withModularHeaders'` from plugins
- Remove `'@react-native-firebase/app'` from plugins
- Update documentation comments

**Step 2: Update .env.example**

Replace Firebase section with Amplitude:

```env
# ==============================================================================
# AMPLITUDE ANALYTICS
# ==============================================================================
# Amplitude Dashboard: https://app.amplitude.com
# Get API key from: Settings > Projects > [Your Project] > General
EXPO_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-api-key-here

# Optional: Enable debug mode for analytics (shows events in console)
EXPO_PUBLIC_ANALYTICS_DEBUG=false
```

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add app.config.ts .env.example
git commit -m "$(cat <<'EOF'
chore(config): remove Firebase config, add Amplitude

- Remove googleServicesFile from iOS/Android config
- Remove Firebase plugins from app.config.ts
- Replace Firebase env vars with AMPLITUDE_API_KEY
EOF
)"
```

---

## Task 8: Delete Firebase Files

**Files:**

- Delete: `plugins/withFirebaseConfig.js`
- Delete: `plugins/withModularHeaders.js`
- Delete: `firebase.json`
- Delete: `__tests__/plugins/withFirebaseConfig.test.ts`
- Delete: `__tests__/plugins/withModularHeaders.test.ts`

**Step 1: Delete files**

```bash
rm -f plugins/withFirebaseConfig.js
rm -f plugins/withModularHeaders.js
rm -f firebase.json
rm -f __tests__/plugins/withFirebaseConfig.test.ts
rm -f __tests__/plugins/withModularHeaders.test.ts
```

**Step 2: Verify deletion**

Run: `ls plugins/ && ls __tests__/plugins/ 2>/dev/null || echo "plugins test dir empty/removed"`

**Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(cleanup): remove Firebase plugin files

- Delete withFirebaseConfig.js plugin
- Delete withModularHeaders.js plugin
- Delete firebase.json
- Delete associated test files
EOF
)"
```

---

## Task 9: Run Full Quality Suite

**Step 1: Format code**

Run: `pnpm format`

**Step 2: Lint code**

Run: `pnpm lint`
Expected: No errors

**Step 3: Type check**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Build web**

Run: `pnpm build:web`
Expected: Build succeeds

**Step 5: Run all tests**

Run: `pnpm test`
Expected: All tests pass with 80%+ coverage

**Step 6: Commit any formatting changes**

```bash
git add -A
git commit -m "style: format code after Amplitude migration" || echo "Nothing to commit"
```

---

## Task 10: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add changelog entry**

Add under `## [Unreleased]`:

```markdown
### Added

- Amplitude Analytics integration for product analytics
- 15 new analytics events for comprehensive user journey tracking
- New user properties: onboarding_completed, task_streak_current, steps_completed_count, savings_goal_set
- calculateStepsCompletedBucket utility function

### Changed

- Analytics events now use Title Case naming (Amplitude convention)
- Analytics configuration simplified to single API key

### Removed

- Firebase Analytics SDK and all related dependencies
- Firebase configuration files and Expo plugins
- Firebase-specific environment variables
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document Amplitude migration"
```

---

## Task 11: Final Verification

**Step 1: Run full quality suite one more time**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

Expected: All pass

**Step 2: Review git log**

```bash
git log --oneline -15
```

Expected: Clean commit history with conventional commits

**Step 3: Report completion**

The migration is complete when:

- [ ] All Firebase dependencies removed
- [ ] Amplitude SDK installed and configured
- [ ] All 35 events defined with Title Case naming
- [ ] 9 user properties defined
- [ ] All tests passing (80%+ coverage)
- [ ] No TypeScript errors
- [ ] CHANGELOG updated

---

## Future Tasks (Not in this plan)

The following require instrumenting new events in existing components - create a separate plan:

- Add `trackEvent()` calls for the 15 new events in relevant screens/components
- Update existing `trackEvent()` calls to use new event names from `AnalyticsEvents`
