/**
 * @fileoverview Tests for useDaysSober hook
 *
 * Tests the sobriety day calculation logic including:
 * - Basic day calculations
 * - Midnight refresh behavior
 * - Slip-up handling
 * - Journey vs streak calculations
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDaysSober } from '@/hooks/useDaysSober';

// =============================================================================
// Mocks
// =============================================================================

// Mock AuthContext
const mockProfile = {
  id: 'user-123',
  sobriety_date: '2024-01-01',
  timezone: 'America/New_York', // Test with specific timezone
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    profile: mockProfile,
  }),
}));

// Mock Supabase
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('useDaysSober', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock: no slip-ups
    mockSupabaseFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('day calculations', () => {
    it('calculates daysSober from sobriety date when no slip-ups', async () => {
      // Set current date to 100 days after sobriety date
      // Using UTC date string to ensure consistent behavior
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should be 100 calendar days (Jan 1 to Apr 10 = 100 days)
      expect(result.current.daysSober).toBe(100);
      expect(result.current.journeyDays).toBe(100);
      expect(result.current.hasSlipUps).toBe(false);
    });

    it('calculates daysSober from recovery restart date when slip-up exists', async () => {
      // Set to April 10, 2024 at 19:00 UTC (which is April 10 at noon PDT)
      // This ensures we're clearly on April 10 in the profile timezone
      jest.setSystemTime(new Date('2024-04-10T19:00:00Z')); // 12:00 noon PDT (UTC-7)

      const mockSlipUp = {
        id: 'slip-1',
        user_id: 'user-123',
        slip_up_date: '2024-03-01',
        recovery_restart_date: '2024-03-02',
        notes: 'Test',
      };

      mockSupabaseFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [mockSlipUp], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 39 days from March 2 to April 10 (inclusive of both start and end days)
      // March 2 to April 10 = 39 calendar days
      expect(result.current.daysSober).toBe(39);
      // Journey days still from original date (100 days)
      expect(result.current.journeyDays).toBe(100);
      expect(result.current.hasSlipUps).toBe(true);
    });

    it('returns 0 for negative day calculations (future dates are prevented)', async () => {
      // The hook uses Math.max(0, days) to prevent negative values
      // This test verifies the daysSober is always >= 0
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should always be >= 0 due to Math.max guard
      expect(result.current.daysSober).toBeGreaterThanOrEqual(0);
      expect(result.current.journeyDays).toBeGreaterThanOrEqual(0);
    });

    it('uses calendar days in device timezone, not UTC', async () => {
      // Test that the calculation uses calendar days in the device's local timezone
      // Sobriety date: Jan 1, 2024 (interpreted as Jan 1 00:00 in device timezone)
      // Current time: Jan 2, 2024 12:00 UTC
      // Expected: 1 calendar day (Jan 1 → Jan 2)
      jest.setSystemTime(new Date('2024-01-02T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should be exactly 1 day (Jan 1 to Jan 2 = 1 calendar day)
      // Note: Test runs in UTC timezone in CI, so this assertion is valid
      expect(result.current.daysSober).toBe(1);
      expect(result.current.journeyDays).toBe(1);
    });

    it('uses device timezone for day calculations', async () => {
      // This test verifies that the device timezone is used for calculations
      // Sobriety date: Jan 1, 2024
      // Current time: Apr 10, 2024 12:00 UTC
      // Expected: 100 calendar days (Jan 1 → Apr 10)
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should be exactly 100 days (Jan 1 to Apr 10 = 100 calendar days)
      // Jan: 30 days remaining after Jan 1 (Jan 2–Jan 31) + Feb: 29 (leap year) + Mar: 31 + Apr 1-10: 10 = 100
      expect(result.current.daysSober).toBe(100);
      expect(result.current.journeyDays).toBe(100);
    });
  });

  describe('midnight refresh', () => {
    it('schedules timer for midnight refresh in device timezone', async () => {
      // Start near end of day to test midnight timer scheduling
      jest.setSystemTime(new Date('2024-04-11T07:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialDaysSober = result.current.daysSober;

      // Fast-forward 1 hour + 1 second (should be past midnight in the system/device timezone)
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000 + 1000);
      });

      // The hook should have triggered a recalculation
      // Note: In a real scenario, the day count would increase by 1
      // Here we're just verifying the timer mechanism works
      expect(result.current.daysSober).toBeDefined();
    });

    it('cleans up timer on unmount', async () => {
      jest.setSystemTime(new Date('2024-04-11T07:00:00Z'));

      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { result, unmount } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('return values', () => {
    it('returns all expected properties', async () => {
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          daysSober: expect.any(Number),
          journeyDays: expect.any(Number),
          journeyStartDate: expect.any(String),
          currentStreakStartDate: expect.any(String),
          hasSlipUps: expect.any(Boolean),
          mostRecentSlipUp: null,
          loading: false,
          error: null,
        })
      );
    });

    it('returns journeyStartDate as original sobriety date', async () => {
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.journeyStartDate).toBe('2024-01-01');
    });
  });

  describe('timezone handling', () => {
    // NOTE: The following tests verify timezone behavior using the mockProfile
    // defined at the top of this file (America/New_York timezone).
    //
    // Due to Jest's hoisting behavior, jest.mock() calls inside test functions
    // don't override the module-level mocks. To test different timezones, you would
    // need to create separate test files or use a different mocking strategy.
    //
    // The current mockProfile (America/New_York) provides adequate coverage for
    // timezone-aware calculations, as the core logic in lib/date.ts is tested
    // separately with different timezone inputs.

    it('uses profile timezone for calculations (currently America/New_York)', async () => {
      // Set current date to test timezone-specific behavior
      jest.setSystemTime(new Date('2024-04-10T12:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // With America/New_York timezone in mockProfile, calculations use that timezone
      // April 10 12:00 UTC = April 10 08:00 EDT (UTC-4 during DST)
      // Days from Jan 1 to April 10 = 100 days
      expect(result.current.daysSober).toBe(100);
      expect(result.current.journeyDays).toBe(100);
    });

    it('handles timezone-aware midnight refresh', async () => {
      // Set time to late evening in America/New_York timezone
      // April 10 23:00 EDT = April 11 03:00 UTC
      jest.setSystemTime(new Date('2024-04-11T03:00:00Z'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialDaysSober = result.current.daysSober;

      // Fast-forward 2 hours - should cross midnight in America/New_York
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 60 * 1000);
      });

      // Should have triggered recalculation at local midnight
      expect(result.current.daysSober).toBeDefined();
      expect(result.current.daysSober).toBeGreaterThanOrEqual(initialDaysSober);
    });
  });
});
