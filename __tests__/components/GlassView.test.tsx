import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassView } from '@/components/GlassView';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock expo-glass-effect - default to unavailable (fallback mode)
jest.mock('expo-glass-effect', () => ({
  GlassView: jest.fn(({ children }) => children),
  isLiquidGlassAvailable: jest.fn(() => false),
}));

// Wrapper for components that need ThemeProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('GlassView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <GlassView testID="glass-view">
          <Text>Test Content</Text>
        </GlassView>,
        { wrapper }
      );

      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('applies testID to container', () => {
      render(
        <GlassView testID="my-glass">
          <Text>Content</Text>
        </GlassView>,
        { wrapper }
      );

      expect(screen.getByTestId('my-glass')).toBeTruthy();
    });

    it('applies custom styles', () => {
      render(
        <GlassView testID="styled-glass" style={{ padding: 20, borderRadius: 16 }}>
          <Text>Styled Content</Text>
        </GlassView>,
        { wrapper }
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

      render(
        <GlassView testID="fallback-glass">
          <Text>Fallback Content</Text>
        </GlassView>,
        { wrapper }
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
      render(
        <GlassView testID="default-effect">
          <Text>Default</Text>
        </GlassView>,
        { wrapper }
      );

      // Component should render without errors with default props
      expect(screen.getByTestId('default-effect')).toBeTruthy();
    });

    it('accepts effectStyle prop', () => {
      render(
        <GlassView testID="clear-effect" effectStyle="clear">
          <Text>Clear Effect</Text>
        </GlassView>,
        { wrapper }
      );

      expect(screen.getByTestId('clear-effect')).toBeTruthy();
    });

    it('accepts custom tintColor prop', () => {
      render(
        <GlassView testID="tinted-glass" tintColor="rgba(99, 102, 241, 0.1)">
          <Text>Tinted</Text>
        </GlassView>,
        { wrapper }
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

      render(
        <GlassView testID="native-glass">
          <Text>Native Content</Text>
        </GlassView>,
        { wrapper }
      );

      expect(MockGlassView).toHaveBeenCalled();
    });

    it('passes effectStyle to ExpoGlassView', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      render(
        <GlassView effectStyle="clear">
          <Text>Clear</Text>
        </GlassView>,
        { wrapper }
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.glassEffectStyle).toBe('clear');
    });

    it('passes isInteractive=true to ExpoGlassView', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      render(
        <GlassView>
          <Text>Interactive</Text>
        </GlassView>,
        { wrapper }
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.isInteractive).toBe(true);
    });

    it('uses theme glassTint by default', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');

      render(
        <GlassView>
          <Text>Themed</Text>
        </GlassView>,
        { wrapper }
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.tintColor).toMatch(/rgba/);
    });

    it('uses custom tintColor when provided', () => {
      const { GlassView: MockGlassView } = require('expo-glass-effect');
      const customTint = 'rgba(99, 102, 241, 0.2)';

      render(
        <GlassView tintColor={customTint}>
          <Text>Custom Tint</Text>
        </GlassView>,
        { wrapper }
      );

      expect(MockGlassView).toHaveBeenCalled();
      const callArgs = MockGlassView.mock.calls[0][0];
      expect(callArgs.tintColor).toBe(customTint);
    });
  });
});
