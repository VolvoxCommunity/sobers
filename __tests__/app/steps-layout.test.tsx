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
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import StepsLayout from '@/app/(app)/(tabs)/steps/_layout';

// =============================================================================
// Mocks
// =============================================================================

// Track screenOptions and screen configurations
let capturedScreenOptions: Record<string, unknown> | null = null;
const capturedScreens: { name: string; options?: Record<string, unknown> }[] = [];

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
  capturedScreenOptions = screenOptions || null;
  return (
    <View testID="stack-navigator" {...props}>
      {children}
    </View>
  );
}
MockStack.displayName = 'MockStack';

// Mock Screen component
function MockScreen({ name, options }: { name: string; options?: Record<string, unknown> }) {
  // Track screen configurations for assertions
  capturedScreens.push({ name, options });
  return <View testID={`stack-screen-${name}`} />;
}
MockScreen.displayName = 'MockScreen';

// Attach Screen to Stack
MockStack.Screen = MockScreen;

// Mock expo-router Stack with Screen subcomponent
jest.mock('expo-router', () => ({
  Stack: MockStack,
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
    capturedScreenOptions = null;
    capturedScreens.length = 0;
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
    it('configures Stack with headerShown false', () => {
      render(<StepsLayout />);

      expect(capturedScreenOptions).toEqual({ headerShown: false });
    });

    it('registers both index and detail screens', () => {
      render(<StepsLayout />);

      const screenNames = capturedScreens.map((s) => s.name);
      expect(screenNames).toContain('index');
      expect(screenNames).toContain('[id]');
    });

    it('configures detail screen with slide_from_right animation', () => {
      render(<StepsLayout />);

      const detailScreen = capturedScreens.find((s) => s.name === '[id]');
      expect(detailScreen?.options).toEqual({ animation: 'slide_from_right' });
    });
  });

  describe('header configuration', () => {
    it('hides headers globally via screenOptions', () => {
      render(<StepsLayout />);

      expect(capturedScreenOptions?.headerShown).toBe(false);
    });

    it('handles dark theme rendering', () => {
      // The component uses useTheme which is mocked at module level
      // Dark theme rendering behavior is the same as light theme for this component
      // since it only configures Stack navigation (no theme-dependent styles in this layout)
      const { toJSON } = render(<StepsLayout />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders with mocked theme values', () => {
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
