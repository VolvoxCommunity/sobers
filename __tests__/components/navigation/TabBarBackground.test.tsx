/**
 * @fileoverview Tests for TabBarBackground component
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import TabBarBackground from '@/components/navigation/TabBarBackground';

// Mock ThemeContext - default to light mode
const mockUseTheme = jest.fn(() => ({
  isDark: false,
  theme: {
    surface: '#ffffff',
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock expo-blur - pass through tint, intensity, and testID for testing
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, intensity, tint, style, testID, ...props }: any) =>
      React.createElement(
        View,
        { testID: testID ?? 'blur-view', style, intensity, tint, ...props },
        children
      ),
  };
});

describe('TabBarBackground', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    // Reset to light mode by default
    mockUseTheme.mockReturnValue({
      isDark: false,
      theme: {
        surface: '#ffffff',
      },
    });
  });

  afterEach(() => {
    // Restore original Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
    jest.clearAllMocks();
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
      expect(getByTestId('tab-bar-blur-view')).toBeTruthy();
    });

    it('renders BlurView with light tint in light mode', () => {
      mockUseTheme.mockReturnValue({
        isDark: false,
        theme: { surface: '#ffffff' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('tab-bar-blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.props.tint).toBe('light');
    });

    it('renders BlurView with dark tint in dark mode', () => {
      mockUseTheme.mockReturnValue({
        isDark: true,
        theme: { surface: '#1a1a1a' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('tab-bar-blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.props.tint).toBe('dark');
    });

    it('renders BlurView with correct intensity', () => {
      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('tab-bar-blur-view');
      expect(blurView.props.intensity).toBe(80);
    });
  });

  describe('Android', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
    });

    it('renders BlurView on Android (tinted overlay fallback)', () => {
      const { getByTestId } = render(<TabBarBackground />);
      expect(getByTestId('tab-bar-blur-view')).toBeTruthy();
    });

    it('renders BlurView with light tint in light mode on Android', () => {
      mockUseTheme.mockReturnValue({
        isDark: false,
        theme: { surface: '#ffffff' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('tab-bar-blur-view');
      expect(blurView.props.tint).toBe('light');
      expect(blurView.props.intensity).toBe(80);
    });

    it('renders BlurView with dark tint in dark mode on Android', () => {
      mockUseTheme.mockReturnValue({
        isDark: true,
        theme: { surface: '#1a1a1a' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('tab-bar-blur-view');
      expect(blurView.props.tint).toBe('dark');
      expect(blurView.props.intensity).toBe(80);
    });
  });

  describe('cross-platform consistency', () => {
    it('uses the same BlurView component on both iOS and Android', () => {
      // Render on iOS
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });
      const { getByTestId: getByTestIdIOS } = render(<TabBarBackground />);
      const iosBlurView = getByTestIdIOS('tab-bar-blur-view');

      // Render on Android
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });
      const { getByTestId: getByTestIdAndroid } = render(<TabBarBackground />);
      const androidBlurView = getByTestIdAndroid('tab-bar-blur-view');

      // Both should use the same tint and intensity
      expect(iosBlurView.props.tint).toBe(androidBlurView.props.tint);
      expect(iosBlurView.props.intensity).toBe(androidBlurView.props.intensity);
    });

    it('has a testID for identification', () => {
      const { getByTestId } = render(<TabBarBackground />);
      expect(getByTestId('tab-bar-blur-view')).toBeTruthy();
    });
  });
});
