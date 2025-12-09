import React from 'react';
import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassView } from '@/components/GlassView';
import { renderWithProviders } from '@/__tests__/test-utils';

// Mock expo-glass-effect - default to unavailable (fallback mode)
jest.mock('expo-glass-effect', () => ({
  GlassView: jest.fn(({ children }) => children),
  isLiquidGlassAvailable: jest.fn(() => false),
}));

// Mock Platform to force iOS for consistent test behavior
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((options: Record<string, unknown>) => options.ios ?? options.default),
  Version: 18,
}));

describe('GlassView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      renderWithProviders(
        <GlassView testID="glass-view">
          <Text>Test Content</Text>
        </GlassView>
      );

      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('applies testID to container', () => {
      renderWithProviders(
        <GlassView testID="my-glass">
          <Text>Content</Text>
        </GlassView>
      );

      expect(screen.getByTestId('my-glass')).toBeTruthy();
    });

    it('applies custom styles', () => {
      renderWithProviders(
        <GlassView testID="styled-glass" style={{ padding: 20, borderRadius: 16 }}>
          <Text>Styled Content</Text>
        </GlassView>
      );

      const container = screen.getByTestId('styled-glass');
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ padding: 20, borderRadius: 16 })])
      );
    });
  });

  describe('fallback behavior (non-iOS 26+)', () => {
    it('renders fallback View when glass is unavailable', () => {
      const { isLiquidGlassAvailable } = require('expo-glass-effect');
      isLiquidGlassAvailable.mockReturnValue(false);

      renderWithProviders(
        <GlassView testID="fallback-glass">
          <Text>Fallback Content</Text>
        </GlassView>
      );

      const container = screen.getByTestId('fallback-glass');
      // Fallback should have semi-transparent background style
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            borderWidth: 1,
          }),
        ])
      );
    });
  });

  describe('props', () => {
    it('defaults effectStyle to regular', () => {
      renderWithProviders(
        <GlassView testID="default-effect">
          <Text>Default</Text>
        </GlassView>
      );

      // Component should render without errors with default props
      expect(screen.getByTestId('default-effect')).toBeTruthy();
    });

    it('accepts effectStyle prop', () => {
      renderWithProviders(
        <GlassView testID="clear-effect" effectStyle="clear">
          <Text>Clear Effect</Text>
        </GlassView>
      );

      expect(screen.getByTestId('clear-effect')).toBeTruthy();
    });

    it('accepts custom tintColor prop', () => {
      renderWithProviders(
        <GlassView testID="tinted-glass" tintColor="rgba(99, 102, 241, 0.1)">
          <Text>Tinted</Text>
        </GlassView>
      );

      expect(screen.getByTestId('tinted-glass')).toBeTruthy();
    });
  });

  describe('native glass behavior (iOS 26+)', () => {
    beforeEach(() => {
      const { isLiquidGlassAvailable, GlassView: MockGlassView } = require('expo-glass-effect');
      isLiquidGlassAvailable.mockReturnValue(true);
      // Reset the mock to track calls
      MockGlassView.mockClear();
    });

    it('uses ExpoGlassView when glass is available', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      renderWithProviders(
        <GlassView testID="native-glass">
          <Text>Native Content</Text>
        </GlassView>
      );

      expect(MockGlassView).toHaveBeenCalled();
    });

    it('passes effectStyle to ExpoGlassView', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      renderWithProviders(
        <GlassView effectStyle="clear">
          <Text>Clear</Text>
        </GlassView>
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.glassEffectStyle).toBe('clear');
    });

    it('passes isInteractive=true to ExpoGlassView', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      renderWithProviders(
        <GlassView>
          <Text>Interactive</Text>
        </GlassView>
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.isInteractive).toBe(true);
    });

    it('uses theme glassTint by default', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      renderWithProviders(
        <GlassView>
          <Text>Themed</Text>
        </GlassView>
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.tintColor).toMatch(/rgba/);
    });

    it('uses custom tintColor when provided', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');
      const customTint = 'rgba(99, 102, 241, 0.2)';

      renderWithProviders(
        <GlassView tintColor={customTint}>
          <Text>Custom Tint</Text>
        </GlassView>
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.tintColor).toBe(customTint);
    });
  });
});
