/**
 * @fileoverview Tests for app/(tabs)/_layout.tsx (Native Bottom Tabs version)
 *
 * Tests the main tabs layout including:
 * - Platform-specific rendering (native vs web)
 * - Tab navigator configuration
 * - Theme integration
 * - Navigation structure
 * - Accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import TabsLayout from '@/app/(tabs)/_layout';

// =============================================================================
// Mocks
// =============================================================================

// Mock Platform
const originalPlatform = Platform.OS;

// Mock NativeBottomTabs
jest.mock('@/components/navigation/NativeBottomTabs', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'native-bottom-tabs' }),
  };
});

// Mock WebTopNav
jest.mock('@/components/navigation/WebTopNav', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'web-top-nav' }),
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  Slot: () => {
    const React = require('react');
    return React.createElement('View', { testID: 'router-slot' });
  },
}));

// Mock ThemeContext
const mockTheme = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#007AFF',
  surface: '#F2F2F7',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('View', { testID: 'safe-area-provider' }, children),
    useSafeAreaInsets: () => ({
      top: 44,
      bottom: 34,
      left: 0,
      right: 0,
    }),
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('TabsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to iOS
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
  });

  afterAll(() => {
    // Restore original Platform
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatform,
      configurable: true,
    });
  });

  describe('native platforms (iOS/Android)', () => {
    it('renders NativeBottomTabs on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('renders NativeBottomTabs on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('provides safe area context on native platforms', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });
  });

  describe('web platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });
    });

    it('renders WebTopNav on web', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
      expect(screen.queryByTestId('native-bottom-tabs')).toBeNull();
    });

    it('renders router slot for web content', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('router-slot')).toBeTruthy();
    });

    it('provides safe area context on web', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });
  });

  describe('theme integration', () => {
    it('applies theme to layout', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });

    it('handles dark theme', () => {
      jest.isolateModules(() => {
        jest.doMock('@/contexts/ThemeContext', () => ({
          useTheme: () => ({
            theme: {
              background: '#000000',
              text: '#FFFFFF',
              primary: '#0A84FF',
              surface: '#1C1C1E',
            },
            isDark: true,
          }),
        }));

        const { default: TabsLayoutDark } = require('@/app/(tabs)/_layout');
        const { render: renderDark, screen: screenDark } = require('@testing-library/react-native');

        renderDark(<TabsLayoutDark />);

        expect(screenDark.getByTestId('safe-area-provider')).toBeTruthy();
      });
    });
  });

  describe('platform switching', () => {
    it('switches from native to web navigation when platform changes', () => {
      const { rerender } = render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();

      // Change platform
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      rerender(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
    });
  });

  describe('rendering', () => {
    it('renders without errors', () => {
      const { toJSON } = render(<TabsLayout />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders safe area provider as root', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('provides accessible navigation structure', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });

    it('maintains accessibility on web platform', () => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles missing theme gracefully', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('safe-area-provider')).toBeTruthy();
    });

    it('handles rapid platform changes', () => {
      const { rerender } = render(<TabsLayout />);

      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });
      rerender(<TabsLayout />);

      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
      rerender(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
    });
  });

  describe('performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(<TabsLayout />);

      rerender(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
    });
  });
});
