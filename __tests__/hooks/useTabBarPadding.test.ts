/**
 * @fileoverview Tests for useTabBarPadding hook
 *
 * Tests the hook's ability to calculate proper tab bar padding
 * across different platforms and with custom padding values.
 */

import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import {
  IOS_TAB_BAR_HEIGHT,
  IOS_TAB_BAR_EXTRA_PADDING,
  ANDROID_TAB_BAR_EXTRA_PADDING,
} from '@/constants/layout';

// =============================================================================
// Mocks
// =============================================================================

// Mock react-native-safe-area-context
let mockBottomInset = 34;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 44,
    bottom: mockBottomInset,
    left: 0,
    right: 0,
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('useTabBarPadding', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    mockBottomInset = 34;
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  describe('iOS', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
    });

    it('returns correct padding with default extra padding', () => {
      const { result } = renderHook(() => useTabBarPadding());

      // iOS: bottomInset + TAB_BAR_HEIGHT + extraPadding
      const expected = mockBottomInset + IOS_TAB_BAR_HEIGHT + IOS_TAB_BAR_EXTRA_PADDING;
      expect(result.current).toBe(expected);
    });

    it('returns correct padding with custom extra padding', () => {
      const customPadding = 32;
      const { result } = renderHook(() => useTabBarPadding(customPadding));

      // iOS: bottomInset + TAB_BAR_HEIGHT + customPadding
      const expected = mockBottomInset + IOS_TAB_BAR_HEIGHT + customPadding;
      expect(result.current).toBe(expected);
    });

    it('returns correct padding with zero bottom inset', () => {
      mockBottomInset = 0;
      const { result } = renderHook(() => useTabBarPadding());

      // iOS: 0 + TAB_BAR_HEIGHT + extraPadding
      const expected = IOS_TAB_BAR_HEIGHT + IOS_TAB_BAR_EXTRA_PADDING;
      expect(result.current).toBe(expected);
    });

    it('returns correct padding with large bottom inset (e.g., iPhone with home indicator)', () => {
      mockBottomInset = 44;
      const { result } = renderHook(() => useTabBarPadding());

      const expected = 44 + IOS_TAB_BAR_HEIGHT + IOS_TAB_BAR_EXTRA_PADDING;
      expect(result.current).toBe(expected);
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
    });

    it('returns correct padding with default extra padding', () => {
      const { result } = renderHook(() => useTabBarPadding());

      // Android: just extraPadding (no bottomInset or tab bar height added)
      expect(result.current).toBe(ANDROID_TAB_BAR_EXTRA_PADDING);
    });

    it('returns correct padding with custom extra padding', () => {
      const customPadding = 48;
      const { result } = renderHook(() => useTabBarPadding(customPadding));

      // Android: just customPadding
      expect(result.current).toBe(customPadding);
    });

    it('ignores bottom inset on Android', () => {
      mockBottomInset = 100;
      const { result } = renderHook(() => useTabBarPadding());

      // Android should ignore bottom inset
      expect(result.current).toBe(ANDROID_TAB_BAR_EXTRA_PADDING);
    });
  });

  describe('web', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });
    });

    it('returns correct padding for web (same as Android behavior)', () => {
      const { result } = renderHook(() => useTabBarPadding());

      // Web uses the else branch (same as Android)
      expect(result.current).toBe(ANDROID_TAB_BAR_EXTRA_PADDING);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
    });

    it('handles zero custom extra padding', () => {
      const { result } = renderHook(() => useTabBarPadding(0));

      // iOS with zero extra padding
      const expected = mockBottomInset + IOS_TAB_BAR_HEIGHT + 0;
      expect(result.current).toBe(expected);
    });

    it('returns memoized value (same reference on re-render with same inputs)', () => {
      const { result, rerender } = renderHook(() => useTabBarPadding());

      const firstValue = result.current;
      rerender({});
      const secondValue = result.current;

      expect(firstValue).toBe(secondValue);
    });
  });
});
