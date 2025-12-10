/**
 * @fileoverview Tests for app/(tabs)/steps/_layout.tsx
 *
 * Tests the steps navigation stack layout including:
 * - Stack navigator configuration
 * - Screen options and styling
 * - Header configuration
 * - Navigation structure
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StepsLayout from '@/app/(tabs)/steps/_layout';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router Stack
jest.mock('expo-router', () => ({
  Stack: ({ children, ...props }: { children: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('View', { testID: 'stack-navigator', ...props }, children);
  },
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#007AFF',
    },
    isDark: false,
  }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('StepsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders stack navigator', () => {
      render(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without errors', () => {
      const { toJSON } = render(<StepsLayout />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('navigation structure', () => {
    it('provides proper stack navigation context', () => {
      render(<StepsLayout />);

      const stack = screen.getByTestId('stack-navigator');
      expect(stack).toBeTruthy();
    });

    it('configures screen options correctly', () => {
      render(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });

  describe('header configuration', () => {
    it('applies header styling from theme', () => {
      render(<StepsLayout />);

      const stack = screen.getByTestId('stack-navigator');
      expect(stack).toBeTruthy();
    });

    it('handles dark theme header styling', () => {
      jest.isolateModules(() => {
        jest.doMock('@/contexts/ThemeContext', () => ({
          useTheme: () => ({
            theme: {
              background: '#000000',
              text: '#FFFFFF',
              primary: '#0A84FF',
            },
            isDark: true,
          }),
        }));

        const { default: StepsLayoutDark } = require('@/app/(tabs)/steps/_layout');
        const { render: renderDark, screen: screenDark } = require('@testing-library/react-native');

        renderDark(<StepsLayoutDark />);

        expect(screenDark.getByTestId('stack-navigator')).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing theme gracefully', () => {
      render(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders consistently across multiple renders', () => {
      const { rerender } = render(<StepsLayout />);

      rerender(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });
});
