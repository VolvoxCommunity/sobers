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

// Mock expo-blur - pass through tint and intensity for testing
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, intensity, tint, style, ...props }: any) =>
      React.createElement(
        View,
        { testID: 'blur-view', style, intensity, tint, ...props },
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
      expect(getByTestId('blur-view')).toBeTruthy();
    });

    it('renders BlurView with light tint in light mode', () => {
      mockUseTheme.mockReturnValue({
        isDark: false,
        theme: { surface: '#ffffff' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.props.tint).toBe('light');
    });

    it('renders BlurView with dark tint in dark mode', () => {
      mockUseTheme.mockReturnValue({
        isDark: true,
        theme: { surface: '#1a1a1a' },
      });

      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('blur-view');
      expect(blurView).toBeTruthy();
      expect(blurView.props.tint).toBe('dark');
    });

    it('renders BlurView with correct intensity', () => {
      const { getByTestId } = render(<TabBarBackground />);
      const blurView = getByTestId('blur-view');
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

    it('renders solid View on Android (no blur)', () => {
      const { queryByTestId, getByTestId } = render(<TabBarBackground />);
      // Android should NOT render BlurView - it uses a solid View instead
      expect(queryByTestId('blur-view')).toBeNull();
      // Android should render its dedicated View
      expect(getByTestId('tab-bar-background-android')).toBeTruthy();
    });

    it('uses theme surface color for Android background in light mode', () => {
      const lightSurface = '#f5f5f5';
      mockUseTheme.mockReturnValue({
        isDark: false,
        theme: { surface: lightSurface },
      });

      const { queryByTestId, getByTestId } = render(<TabBarBackground />);
      // Android should NOT render BlurView
      expect(queryByTestId('blur-view')).toBeNull();
      // Verify the background color matches theme.surface
      const androidView = getByTestId('tab-bar-background-android');
      expect(androidView.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: lightSurface })])
      );
    });

    it('uses theme surface color for Android background in dark mode', () => {
      const darkSurface = '#1a1a1a';
      mockUseTheme.mockReturnValue({
        isDark: true,
        theme: { surface: darkSurface },
      });

      const { queryByTestId, getByTestId } = render(<TabBarBackground />);
      // Android should NOT render BlurView regardless of dark mode
      expect(queryByTestId('blur-view')).toBeNull();
      // Verify the background color matches theme.surface
      const androidView = getByTestId('tab-bar-background-android');
      expect(androidView.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: darkSurface })])
      );
    });
  });
});
