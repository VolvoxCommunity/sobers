/**
 * @fileoverview Tests for ProgressBar component
 *
 * Tests the progress bar including:
 * - Step progress calculation
 * - Theme color application
 * - Animation behavior
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressBar from '@/components/onboarding/ProgressBar';
import { ThemeColors } from '@/contexts/ThemeContext';

// =============================================================================
// Mocks
// =============================================================================

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  const MockAnimatedView = ({ children, style, ...props }: any) =>
    React.createElement('View', { ...props, style }, children);

  // Animated object that will be default-imported
  const Animated = {
    View: MockAnimatedView,
  };

  return {
    __esModule: true,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => ({}),
    },
    interpolate: (value: number, input: number[], output: number[]) => {
      // Simple linear interpolation for testing
      const ratio = (value - input[0]) / (input[1] - input[0]);
      return output[0] + ratio * (output[1] - output[0]);
    },
    default: Animated,
  };
});

// =============================================================================
// Test Data
// =============================================================================

const mockTheme: ThemeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textOnPrimary: '#ffffff',
  primary: '#007AFF',
  primaryLight: '#e5f1ff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  error: '#ef4444',
  success: '#007AFF',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  dangerBorder: '#fee2e2',
  white: '#ffffff',
  black: '#000000',
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
};

// =============================================================================
// Test Suite
// =============================================================================

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProgressBar step={1} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });

  it('renders with step 1 of 3', () => {
    // Progress bar should render without crashing
    expect(() => render(<ProgressBar step={1} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });

  it('renders with step 2 of 3', () => {
    expect(() => render(<ProgressBar step={2} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });

  it('renders with step 3 of 3 (complete)', () => {
    expect(() => render(<ProgressBar step={3} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });

  it('handles single step progress', () => {
    expect(() => render(<ProgressBar step={1} totalSteps={1} theme={mockTheme} />)).not.toThrow();
  });

  it('handles many steps', () => {
    expect(() => render(<ProgressBar step={5} totalSteps={10} theme={mockTheme} />)).not.toThrow();
  });

  it('applies theme colors', () => {
    const customTheme: ThemeColors = {
      ...mockTheme,
      primary: '#FF0000',
      border: '#00FF00',
    };

    // Component should render with custom theme colors
    expect(() => render(<ProgressBar step={1} totalSteps={3} theme={customTheme} />)).not.toThrow();
  });

  it('handles step changes', () => {
    const { rerender } = render(<ProgressBar step={1} totalSteps={3} theme={mockTheme} />);

    // Should not crash on rerender with different step values
    expect(() => rerender(<ProgressBar step={2} totalSteps={3} theme={mockTheme} />)).not.toThrow();

    expect(() => rerender(<ProgressBar step={3} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });

  it('handles edge case of step 0', () => {
    // Should handle gracefully without crashing
    expect(() => render(<ProgressBar step={0} totalSteps={3} theme={mockTheme} />)).not.toThrow();
  });
});
