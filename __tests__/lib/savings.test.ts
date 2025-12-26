import {
  FREQUENCY_DIVISORS,
  calculateDailyRate,
  calculateSavings,
  formatCurrency,
} from '@/lib/savings';

describe('savings utilities', () => {
  describe('FREQUENCY_DIVISORS', () => {
    it('should have correct divisor values', () => {
      expect(FREQUENCY_DIVISORS.daily).toBe(1);
      expect(FREQUENCY_DIVISORS.weekly).toBe(7);
      expect(FREQUENCY_DIVISORS.monthly).toBe(365 / 12);
      expect(FREQUENCY_DIVISORS.yearly).toBe(365);
    });
  });

  describe('calculateDailyRate', () => {
    it('should return correct daily rate for daily frequency', () => {
      expect(calculateDailyRate(10, 'daily')).toBe(10);
    });

    it('should return correct daily rate for weekly frequency', () => {
      expect(calculateDailyRate(70, 'weekly')).toBeCloseTo(10, 2);
    });

    it('should return correct daily rate for monthly frequency', () => {
      // 365/12 ≈ 30.4167 days per month
      expect(calculateDailyRate(365 / 12, 'monthly')).toBeCloseTo(1, 2);
    });

    it('should return correct daily rate for yearly frequency', () => {
      expect(calculateDailyRate(3650, 'yearly')).toBeCloseTo(10, 2);
    });

    it('should handle zero amount', () => {
      expect(calculateDailyRate(0, 'daily')).toBe(0);
    });
  });

  describe('calculateSavings', () => {
    it('should calculate total savings correctly', () => {
      // $10/day for 30 days = $300
      const result = calculateSavings(10, 'daily', 30);
      expect(result.totalSaved).toBeCloseTo(300, 2);
    });

    it('should calculate per-day savings correctly', () => {
      const result = calculateSavings(70, 'weekly', 14);
      // $70/week = $10/day
      expect(result.perDay).toBeCloseTo(10, 2);
    });

    it('should calculate per-week savings correctly', () => {
      const result = calculateSavings(70, 'weekly', 14);
      // $10/day * 7 = $70/week
      expect(result.perWeek).toBeCloseTo(70, 2);
    });

    it('should calculate per-month savings correctly', () => {
      const result = calculateSavings(70, 'weekly', 14);
      // $10/day * (365/12) ≈ $304.17/month
      expect(result.perMonth).toBeCloseTo(10 * (365 / 12), 2);
    });

    it('should handle zero days sober', () => {
      const result = calculateSavings(100, 'daily', 0);
      expect(result.totalSaved).toBe(0);
      expect(result.perDay).toBe(100);
      expect(result.perWeek).toBeCloseTo(700, 2);
      expect(result.perMonth).toBeCloseTo(100 * (365 / 12), 2);
    });

    it('should handle zero amount', () => {
      const result = calculateSavings(0, 'daily', 30);
      expect(result.totalSaved).toBe(0);
      expect(result.perDay).toBe(0);
      expect(result.perWeek).toBe(0);
      expect(result.perMonth).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format whole numbers correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should format decimals correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(10.999)).toBe('$11.00');
    });
  });
});
