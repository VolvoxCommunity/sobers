/**
 * @fileoverview Tests for components/navigation/NativeBottomTabs.tsx
 *
 * Tests the native bottom tabs navigation component export.
 * Note: This component is a wrapper around react-native-bottom-tabs that gets
 * integrated with expo-router via withLayoutContext. The actual tab rendering
 * and behavior is tested in the tabs-layout tests.
 */

import React from 'react';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router's withLayoutContext to return a renderable component
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    withLayoutContext: <T, U, V>(_: U) => {
      // Return a mock component that renders its children
      const MockComponent = ({ children, ...props }: { children?: React.ReactNode }) =>
        React.createElement(View, { testID: 'native-tabs-layout', ...props }, children);
      MockComponent.displayName = 'MockNativeTabs';
      const MockScreen = ({ name }: { name: string }) =>
        React.createElement(View, { testID: `screen-${name}` });
      MockScreen.displayName = 'MockScreen';
      MockComponent.Screen = MockScreen;
      return MockComponent;
    },
  };
});

// Mock @bottom-tabs/react-navigation
jest.mock('@bottom-tabs/react-navigation', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createNativeBottomTabNavigator: () => ({
      Navigator: ({ children, ...props }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: 'bottom-tabs-navigator', ...props }, children),
      Screen: ({ name }: { name: string }) =>
        React.createElement(View, { testID: `tab-screen-${name}` }),
    }),
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ParamListBase: {},
  TabNavigationState: {},
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('NativeBottomTabs', () => {
  describe('module exports', () => {
    it('exports NativeTabs component', () => {
      // Import the actual module (with mocks in place)
      const module = require('@/components/navigation/NativeBottomTabs');

      expect(module.NativeTabs).toBeDefined();
      expect(typeof module.NativeTabs).toBe('function');
    });

    it('exports NativeBottomTabNavigationOptions type', () => {
      // TypeScript types are erased at runtime, but we can verify the module loads
      const module = require('@/components/navigation/NativeBottomTabs');

      // The module should load without errors
      expect(module).toBeDefined();
    });

    it('NativeTabs has Screen property for route definitions', () => {
      const module = require('@/components/navigation/NativeBottomTabs');

      // withLayoutContext returns a component with a Screen property
      expect(module.NativeTabs.Screen).toBeDefined();
    });
  });

  describe('component structure', () => {
    it('NativeTabs is a valid React component', () => {
      const module = require('@/components/navigation/NativeBottomTabs');
      const { NativeTabs } = module;

      // Should be callable as a function component
      expect(() => {
        // Verify it can be instantiated (mock returns a simple View)
        const element = React.createElement(NativeTabs);
        expect(element).toBeTruthy();
      }).not.toThrow();
    });
  });
});
