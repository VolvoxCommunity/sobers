/**
 * @fileoverview Tests for lib/date.ts
 *
 * Tests the date utility functions including:
 * - Timezone-aware date parsing
 * - Date formatting
 * - Days difference calculation
 * - Edge cases and error handling
 */

// Unmock the date module to test the actual implementation
import {
  parseDateAsLocal,
  formatLocalDate,
  formatDateWithTimezone,
  getDateDiffInDays,
  getUserTimezone,
  DEVICE_TIMEZONE,
} from '@/lib/date';

jest.unmock('@/lib/date');

// =============================================================================
// Tests
// =============================================================================

describe('Date Library', () => {
  describe('DEVICE_TIMEZONE', () => {
    it('exports a valid IANA timezone string', () => {
      expect(typeof DEVICE_TIMEZONE).toBe('string');
      expect(DEVICE_TIMEZONE.length).toBeGreaterThan(0);
    });
  });

  describe('getUserTimezone', () => {
    it('returns profile timezone when available', () => {
      const profile = {
        id: 'user-1',
        user_id: 'user-1',
        name: 'Test User',
        timezone: 'America/New_York',
        sobriety_date: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        push_notification_token: null,
      };

      const result = getUserTimezone(profile);
      expect(result).toBe('America/New_York');
    });

    it('returns device timezone when profile is null', () => {
      const result = getUserTimezone(null);
      expect(result).toBe(DEVICE_TIMEZONE);
    });

    it('returns device timezone when profile is undefined', () => {
      const result = getUserTimezone(undefined);
      expect(result).toBe(DEVICE_TIMEZONE);
    });

    it('returns device timezone when profile has no timezone', () => {
      const profile = {
        id: 'user-1',
        user_id: 'user-1',
        name: 'Test User',
        timezone: null,
        sobriety_date: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        push_notification_token: null,
      };

      const result = getUserTimezone(profile);
      expect(result).toBe(DEVICE_TIMEZONE);
    });
  });

  describe('parseDateAsLocal', () => {
    it('parses a valid date string to a Date object', () => {
      const result = parseDateAsLocal('2024-01-15', 'UTC');

      // Should be midnight on Jan 15, 2024 in UTC
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('respects the timezone parameter', () => {
      // Parse as midnight in New York (UTC-5 in winter)
      const resultNY = parseDateAsLocal('2024-01-15', 'America/New_York');
      // This should be 5 AM UTC (midnight in NY)
      expect(resultNY.getUTCHours()).toBe(5);
    });

    it('uses device timezone as default', () => {
      const result = parseDateAsLocal('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('handles leap year dates', () => {
      const result = parseDateAsLocal('2024-02-29', 'UTC');
      expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });

    it('handles year boundaries', () => {
      const resultDec = parseDateAsLocal('2023-12-31', 'UTC');
      const resultJan = parseDateAsLocal('2024-01-01', 'UTC');

      expect(resultDec.toISOString()).toBe('2023-12-31T00:00:00.000Z');
      expect(resultJan.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('formatLocalDate', () => {
    it('formats a date as YYYY-MM-DD in local timezone', () => {
      // Create a date at noon UTC - should format based on device timezone
      const date = new Date('2024-06-15T12:00:00Z');
      const result = formatLocalDate(date);

      // Result should be a valid YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns consistent format for any date', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      ];

      dates.forEach((date) => {
        const result = formatLocalDate(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('formatDateWithTimezone', () => {
    it('formats a date in the specified timezone', () => {
      // Create a date at midnight UTC on Jan 15
      const date = new Date('2024-01-15T00:00:00Z');

      // In UTC, it should be Jan 15
      const resultUTC = formatDateWithTimezone(date, 'UTC');
      expect(resultUTC).toBe('2024-01-15');
    });

    it('handles timezone offset correctly', () => {
      // Create a date at 1 AM UTC on Jan 15
      const date = new Date('2024-01-15T01:00:00Z');

      // In Pacific time (UTC-8 in winter), 1 AM UTC is 5 PM on Jan 14
      const resultPST = formatDateWithTimezone(date, 'America/Los_Angeles');
      expect(resultPST).toBe('2024-01-14');
    });

    it('handles timezone offset for dates ahead of UTC', () => {
      // Create a date at 11 PM UTC on Jan 14
      const date = new Date('2024-01-14T23:00:00Z');

      // In Tokyo (UTC+9), 11 PM UTC is 8 AM on Jan 15
      const resultTokyo = formatDateWithTimezone(date, 'Asia/Tokyo');
      expect(resultTokyo).toBe('2024-01-15');
    });

    it('uses device timezone as default', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const result = formatDateWithTimezone(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getDateDiffInDays', () => {
    it('calculates days between two dates correctly', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-10T00:00:00Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(9);
    });

    it('returns 0 for same day', () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(0);
    });

    it('returns 0 for negative differences (end before start)', () => {
      const startDate = new Date('2024-01-10T00:00:00Z');
      const endDate = new Date('2024-01-01T00:00:00Z');

      // getDateDiffInDays uses Math.max(0, diff), so negative returns 0
      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(0);
    });

    it('accepts string as start date', () => {
      const startDateStr = '2024-01-01';
      const endDate = new Date('2024-01-10T00:00:00Z');

      const result = getDateDiffInDays(startDateStr, endDate, 'UTC');
      expect(result).toBe(9);
    });

    it('handles month boundaries', () => {
      const startDate = '2024-01-28';
      const endDate = new Date('2024-02-04T12:00:00Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(7);
    });

    it('handles year boundaries', () => {
      const startDate = '2023-12-30';
      const endDate = new Date('2024-01-03T12:00:00Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(4);
    });

    it('handles leap year properly (Feb 28 to Mar 1 on leap year)', () => {
      const startDate = '2024-02-28';
      const endDate = new Date('2024-03-01T12:00:00Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(2);
    });

    it('handles non-leap year Feb boundary', () => {
      const startDate = '2023-02-28';
      const endDate = new Date('2023-03-01T12:00:00Z');

      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(1);
    });

    it('calculates large day differences correctly', () => {
      const startDate = '2024-01-01';
      const endDate = new Date('2024-12-31T12:00:00Z');

      // 2024 is a leap year, so 366 days total, difference is 365
      const result = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(result).toBe(365);
    });

    it('uses current date as default end date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = formatLocalDate(yesterday);

      const result = getDateDiffInDays(startDate);
      expect(result).toBe(1);
    });

    it('uses device timezone as default', () => {
      const startDate = '2024-01-01';
      const endDate = new Date('2024-01-10T12:00:00Z');

      const result = getDateDiffInDays(startDate, endDate);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('handles timezone differences correctly', () => {
      // At 2 AM UTC on Jan 2, it's still Jan 1 in LA (UTC-8)
      const startDate = '2024-01-01';
      const endDate = new Date('2024-01-02T02:00:00Z');

      // In LA timezone, end date is still Jan 1, so diff should be 0
      const resultLA = getDateDiffInDays(startDate, endDate, 'America/Los_Angeles');
      expect(resultLA).toBe(0);

      // In UTC, it's already Jan 2, so diff should be 1
      const resultUTC = getDateDiffInDays(startDate, endDate, 'UTC');
      expect(resultUTC).toBe(1);
    });

    it('throws error for invalid start date format', () => {
      const endDate = new Date('2024-01-10T00:00:00Z');

      expect(() => {
        getDateDiffInDays('invalid-date', endDate, 'UTC');
      }).toThrow('Invalid start date format');
    });

    it('throws error for invalid month in date', () => {
      const endDate = new Date('2024-01-10T00:00:00Z');

      expect(() => {
        getDateDiffInDays('2024-13-01', endDate, 'UTC');
      }).toThrow('Invalid start date format');
    });

    it('throws error for invalid day in date', () => {
      const endDate = new Date('2024-01-10T00:00:00Z');

      expect(() => {
        getDateDiffInDays('2024-01-32', endDate, 'UTC');
      }).toThrow('Invalid start date format');
    });

    it('throws error for Feb 29 on non-leap year', () => {
      const endDate = new Date('2023-03-10T00:00:00Z');

      expect(() => {
        getDateDiffInDays('2023-02-29', endDate, 'UTC');
      }).toThrow('Invalid start date format');
    });
  });
});
