/**
 * @fileoverview Tests for DevToolsContext
 *
 * Tests the developer tools context including:
 * - Provider initialization with default values
 * - Verbose logging toggle
 * - Sobriety date override functionality
 * - Time travel (date offset) functionality
 * - Analytics debug toggle
 * - getCurrentDate with time travel applied
 * - resetAll functionality
 * - useDevTools hook behavior in dev/production modes
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { DevToolsProvider, useDevTools } from '@/contexts/DevToolsContext';

// =============================================================================
// Mocks
// =============================================================================

const mockSetVerboseLogging = jest.fn();

jest.mock('@/lib/logger', () => ({
  setVerboseLogging: (...args: unknown[]) => mockSetVerboseLogging(...args),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    STORAGE: 'storage',
  },
}));

// =============================================================================
// Helper
// =============================================================================

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DevToolsProvider>{children}</DevToolsProvider>
);

// =============================================================================
// Test Suite
// =============================================================================

describe('DevToolsContext', () => {
  // Store original __DEV__ value
  const originalDev = global.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    // Enable __DEV__ mode for most tests
    global.__DEV__ = true;
    // Reset environment variable
    delete process.env.EXPO_PUBLIC_ANALYTICS_DEBUG;
  });

  afterEach(() => {
    // Restore original __DEV__ value
    global.__DEV__ = originalDev;
  });

  describe('DevToolsProvider', () => {
    describe('initialization', () => {
      it('initializes with default values', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        expect(result.current.verboseLogging).toBe(true);
        expect(result.current.sobrietyDateOverride).toBeNull();
        expect(result.current.timeTravelDays).toBe(0);
        expect(result.current.analyticsDebug).toBe(false);
      });

      it('initializes analyticsDebug to true when env var is set', () => {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';

        const { result } = renderHook(() => useDevTools(), { wrapper });

        expect(result.current.analyticsDebug).toBe(true);
      });

      it('syncs verbose logging with logger on mount', () => {
        renderHook(() => useDevTools(), { wrapper });

        expect(mockSetVerboseLogging).toHaveBeenCalledWith(true);
      });
    });

    describe('setVerboseLogging', () => {
      it('updates verbose logging state', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setVerboseLogging(false);
        });

        expect(result.current.verboseLogging).toBe(false);
      });

      it('syncs with logger module when changed', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });
        mockSetVerboseLogging.mockClear();

        act(() => {
          result.current.setVerboseLogging(false);
        });

        expect(mockSetVerboseLogging).toHaveBeenCalledWith(false);
      });
    });

    describe('setSobrietyDateOverride', () => {
      it('sets sobriety date override', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setSobrietyDateOverride('2024-01-15');
        });

        expect(result.current.sobrietyDateOverride).toBe('2024-01-15');
      });

      it('clears sobriety date override when set to null', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setSobrietyDateOverride('2024-01-15');
        });
        act(() => {
          result.current.setSobrietyDateOverride(null);
        });

        expect(result.current.sobrietyDateOverride).toBeNull();
      });
    });

    describe('setTimeTravelDays', () => {
      it('sets positive time travel days', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setTimeTravelDays(30);
        });

        expect(result.current.timeTravelDays).toBe(30);
      });

      it('sets negative time travel days (travel to past)', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setTimeTravelDays(-7);
        });

        expect(result.current.timeTravelDays).toBe(-7);
      });
    });

    describe('setAnalyticsDebug', () => {
      it('enables analytics debug mode', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setAnalyticsDebug(true);
        });

        expect(result.current.analyticsDebug).toBe(true);
      });

      it('disables analytics debug mode', () => {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setAnalyticsDebug(false);
        });

        expect(result.current.analyticsDebug).toBe(false);
      });
    });

    describe('getCurrentDate', () => {
      it('returns current date when time travel is zero', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });
        const beforeCall = new Date();

        const currentDate = result.current.getCurrentDate();

        const afterCall = new Date();
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(currentDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });

      it('returns future date when time travel days is positive', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setTimeTravelDays(30);
        });

        // Use setDate() to match the implementation (handles DST correctly)
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 30);

        const currentDate = result.current.getCurrentDate();

        // Compare timestamps with 5 second tolerance for test execution time
        expect(Math.abs(currentDate.getTime() - expectedDate.getTime())).toBeLessThanOrEqual(5000);
      });

      it('returns past date when time travel days is negative', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setTimeTravelDays(-7);
        });

        // Use setDate() to match the implementation (handles DST correctly)
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() - 7);

        const currentDate = result.current.getCurrentDate();

        // Compare timestamps with 5 second tolerance for test execution time
        expect(Math.abs(currentDate.getTime() - expectedDate.getTime())).toBeLessThanOrEqual(5000);
      });
    });

    describe('resetAll', () => {
      it('resets all settings to defaults', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        // Modify all settings
        act(() => {
          result.current.setVerboseLogging(false);
          result.current.setSobrietyDateOverride('2024-01-15');
          result.current.setTimeTravelDays(30);
          result.current.setAnalyticsDebug(true);
        });

        // Verify modifications
        expect(result.current.verboseLogging).toBe(false);
        expect(result.current.sobrietyDateOverride).toBe('2024-01-15');
        expect(result.current.timeTravelDays).toBe(30);
        expect(result.current.analyticsDebug).toBe(true);

        // Reset all
        act(() => {
          result.current.resetAll();
        });

        // Verify defaults restored
        expect(result.current.verboseLogging).toBe(true);
        expect(result.current.sobrietyDateOverride).toBeNull();
        expect(result.current.timeTravelDays).toBe(0);
        expect(result.current.analyticsDebug).toBe(false);
      });

      it('respects EXPO_PUBLIC_ANALYTICS_DEBUG when resetting', () => {
        process.env.EXPO_PUBLIC_ANALYTICS_DEBUG = 'true';
        const { result } = renderHook(() => useDevTools(), { wrapper });

        act(() => {
          result.current.setAnalyticsDebug(false);
        });

        act(() => {
          result.current.resetAll();
        });

        expect(result.current.analyticsDebug).toBe(true);
      });
    });
  });

  describe('useDevTools hook', () => {
    describe('in development mode (__DEV__ = true)', () => {
      beforeEach(() => {
        global.__DEV__ = true;
      });

      it('returns context values when provider is present', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        expect(result.current).toHaveProperty('verboseLogging');
        expect(result.current).toHaveProperty('setVerboseLogging');
        expect(result.current).toHaveProperty('sobrietyDateOverride');
        expect(result.current).toHaveProperty('setSobrietyDateOverride');
        expect(result.current).toHaveProperty('timeTravelDays');
        expect(result.current).toHaveProperty('setTimeTravelDays');
        expect(result.current).toHaveProperty('analyticsDebug');
        expect(result.current).toHaveProperty('setAnalyticsDebug');
        expect(result.current).toHaveProperty('getCurrentDate');
        expect(result.current).toHaveProperty('resetAll');
      });

      it('returns functional setters', () => {
        const { result } = renderHook(() => useDevTools(), { wrapper });

        expect(typeof result.current.setVerboseLogging).toBe('function');
        expect(typeof result.current.setSobrietyDateOverride).toBe('function');
        expect(typeof result.current.setTimeTravelDays).toBe('function');
        expect(typeof result.current.setAnalyticsDebug).toBe('function');
        expect(typeof result.current.getCurrentDate).toBe('function');
        expect(typeof result.current.resetAll).toBe('function');
      });
    });

    describe('in production mode (__DEV__ = false)', () => {
      beforeEach(() => {
        global.__DEV__ = false;
      });

      it('returns no-op defaults when context is not available', () => {
        // Render without provider to simulate production behavior
        const { result } = renderHook(() => useDevTools());

        expect(result.current.verboseLogging).toBe(false);
        expect(result.current.sobrietyDateOverride).toBeNull();
        expect(result.current.timeTravelDays).toBe(0);
        expect(result.current.analyticsDebug).toBe(false);
      });

      it('returns no-op setters that do nothing', () => {
        const { result } = renderHook(() => useDevTools());

        // These should not throw
        expect(() => result.current.setVerboseLogging(true)).not.toThrow();
        expect(() => result.current.setSobrietyDateOverride('2024-01-15')).not.toThrow();
        expect(() => result.current.setTimeTravelDays(30)).not.toThrow();
        expect(() => result.current.setAnalyticsDebug(true)).not.toThrow();
        expect(() => result.current.resetAll()).not.toThrow();

        // Values should remain unchanged (no-ops)
        expect(result.current.verboseLogging).toBe(false);
        expect(result.current.sobrietyDateOverride).toBeNull();
        expect(result.current.timeTravelDays).toBe(0);
        expect(result.current.analyticsDebug).toBe(false);
      });

      it('returns real current date from getCurrentDate', () => {
        const { result } = renderHook(() => useDevTools());
        const beforeCall = new Date();

        const currentDate = result.current.getCurrentDate();

        const afterCall = new Date();
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(currentDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
      });
    });

    describe('without provider in dev mode', () => {
      beforeEach(() => {
        global.__DEV__ = true;
      });

      it('returns no-op defaults when provider is missing', () => {
        // Render without wrapper to simulate missing provider
        const { result } = renderHook(() => useDevTools());

        expect(result.current.verboseLogging).toBe(false);
        expect(result.current.sobrietyDateOverride).toBeNull();
        expect(result.current.timeTravelDays).toBe(0);
        expect(result.current.analyticsDebug).toBe(false);
      });
    });
  });

  describe('context memoization', () => {
    it('provides stable function references', () => {
      const { result, rerender } = renderHook(() => useDevTools(), { wrapper });

      const setVerboseLogging1 = result.current.setVerboseLogging;
      const setSobrietyDateOverride1 = result.current.setSobrietyDateOverride;
      const setTimeTravelDays1 = result.current.setTimeTravelDays;
      const setAnalyticsDebug1 = result.current.setAnalyticsDebug;

      rerender({});

      // State setters should be stable (from useState)
      expect(result.current.setVerboseLogging).toBe(setVerboseLogging1);
      expect(result.current.setSobrietyDateOverride).toBe(setSobrietyDateOverride1);
      expect(result.current.setTimeTravelDays).toBe(setTimeTravelDays1);
      expect(result.current.setAnalyticsDebug).toBe(setAnalyticsDebug1);
    });

    it('memoizes getCurrentDate based on timeTravelDays', () => {
      const { result, rerender } = renderHook(() => useDevTools(), { wrapper });

      const getCurrentDate1 = result.current.getCurrentDate;
      rerender({});
      const getCurrentDate2 = result.current.getCurrentDate;

      // Should be the same reference if timeTravelDays hasn't changed
      expect(getCurrentDate1).toBe(getCurrentDate2);

      // Change timeTravelDays
      act(() => {
        result.current.setTimeTravelDays(5);
      });

      const getCurrentDate3 = result.current.getCurrentDate;

      // Should be different reference after timeTravelDays changes
      expect(getCurrentDate3).not.toBe(getCurrentDate1);
    });

    it('memoizes resetAll function', () => {
      const { result, rerender } = renderHook(() => useDevTools(), { wrapper });

      const resetAll1 = result.current.resetAll;
      rerender({});
      const resetAll2 = result.current.resetAll;

      expect(resetAll1).toBe(resetAll2);
    });
  });
});
