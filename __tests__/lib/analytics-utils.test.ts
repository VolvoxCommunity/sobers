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
      [-5, '0'],
      [-1, '0'],
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
      // Re-import to pick up env change
      const { shouldInitializeAnalytics: freshFn } = require('@/lib/analytics-utils');
      expect(freshFn()).toBe(true);
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
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return false when __DEV__ is false and no env var set', () => {
      // __DEV__ is false in test environment (jest.setup.js)
      delete process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
      expect(isDebugMode()).toBe(false);
    });

    it('should return true when EXPO_PUBLIC_ANALYTICS_DEBUG is true', () => {
      process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';
      // Re-import to pick up env change
      const { isDebugMode: freshFn } = require('@/lib/analytics-utils');
      expect(freshFn()).toBe(true);
    });
  });

  describe('getAnalyticsEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return production when __DEV__ is false and no env var', () => {
      // __DEV__ is false in test environment (jest.setup.js)
      delete process.env.EXPO_PUBLIC_APP_ENV;
      expect(getAnalyticsEnvironment()).toBe('production');
    });

    it('should return EXPO_PUBLIC_APP_ENV when set', () => {
      process.env.EXPO_PUBLIC_APP_ENV = 'staging';
      // Re-import to pick up env change
      const { getAnalyticsEnvironment: freshFn } = require('@/lib/analytics-utils');
      expect(freshFn()).toBe('staging');
    });
  });
});
