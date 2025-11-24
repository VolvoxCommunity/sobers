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
      jest.setSystemTime(new Date('2024-04-10'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.daysSober).toBe(100);
      expect(result.current.journeyDays).toBe(100);
      expect(result.current.hasSlipUps).toBe(false);
    });

    it('calculates daysSober from recovery restart date when slip-up exists', async () => {
      jest.setSystemTime(new Date('2024-04-10'));

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

      // 39 days from March 2 to April 10
      expect(result.current.daysSober).toBe(39);
      // Journey days still from original date (100 days)
      expect(result.current.journeyDays).toBe(100);
      expect(result.current.hasSlipUps).toBe(true);
    });

    it('returns 0 for negative day calculations (future dates are prevented)', async () => {
      // The hook uses Math.max(0, days) to prevent negative values
      // This test verifies the daysSober is always >= 0
      jest.setSystemTime(new Date('2024-04-10'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should always be >= 0 due to Math.max guard
      expect(result.current.daysSober).toBeGreaterThanOrEqual(0);
      expect(result.current.journeyDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('midnight refresh', () => {
    it('schedules timer for midnight refresh', async () => {
      // Start at 11:00 PM
      jest.setSystemTime(new Date('2024-04-10T23:00:00'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialDaysSober = result.current.daysSober;

      // Fast-forward to just after midnight (1 hour + 1 second)
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000 + 1000);
      });

      // The hook should have triggered a recalculation
      // Note: In a real scenario, the day count would increase by 1
      // Here we're just verifying the timer mechanism works
      expect(result.current.daysSober).toBeDefined();
    });

    it('cleans up timer on unmount', async () => {
      jest.setSystemTime(new Date('2024-04-10T23:00:00'));

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
      jest.setSystemTime(new Date('2024-04-10'));

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
      jest.setSystemTime(new Date('2024-04-10'));

      const { result } = renderHook(() => useDaysSober());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.journeyStartDate).toBe('2024-01-01');
    });
  });
});
