/**
 * @fileoverview Tests for app/(app)/(tabs)/program/steps/_layout.tsx
 *
 * Tests the steps navigation stack layout including:
 * - Stack navigator configuration
 * - Screen options and styling
 * - Header configuration
 * - Navigation structure
 * - Program opt-out redirect
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import StepsLayout from '@/app/(app)/(tabs)/program/steps/_layout';

// =============================================================================
// Mocks
// =============================================================================

// Track screenOptions and screen configurations
let mockCapturedScreenOptions: Record<string, unknown> | null = null;
const mockCapturedScreens: { name: string; options?: Record<string, unknown> }[] = [];

let mockShouldShowProgramContent: boolean | undefined = true;
let mockIsLoading = false;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile:
      mockShouldShowProgramContent === undefined
        ? null
        : { show_program_content: mockShouldShowProgramContent },
    loading: mockIsLoading,
  }),
}));

// Mock expo-router Stack with Screen subcomponent
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  // Mock Stack component
  function MockStack({
    children,
    screenOptions,
    ...props
  }: {
    children: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) {
    // Capture screenOptions for assertions
    mockCapturedScreenOptions = screenOptions || null;
    return React.createElement(View, { testID: 'stack-navigator', ...props }, children);
  }
  MockStack.displayName = 'MockStack';

  // Mock Screen component
  function MockScreen({ name, options }: { name: string; options?: Record<string, unknown> }) {
    // Track screen configurations for assertions
    mockCapturedScreens.push({ name, options });
    return React.createElement(View, { testID: `stack-screen-${name}` });
  }
  MockScreen.displayName = 'MockScreen';

  // Attach Screen to Stack
  MockStack.Screen = MockScreen;

  return {
    Stack: MockStack,
    Redirect: ({ href }: { href: string }) =>
      React.createElement(View, { testID: 'redirect', accessibilityLabel: href }),
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('StepsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedScreenOptions = null;
    mockCapturedScreens.length = 0;
    mockShouldShowProgramContent = true;
    mockIsLoading = false;
  });

  describe('rendering', () => {
    it('renders stack navigator', () => {
      renderWithProviders(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without errors', () => {
      const { toJSON } = renderWithProviders(<StepsLayout />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('navigation structure', () => {
    it('configures Stack with headerShown false', () => {
      renderWithProviders(<StepsLayout />);

      expect(mockCapturedScreenOptions).toEqual({ headerShown: false });
    });

    it('registers both index and detail screens', () => {
      renderWithProviders(<StepsLayout />);

      const screenNames = mockCapturedScreens.map((s) => s.name);
      expect(screenNames).toContain('index');
      expect(screenNames).toContain('[id]');
    });

    it('configures detail screen with slide_from_right animation', () => {
      renderWithProviders(<StepsLayout />);

      const detailScreen = mockCapturedScreens.find((s) => s.name === '[id]');
      expect(detailScreen?.options).toEqual({ animation: 'slide_from_right' });
    });
  });

  describe('header configuration', () => {
    it('hides headers globally via screenOptions', () => {
      renderWithProviders(<StepsLayout />);

      expect(mockCapturedScreenOptions?.headerShown).toBe(false);
    });

    it('handles dark theme rendering', () => {
      // The component uses useAuth which is mocked at module level
      // Theme rendering is not affected since no theme values are used
      const { toJSON } = renderWithProviders(<StepsLayout />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('program opt-out', () => {
    it('redirects when program content is disabled', () => {
      mockShouldShowProgramContent = false;
      renderWithProviders(<StepsLayout />);

      expect(screen.getByTestId('redirect')).toBeTruthy();
    });

    it('does not redirect while auth is loading', () => {
      mockShouldShowProgramContent = false;
      mockIsLoading = true;
      renderWithProviders(<StepsLayout />);

      expect(screen.queryByTestId('redirect')).toBeNull();
      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders with mocked theme values', () => {
      renderWithProviders(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders consistently across multiple renders', () => {
      const { rerender } = renderWithProviders(<StepsLayout />);

      rerender(<StepsLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });
});
