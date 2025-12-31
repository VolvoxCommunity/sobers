/**
 * @fileoverview Tests for app/(tabs)/_layout.tsx (Native Bottom Tabs version)
 *
 * Tests the main tabs layout including:
 * - Platform-specific rendering (native vs web)
 * - Tab navigator configuration
 * - Route rendering
 * - TabBarIcon callback execution
 */

// =============================================================================
// Mocks (must be declared before imports)
// =============================================================================

// Mock SVG asset imports - these are required by the actual _layout.tsx
// =============================================================================
// Imports (after mocks)
// =============================================================================

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

// Import after mocks are set up
import TabsLayout from '@/app/(app)/(tabs)/_layout';
import { useAuth } from '@/contexts/AuthContext';

jest.mock('@/assets/icons/home.svg', () => 'mock-home-icon');
jest.mock('@/assets/icons/book-open.svg', () => 'mock-book-icon');
jest.mock('@/assets/icons/trending-up.svg', () => 'mock-trending-icon');
jest.mock('@/assets/icons/check-square.svg', () => 'mock-tasks-icon');
jest.mock('@/assets/icons/user.svg', () => 'mock-profile-icon');

// Mock profile for useAuth
const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
  show_twelve_step_content: true,
};

// Mock useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    profile: mockProfile,
  })),
}));

// Store captured tabBarIcon callbacks for testing
// Note: Variable must be prefixed with 'mock' to be allowed in jest.mock() factory
let mockCapturedTabBarIcons: Record<string, () => unknown> = {};

// Mock WebTopNav component
jest.mock('@/components/navigation/WebTopNav', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ items }: { items: { route: string; label: string }[] }) =>
      React.createElement(View, { testID: 'web-top-nav', 'data-items': JSON.stringify(items) }),
  };
});

// Mock NativeBottomTabs component - captures tabBarIcon callbacks for testing
jest.mock('@/components/navigation/NativeBottomTabs', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockScreen = ({
    name,
    options,
  }: {
    name: string;
    options?: { tabBarIcon?: () => unknown; title?: string; tabBarItemHidden?: boolean };
  }) => {
    // Capture the tabBarIcon callback for later testing
    if (options?.tabBarIcon) {
      mockCapturedTabBarIcons[name] = options.tabBarIcon;
    }
    return React.createElement(View, {
      testID: `tab-screen-${name}`,
      'data-options': JSON.stringify({
        ...options,
        tabBarIcon: options?.tabBarIcon ? 'function' : undefined,
      }),
    });
  };

  const MockNativeTabs = ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'native-bottom-tabs', ...props }, children);

  MockNativeTabs.Screen = MockScreen;

  return {
    __esModule: true,
    NativeTabs: MockNativeTabs,
  };
});

// Mock expo-router Tabs
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockScreen = ({ name, options }: { name: string; options?: object }) =>
    React.createElement(View, {
      testID: `expo-tab-screen-${name}`,
      'data-options': JSON.stringify(options),
    });

  const MockTabs = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions?: object;
  }) =>
    React.createElement(
      View,
      { testID: 'expo-tabs', 'data-screen-options': JSON.stringify(screenOptions) },
      children
    );

  MockTabs.Screen = MockScreen;

  return {
    __esModule: true,
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    useNavigation: () => ({
      setOptions: jest.fn(),
    }),
    Tabs: MockTabs,
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Home: () => null,
  BookOpen: () => null,
  TrendingUp: () => null,
  CheckSquare: () => null,
  User: () => null,
}));

// Store original Platform.OS
const originalPlatform = Platform.OS;

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to set Platform.OS for testing
 */
function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

// =============================================================================
// Test Suite
// =============================================================================

describe('TabsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedTabBarIcons = {};
    // Default to iOS
    setPlatform('ios');
  });

  afterAll(() => {
    // Restore original Platform
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatform,
      configurable: true,
    });
  });

  describe('native platforms (iOS/Android)', () => {
    it('renders NativeBottomTabs on iOS', () => {
      setPlatform('ios');

      render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('renders NativeBottomTabs on Android', () => {
      setPlatform('android');

      render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('renders all tab screens on native', () => {
      setPlatform('ios');

      render(<TabsLayout />);

      expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-journey')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-tasks')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-manage-tasks')).toBeTruthy();
    });
  });

  describe('web platform', () => {
    beforeEach(() => {
      setPlatform('web');
    });

    it('renders WebTopNav on web', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
      expect(screen.queryByTestId('native-bottom-tabs')).toBeNull();
    });

    it('renders Expo Tabs on web (hidden)', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('expo-tabs')).toBeTruthy();
    });

    it('renders all expo tab screens on web', () => {
      render(<TabsLayout />);

      expect(screen.getByTestId('expo-tab-screen-index')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-steps')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-journey')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-tasks')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-profile')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-manage-tasks')).toBeTruthy();
    });
  });

  describe('tabBarIcon callbacks', () => {
    it('returns SF Symbol config on iOS', () => {
      setPlatform('ios');

      render(<TabsLayout />);

      // Execute the captured tabBarIcon callback for the index tab
      const indexIcon = mockCapturedTabBarIcons['index'];
      expect(indexIcon).toBeDefined();

      const result = indexIcon();
      expect(result).toEqual({ sfSymbol: 'house.fill' });
    });

    it('returns Android icon config on Android', () => {
      setPlatform('android');

      render(<TabsLayout />);

      // Execute the captured tabBarIcon callback for the index tab
      const indexIcon = mockCapturedTabBarIcons['index'];
      expect(indexIcon).toBeDefined();

      const result = indexIcon();
      // Android returns the required SVG asset
      expect(result).toBe('mock-home-icon');
    });

    it('provides correct SF Symbols for all tabs on iOS', () => {
      setPlatform('ios');

      render(<TabsLayout />);

      expect(mockCapturedTabBarIcons['index']()).toEqual({ sfSymbol: 'house.fill' });
      expect(mockCapturedTabBarIcons['steps']()).toEqual({ sfSymbol: 'book.fill' });
      expect(mockCapturedTabBarIcons['journey']()).toEqual({
        sfSymbol: 'chart.line.uptrend.xyaxis',
      });
      expect(mockCapturedTabBarIcons['tasks']()).toEqual({ sfSymbol: 'checklist' });
      expect(mockCapturedTabBarIcons['profile']()).toEqual({ sfSymbol: 'person.fill' });
    });

    it('provides correct Android icons for all tabs on Android', () => {
      setPlatform('android');

      render(<TabsLayout />);

      expect(mockCapturedTabBarIcons['index']()).toBe('mock-home-icon');
      expect(mockCapturedTabBarIcons['steps']()).toBe('mock-book-icon');
      expect(mockCapturedTabBarIcons['journey']()).toBe('mock-trending-icon');
      expect(mockCapturedTabBarIcons['tasks']()).toBe('mock-tasks-icon');
      expect(mockCapturedTabBarIcons['profile']()).toBe('mock-profile-icon');
    });
  });

  describe('platform switching', () => {
    it('switches from native to web navigation when platform changes', () => {
      setPlatform('ios');
      const { rerender } = render(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();

      // Change platform
      setPlatform('web');

      rerender(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
    });

    it('switches from web to native navigation when platform changes', () => {
      setPlatform('web');
      const { rerender } = render(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();

      // Change platform
      setPlatform('ios');

      rerender(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
    });
  });

  describe('rendering', () => {
    it('renders without errors', () => {
      const { toJSON } = render(<TabsLayout />);

      expect(toJSON()).toBeTruthy();
    });

    it('renders consistently after re-render', () => {
      const { rerender } = render(<TabsLayout />);

      rerender(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles rapid platform changes', () => {
      const { rerender } = render(<TabsLayout />);

      setPlatform('web');
      rerender(<TabsLayout />);

      setPlatform('ios');
      rerender(<TabsLayout />);

      expect(screen.getByTestId('native-bottom-tabs')).toBeTruthy();
    });
  });

  describe('conditional Steps tab visibility', () => {
    beforeEach(() => {
      setPlatform('ios');
    });

    it('shows Steps tab when show_twelve_step_content is true', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: true },
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
    });

    it('hides Steps tab when show_twelve_step_content is false', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: false },
      });

      render(<TabsLayout />);

      expect(screen.queryByTestId('tab-screen-steps')).toBeNull();
    });

    it('shows Steps tab when show_twelve_step_content is undefined (existing users)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: undefined },
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
    });

    it('shows Steps tab when show_twelve_step_content is null (existing users)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: null },
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
    });

    it('shows Steps tab when profile is null', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: null,
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
    });

    it('hides Steps tab on web when show_twelve_step_content is false', () => {
      setPlatform('web');
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: false },
      });

      render(<TabsLayout />);

      expect(screen.queryByTestId('expo-tab-screen-steps')).toBeNull();
    });

    it('shows Steps tab on web when show_twelve_step_content is true', () => {
      setPlatform('web');
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: true },
      });

      render(<TabsLayout />);

      expect(screen.getByTestId('expo-tab-screen-steps')).toBeTruthy();
    });

    it('updates tab visibility when preference changes', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: true },
      });

      const { rerender } = render(<TabsLayout />);
      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();

      // Change preference
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: false },
      });

      rerender(<TabsLayout />);
      expect(screen.queryByTestId('tab-screen-steps')).toBeNull();
    });

    it('shows other tabs regardless of Steps visibility', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_twelve_step_content: false },
      });

      render(<TabsLayout />);

      // All other tabs should still be visible
      expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-journey')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-tasks')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
    });
  });
});
