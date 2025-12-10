// __tests__/lib/analytics-utils.test.ts
import { Platform } from 'react-native';

import {
  sanitizeParams,
  calculateDaysSoberBucket,
  shouldInitializeAnalytics,
  isDebugMode,
  getAnalyticsEnvironment,
} from '@/lib/analytics-utils';
import type { DaysSoberBucket } from '@/types/analytics';

// Store original Platform.OS to restore after tests
const originalPlatformOS = Platform.OS;

describe('Analytics Utilities', () => {
  describe('sanitizeParams', () => {
    it('passes through valid parameters unchanged', () => {
      const params = {
        task_id: '123',
        count: 5,
        is_active: true,
      };
      expect(sanitizeParams(params)).toEqual(params);
    });

    it('strips email field from parameters', () => {
      const params = {
        task_id: '123',
        email: 'user@example.com',
      };
      expect(sanitizeParams(params)).toEqual({ task_id: '123' });
    });

    it('strips all PII fields', () => {
      const params = {
        task_id: '123',
        email: 'user@example.com',
        name: 'John Doe',
        display_name: 'John D.',
        phone: '555-1234',
        password: 'secret',
        token: 'abc123',
      };
      expect(sanitizeParams(params)).toEqual({ task_id: '123' });
    });

    it('handles undefined values', () => {
      const params = {
        task_id: '123',
        optional: undefined,
      };
      expect(sanitizeParams(params)).toEqual({
        task_id: '123',
        optional: undefined,
      });
    });

    it('returns empty object for empty input', () => {
      expect(sanitizeParams({})).toEqual({});
    });

    it('returns empty object for undefined input', () => {
      expect(sanitizeParams(undefined)).toEqual({});
    });
  });

  describe('calculateDaysSoberBucket', () => {
    it('returns "0-7" for 0 days', () => {
      expect(calculateDaysSoberBucket(0)).toBe('0-7');
    });

    it('returns "0-7" for 7 days', () => {
      expect(calculateDaysSoberBucket(7)).toBe('0-7');
    });

    it('returns "8-30" for 8 days', () => {
      expect(calculateDaysSoberBucket(8)).toBe('8-30');
    });

    it('returns "8-30" for 30 days', () => {
      expect(calculateDaysSoberBucket(30)).toBe('8-30');
    });

    it('returns "31-90" for 31 days', () => {
      expect(calculateDaysSoberBucket(31)).toBe('31-90');
    });

    it('returns "31-90" for 90 days', () => {
      expect(calculateDaysSoberBucket(90)).toBe('31-90');
    });

    it('returns "91-180" for 91 days', () => {
      expect(calculateDaysSoberBucket(91)).toBe('91-180');
    });

    it('returns "91-180" for 180 days', () => {
      expect(calculateDaysSoberBucket(180)).toBe('91-180');
    });

    it('returns "181-365" for 181 days', () => {
      expect(calculateDaysSoberBucket(181)).toBe('181-365');
    });

    it('returns "181-365" for 365 days', () => {
      expect(calculateDaysSoberBucket(365)).toBe('181-365');
    });

    it('returns "365+" for 366 days', () => {
      expect(calculateDaysSoberBucket(366)).toBe('365+');
    });

    it('returns "365+" for 1000 days', () => {
      expect(calculateDaysSoberBucket(1000)).toBe('365+');
    });

    it('handles negative days as "0-7"', () => {
      expect(calculateDaysSoberBucket(-5)).toBe('0-7');
    });
  });

  describe('shouldInitializeAnalytics', () => {
    const originalEnv = process.env;

    afterEach(() => {
      // Restore Platform.OS after each test
      (Platform as { OS: string }).OS = originalPlatformOS;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    describe('on native platforms (iOS/Android)', () => {
      it('returns true on iOS regardless of env vars', () => {
        (Platform as { OS: string }).OS = 'ios';
        const originalValue = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        delete process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

        expect(shouldInitializeAnalytics()).toBe(true);

        // Restore
        if (originalValue !== undefined) {
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = originalValue;
        }
      });

      it('returns true on Android regardless of env vars', () => {
        (Platform as { OS: string }).OS = 'android';
        const originalValue = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        delete process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

        expect(shouldInitializeAnalytics()).toBe(true);

        // Restore
        if (originalValue !== undefined) {
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = originalValue;
        }
      });
    });

    describe('on web platform', () => {
      beforeEach(() => {
        (Platform as { OS: string }).OS = 'web';
      });

      it('returns true when Firebase measurement ID is set', () => {
        const originalValue = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-XXXXXXXX';

        expect(shouldInitializeAnalytics()).toBe(true);

        // Restore original value
        if (originalValue === undefined) {
          delete process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        } else {
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = originalValue;
        }
      });

      it('returns false when Firebase measurement ID is missing', () => {
        const originalValue = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        delete process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

        expect(shouldInitializeAnalytics()).toBe(false);

        // Restore original value
        if (originalValue !== undefined) {
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = originalValue;
        }
      });

      it('returns false when Firebase measurement ID is empty string', () => {
        const originalValue = process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = '';

        expect(shouldInitializeAnalytics()).toBe(false);

        // Restore original value
        if (originalValue === undefined) {
          delete process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;
        } else {
          process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID = originalValue;
        }
      });
    });
  });

  describe('isDebugMode', () => {
    it('returns false when __DEV__ is false and no env var set', () => {
      const originalValue = process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      delete process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;

      // __DEV__ is false in Jest test environment
      expect(isDebugMode()).toBe(false);

      // Restore
      if (originalValue !== undefined) {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = originalValue;
      }
    });

    it('returns true when EXPO_PUBLIC_ANALYTICS_DEBUG is set to true', () => {
      const originalValue = process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';

      expect(isDebugMode()).toBe(true);

      // Restore
      if (originalValue === undefined) {
        delete process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      } else {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = originalValue;
      }
    });

    it('returns false when EXPO_PUBLIC_ANALYTICS_DEBUG is not "true"', () => {
      const originalValue = process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'false';

      expect(isDebugMode()).toBe(false);

      // Restore
      if (originalValue === undefined) {
        delete process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      } else {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = originalValue;
      }
    });
  });

  describe('getAnalyticsEnvironment', () => {
    it('returns production when __DEV__ is false and no env var', () => {
      const originalValue = process.env.EXPO_PUBLIC_APP_ENV;
      delete process.env.EXPO_PUBLIC_APP_ENV;

      // __DEV__ is false in Jest, so it returns the env var or 'production'
      expect(getAnalyticsEnvironment()).toBe('production');

      // Restore
      if (originalValue !== undefined) {
        process.env.EXPO_PUBLIC_APP_ENV = originalValue;
      }
    });

    it('returns EXPO_PUBLIC_APP_ENV when set', () => {
      const originalValue = process.env.EXPO_PUBLIC_APP_ENV;
      process.env.EXPO_PUBLIC_APP_ENV = 'staging';

      expect(getAnalyticsEnvironment()).toBe('staging');

      // Restore
      if (originalValue === undefined) {
        delete process.env.EXPO_PUBLIC_APP_ENV;
      } else {
        process.env.EXPO_PUBLIC_APP_ENV = originalValue;
      }
    });
  });
});
