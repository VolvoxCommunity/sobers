/**
 * Tests for date utility functions
 */

import {
  DEVICE_TIMEZONE,
  getUserTimezone,
  formatLocalDate,
  formatDateWithTimezone,
  parseDateAsLocal,
  getDateDiffInDays,
} from './date';
import type { Profile } from '@/types/database';

describe('date utilities', () => {
  // =============================================================================
  // DEVICE_TIMEZONE
  // =============================================================================
  describe('DEVICE_TIMEZONE', () => {
    it('should be a valid IANA timezone string', () => {
      expect(typeof DEVICE_TIMEZONE).toBe('string');
      expect(DEVICE_TIMEZONE.length).toBeGreaterThan(0);
      // IANA timezones typically contain a '/' (e.g., 'America/New_York') or are 'UTC'
      expect(DEVICE_TIMEZONE).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/);
    });
  });

  // =============================================================================
  // getUserTimezone
  // =============================================================================
  describe('getUserTimezone', () => {
    it('should return profile timezone when profile has timezone', () => {
      const profile = { timezone: 'America/Los_Angeles' } as Profile;
      expect(getUserTimezone(profile)).toBe('America/Los_Angeles');
    });

    it('should return device timezone when profile is null', () => {
      expect(getUserTimezone(null)).toBe(DEVICE_TIMEZONE);
    });

    it('should return device timezone when profile is undefined', () => {
      expect(getUserTimezone(undefined)).toBe(DEVICE_TIMEZONE);
    });

    it('should return device timezone when profile has no timezone', () => {
      const profile = {} as Profile;
      expect(getUserTimezone(profile)).toBe(DEVICE_TIMEZONE);
    });

    it('should return device timezone when profile timezone is null', () => {
      const profile = { timezone: null } as unknown as Profile;
      expect(getUserTimezone(profile)).toBe(DEVICE_TIMEZONE);
    });
  });

  // =============================================================================
  // formatLocalDate
  // =============================================================================
  describe('formatLocalDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      // Create a date at a specific UTC time
      const date = new Date('2024-06-15T12:00:00Z');
      const result = formatLocalDate(date);
      // Should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return consistent format for different dates', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
        new Date('2024-02-29T12:00:00Z'), // Leap year
      ];

      dates.forEach((date) => {
        const result = formatLocalDate(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // =============================================================================
  // formatDateWithTimezone
  // =============================================================================
  describe('formatDateWithTimezone', () => {
    it('should format date in specified timezone', () => {
      // Midnight UTC on Jan 1, 2024
      const date = new Date('2024-01-01T00:00:00Z');
      const result = formatDateWithTimezone(date, 'UTC');
      expect(result).toBe('2024-01-01');
    });

    it('should handle timezone that shifts date to previous day', () => {
      // 2 AM UTC on Jan 2, 2024 is still Jan 1 in some western timezones
      const date = new Date('2024-01-02T02:00:00Z');
      const result = formatDateWithTimezone(date, 'America/Los_Angeles');
      // LA is UTC-8, so 2 AM UTC is 6 PM previous day
      expect(result).toBe('2024-01-01');
    });

    it('should handle timezone that shifts date to next day', () => {
      // 11 PM UTC on Jan 1, 2024 is Jan 2 in some eastern timezones
      const date = new Date('2024-01-01T23:00:00Z');
      const result = formatDateWithTimezone(date, 'Asia/Tokyo');
      // Tokyo is UTC+9, so 11 PM UTC is 8 AM next day
      expect(result).toBe('2024-01-02');
    });

    it('should use device timezone as default', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const resultWithDefault = formatDateWithTimezone(date);
      const resultWithDevice = formatDateWithTimezone(date, DEVICE_TIMEZONE);
      expect(resultWithDefault).toBe(resultWithDevice);
    });
  });

  // =============================================================================
  // parseDateAsLocal
  // =============================================================================
  describe('parseDateAsLocal', () => {
    it('should parse YYYY-MM-DD as midnight in UTC when UTC timezone specified', () => {
      const result = parseDateAsLocal('2024-01-15', 'UTC');
      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('should return a valid Date object', () => {
      const result = parseDateAsLocal('2024-01-15', 'UTC');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });

    it('should use device timezone as default', () => {
      const dateStr = '2024-06-15';
      const resultWithDefault = parseDateAsLocal(dateStr);
      const resultWithDevice = parseDateAsLocal(dateStr, DEVICE_TIMEZONE);
      expect(resultWithDefault.getTime()).toBe(resultWithDevice.getTime());
    });

    it('should parse different date strings correctly', () => {
      const dates = ['2024-01-01', '2024-06-15', '2024-12-31'];
      dates.forEach((dateStr) => {
        const result = parseDateAsLocal(dateStr, 'UTC');
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(false);
      });
    });

    it('should handle leap year dates', () => {
      const result = parseDateAsLocal('2024-02-29', 'UTC');
      expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });
  });

  // =============================================================================
  // getDateDiffInDays
  // =============================================================================
  describe('getDateDiffInDays', () => {
    it('should return 0 for same date', () => {
      const result = getDateDiffInDays('2024-01-15', new Date('2024-01-15T12:00:00Z'), 'UTC');
      expect(result).toBe(0);
    });

    it('should return positive days for future end date', () => {
      const result = getDateDiffInDays('2024-01-01', new Date('2024-01-11T12:00:00Z'), 'UTC');
      expect(result).toBe(10);
    });

    it('should return 0 for negative days (start after end)', () => {
      const result = getDateDiffInDays('2024-01-15', new Date('2024-01-01T12:00:00Z'), 'UTC');
      expect(result).toBe(0);
    });

    it('should accept Date object as start date', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-11T00:00:00Z');
      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(10);
    });

    it('should accept string as start date', () => {
      const endDate = new Date('2024-01-11T00:00:00Z');
      const result = getDateDiffInDays('2024-01-01', endDate, 'UTC');
      expect(result).toBe(10);
    });

    it('should handle timezone correctly for day boundaries', () => {
      // At 11 PM UTC on Jan 10, it's already Jan 11 in Tokyo (UTC+9)
      const endDate = new Date('2024-01-10T23:00:00Z');
      const resultUTC = getDateDiffInDays('2024-01-01', endDate, 'UTC');
      const resultTokyo = getDateDiffInDays('2024-01-01', endDate, 'Asia/Tokyo');

      // In UTC, it's still Jan 10, so 9 days difference
      expect(resultUTC).toBe(9);
      // In Tokyo, it's Jan 11 (8 AM), so 10 days difference
      expect(resultTokyo).toBe(10);
    });

    it('should use device timezone as default', () => {
      const startDate = '2024-01-01';
      const endDate = new Date('2024-01-15T12:00:00Z');
      const resultWithDefault = getDateDiffInDays(startDate, endDate);
      const resultWithDevice = getDateDiffInDays(startDate, endDate, DEVICE_TIMEZONE);
      expect(resultWithDefault).toBe(resultWithDevice);
    });

    it('should calculate correctly across month boundaries', () => {
      const result = getDateDiffInDays('2024-01-25', new Date('2024-02-05T12:00:00Z'), 'UTC');
      expect(result).toBe(11);
    });

    it('should calculate correctly across year boundaries', () => {
      const result = getDateDiffInDays('2023-12-25', new Date('2024-01-05T12:00:00Z'), 'UTC');
      expect(result).toBe(11);
    });

    it('should handle leap year correctly', () => {
      // 2024 is a leap year, Feb has 29 days
      const result = getDateDiffInDays('2024-02-28', new Date('2024-03-01T12:00:00Z'), 'UTC');
      expect(result).toBe(2); // Feb 28 -> Feb 29 -> Mar 1
    });

    it('should handle non-leap year correctly', () => {
      // 2023 is not a leap year, Feb has 28 days
      const result = getDateDiffInDays('2023-02-28', new Date('2023-03-01T12:00:00Z'), 'UTC');
      expect(result).toBe(1); // Feb 28 -> Mar 1
    });
  });
});
