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
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import StepsLayout from '@/app/(tabs)/steps/_layout';

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

      expect(capturedScreenOptions).toEqual({ headerShown: false });
    });

    it('registers both index and detail screens', () => {
      renderWithProviders(<StepsLayout />);

      const screenNames = capturedScreens.map((s) => s.name);
      expect(screenNames).toContain('index');
      expect(screenNames).toContain('[id]');
    });

    it('configures detail screen with slide_from_right animation', () => {
      renderWithProviders(<StepsLayout />);

      const detailScreen = capturedScreens.find((s) => s.name === '[id]');
      expect(detailScreen?.options).toEqual({ animation: 'slide_from_right' });
    });
  });

  describe('header configuration', () => {
    it('hides headers globally via screenOptions', () => {
      renderWithProviders(<StepsLayout />);

      expect(capturedScreenOptions?.headerShown).toBe(false);
    });

    it('handles dark theme rendering', () => {
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

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { default: StepsLayoutDark } = require('@/app/(tabs)/steps/_layout');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { render: renderDark, screen: screenDark } = require('@testing-library/react-native');

        renderDark(<StepsLayoutDark />);

        expect(screenDark.getByTestId('stack-navigator')).toBeTruthy();
      });
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
