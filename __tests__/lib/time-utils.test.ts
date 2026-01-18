import { getTimeRemaining, formatTimeRemaining, TimeRemaining } from '@/lib/time-utils';

describe('time-utils', () => {
  describe('getTimeRemaining', () => {
    it('returns expired state when date is in the past', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const result = getTimeRemaining(pastDate);

      expect(result.isExpired).toBe(true);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
      expect(result.isExpiringSoon).toBe(false);
    });

    it('calculates days, hours, and minutes correctly', () => {
      // 2 days, 3 hours, 30 minutes from now
      const futureDate = new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000 + 30 * 60 * 1000
      ).toISOString();
      const result = getTimeRemaining(futureDate);

      expect(result.isExpired).toBe(false);
      expect(result.days).toBe(2);
      expect(result.hours).toBe(3);
      expect(result.minutes).toBe(30);
    });

    it('marks as expiring soon when less than 2 days remain (default)', () => {
      // 1 day from now
      const futureDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      const result = getTimeRemaining(futureDate);

      expect(result.isExpiringSoon).toBe(true);
    });

    it('does not mark as expiring soon when 2+ days remain', () => {
      // 3 days from now
      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = getTimeRemaining(futureDate);

      expect(result.isExpiringSoon).toBe(false);
    });

    it('uses custom expiringSoonDays threshold', () => {
      // 2 days from now, with threshold of 3 days
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const result = getTimeRemaining(futureDate, 3);

      expect(result.isExpiringSoon).toBe(true);
    });

    it('handles edge case of exactly now', () => {
      const now = new Date().toISOString();
      const result = getTimeRemaining(now);

      // Should be expired since we're at or past the time
      expect(result.isExpired).toBe(true);
    });
  });

  describe('formatTimeRemaining', () => {
    it('returns "Expired" when expired', () => {
      const time: TimeRemaining = {
        days: 0,
        hours: 0,
        minutes: 0,
        isExpired: true,
        isExpiringSoon: false,
      };
      expect(formatTimeRemaining(time)).toBe('Expired');
    });

    it('formats days and hours in short format', () => {
      const time: TimeRemaining = {
        days: 5,
        hours: 3,
        minutes: 45,
        isExpired: false,
        isExpiringSoon: false,
      };
      expect(formatTimeRemaining(time, 'short')).toBe('5d 3h');
    });

    it('formats hours and minutes when no days in short format', () => {
      const time: TimeRemaining = {
        days: 0,
        hours: 2,
        minutes: 30,
        isExpired: false,
        isExpiringSoon: true,
      };
      expect(formatTimeRemaining(time, 'short')).toBe('2h 30m');
    });

    it('formats minutes only when no hours or days in short format', () => {
      const time: TimeRemaining = {
        days: 0,
        hours: 0,
        minutes: 15,
        isExpired: false,
        isExpiringSoon: true,
      };
      expect(formatTimeRemaining(time, 'short')).toBe('15m');
    });

    it('formats in long format with singular units', () => {
      const time: TimeRemaining = {
        days: 1,
        hours: 1,
        minutes: 1,
        isExpired: false,
        isExpiringSoon: true,
      };
      expect(formatTimeRemaining(time, 'long')).toBe('1 day, 1 hour');
    });

    it('formats in long format with plural units', () => {
      const time: TimeRemaining = {
        days: 3,
        hours: 5,
        minutes: 0,
        isExpired: false,
        isExpiringSoon: false,
      };
      expect(formatTimeRemaining(time, 'long')).toBe('3 days, 5 hours');
    });

    it('includes minutes in long format when no days', () => {
      const time: TimeRemaining = {
        days: 0,
        hours: 2,
        minutes: 30,
        isExpired: false,
        isExpiringSoon: true,
      };
      expect(formatTimeRemaining(time, 'long')).toBe('2 hours, 30 minutes');
    });

    it('returns "Less than a minute" for very short times in long format', () => {
      const time: TimeRemaining = {
        days: 0,
        hours: 0,
        minutes: 0,
        isExpired: false,
        isExpiringSoon: true,
      };
      expect(formatTimeRemaining(time, 'long')).toBe('Less than a minute');
    });

    it('defaults to short format', () => {
      const time: TimeRemaining = {
        days: 2,
        hours: 4,
        minutes: 30,
        isExpired: false,
        isExpiringSoon: false,
      };
      expect(formatTimeRemaining(time)).toBe('2d 4h');
    });
  });
});
