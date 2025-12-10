/**
 * @fileoverview Tests for TabBarBackground component
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import TabBarBackground from '@/components/navigation/TabBarBackground';

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: {
      surface: '#ffffff',
    },
  }),
}));

// Mock expo-blur
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, intensity, tint, style, ...props }: any) =>
      React.createElement(View, { testID: 'blur-view', style, ...props }, children),
  };
});

describe('TabBarBackground', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    // Restore original Platform.OS
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

    it('renders BlurView on iOS', () => {
      const { getByTestId } = render(<TabBarBackground />);
      expect(getByTestId('blur-view')).toBeTruthy();
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
    });

    it('renders solid View on Android', () => {
      const { queryByTestId, UNSAFE_root } = render(<TabBarBackground />);
      // Should not have BlurView on Android
      expect(queryByTestId('blur-view')).toBeNull();
      // Should render a View
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
