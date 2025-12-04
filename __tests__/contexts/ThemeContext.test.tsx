/**
 * @fileoverview Tests for ThemeContext
 *
 * Tests the theme context including:
 * - Provider initialization
 * - Light/dark theme switching
 * - System theme detection
 * - Theme persistence
 * - useTheme hook usage
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Mocks
// =============================================================================

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
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
  <ThemeProvider>{children}</ThemeProvider>
);

// =============================================================================
// Test Suite
// =============================================================================

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    // Note: useColorScheme is mocked in jest.setup.js to return 'light'
  });

  describe('useTheme hook', () => {
    it('returns theme object with all color properties', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBeDefined();
      });

      // Check for essential theme properties
      expect(result.current.theme).toHaveProperty('background');
      expect(result.current.theme).toHaveProperty('surface');
      expect(result.current.theme).toHaveProperty('text');
      expect(result.current.theme).toHaveProperty('textSecondary');
      expect(result.current.theme).toHaveProperty('primary');
      expect(result.current.theme).toHaveProperty('border');
      expect(result.current.theme).toHaveProperty('error');
      expect(result.current.theme).toHaveProperty('success');
    });

    it('provides themeMode, setThemeMode, and isDark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBeDefined();
      });

      expect(typeof result.current.themeMode).toBe('string');
      expect(typeof result.current.setThemeMode).toBe('function');
      expect(typeof result.current.isDark).toBe('boolean');
    });
  });

  describe('theme initialization', () => {
    it('defaults to system theme mode', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('system');
      });
    });

    it('loads saved theme preference from AsyncStorage', async () => {
      mockGetItem.mockResolvedValueOnce('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('dark');
      });

      expect(mockGetItem).toHaveBeenCalledWith('theme_mode');
    });

    it('ignores invalid saved theme preferences', async () => {
      mockGetItem.mockResolvedValueOnce('invalid-theme');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        // Should remain as system (default) since invalid value is ignored
        expect(result.current.themeMode).toBe('system');
      });
    });
  });

  describe('setThemeMode', () => {
    it('updates theme mode to light', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBeDefined();
      });

      await act(async () => {
        await result.current.setThemeMode('light');
      });

      expect(result.current.themeMode).toBe('light');
      expect(mockSetItem).toHaveBeenCalledWith('theme_mode', 'light');
    });

    it('updates theme mode to dark', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBeDefined();
      });

      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      expect(result.current.themeMode).toBe('dark');
      expect(mockSetItem).toHaveBeenCalledWith('theme_mode', 'dark');
    });

    it('updates theme mode to system', async () => {
      mockGetItem.mockResolvedValueOnce('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('dark');
      });

      await act(async () => {
        await result.current.setThemeMode('system');
      });

      expect(result.current.themeMode).toBe('system');
      expect(mockSetItem).toHaveBeenCalledWith('theme_mode', 'system');
    });
  });

  describe('isDark property', () => {
    it('is false when theme mode is light', async () => {
      mockGetItem.mockResolvedValueOnce('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('light');
      });

      expect(result.current.isDark).toBe(false);
    });

    it('is true when theme mode is dark', async () => {
      mockGetItem.mockResolvedValueOnce('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('dark');
      });

      expect(result.current.isDark).toBe(true);
    });

    it('reflects system preference when in system mode', async () => {
      // Note: useColorScheme is mocked in jest.setup.js to return 'light'
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('system');
      });

      // With system mock returning 'light', isDark should be false
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('theme colors', () => {
    it('provides light theme colors when not dark', async () => {
      mockGetItem.mockResolvedValueOnce('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('light');
      });

      // Light theme should have light background
      expect(result.current.theme.background).toBe('#f9fafb');
      expect(result.current.theme.text).toBe('#111827');
    });

    it('provides dark theme colors when dark', async () => {
      mockGetItem.mockResolvedValueOnce('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBe('dark');
      });

      // Dark theme should have dark background
      expect(result.current.theme.background).toBe('#111827');
      expect(result.current.theme.text).toBe('#f9fafb');
    });

    it('includes font family names', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.theme).toBeDefined();
      });

      expect(result.current.theme.fontRegular).toBe('JetBrainsMono-Regular');
      expect(result.current.theme.fontMedium).toBe('JetBrainsMono-Medium');
      expect(result.current.theme.fontSemiBold).toBe('JetBrainsMono-SemiBold');
      expect(result.current.theme.fontBold).toBe('JetBrainsMono-Bold');
    });
  });

  describe('error handling', () => {
    it('handles AsyncStorage getItem errors gracefully', async () => {
      mockGetItem.mockRejectedValueOnce(new Error('Storage read error'));

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should still work with default theme
      await waitFor(() => {
        expect(result.current.themeMode).toBe('system');
      });
    });

    it('handles AsyncStorage setItem errors gracefully', async () => {
      mockSetItem.mockRejectedValueOnce(new Error('Storage write error'));

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.themeMode).toBeDefined();
      });

      // Should not throw - error is caught and logged
      await act(async () => {
        await result.current.setThemeMode('dark');
      });

      // ThemeMode may or may not update depending on implementation
      // The key is that it doesn't throw
    });
  });
});
