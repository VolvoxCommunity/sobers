/**
 * @fileoverview Tests for app/(tabs)/_layout.tsx (NativeTabs from expo-router)
 *
 * Tests the main tabs layout including:
 * - Platform-specific rendering (native vs web)
 * - Tab configuration with SF Symbols and Material Icons
 * - Conditional Program tab visibility
 */

// =============================================================================
// Mocks (must be declared before imports)
// =============================================================================

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import { Platform } from 'react-native';

// Import after mocks are set up
import TabsLayout from '@/app/(app)/(tabs)/_layout';
import { useAuth } from '@/contexts/AuthContext';

// Mock profile for useAuth
const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
  show_program_content: true,
};

// Mock useAuth hook
jest.mock('@/contexts/AuthContext', () => {
  const React = require('react');
  return {
    useAuth: jest.fn(() => ({
      profile: mockProfile,
    })),
    AuthProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

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

// Capture NativeTabs Trigger props for assertion
let mockCapturedTriggers: Record<string, { hidden?: boolean; children: React.ReactNode[] }> = {};

// Mock expo-router/unstable-native-tabs
jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const MockLabel = ({ children }: { children: string }) =>
    React.createElement(Text, { testID: `trigger-label-${children}` }, children);

  const MockIcon = ({ sf, md }: { sf?: string; md?: string }) =>
    React.createElement(View, { testID: `trigger-icon`, 'data-sf': sf, 'data-md': md });

  const MockBadge = ({ children }: { children?: string }) =>
    React.createElement(Text, { testID: 'trigger-badge' }, children);

  const MockTrigger = ({
    name,
    hidden,
    children,
  }: {
    name: string;
    hidden?: boolean;
    children?: React.ReactNode;
  }) => {
    mockCapturedTriggers[name] = {
      hidden,
      children: React.Children.toArray(children),
    };
    return React.createElement(
      View,
      { testID: `trigger-${name}`, 'data-hidden': hidden },
      children
    );
  };

  MockTrigger.Label = MockLabel;
  MockTrigger.Icon = MockIcon;
  MockTrigger.Badge = MockBadge;
  MockTrigger.VectorIcon = () => null;

  const MockBottomAccessory = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: 'bottom-accessory' }, children);

  MockBottomAccessory.usePlacement = () => 'regular';

  const MockNativeTabs = ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement(
      View,
      {
        testID: 'native-tabs',
        'data-tint-color': props['tintColor' as keyof typeof props],
        'data-bg-color': props['backgroundColor' as keyof typeof props],
      },
      children
    );

  MockNativeTabs.Trigger = MockTrigger;
  MockNativeTabs.BottomAccessory = MockBottomAccessory;

  return {
    __esModule: true,
    NativeTabs: MockNativeTabs,
  };
});

// Mock expo-router Tabs (for web)
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
  Compass: () => null,
  TrendingUp: () => null,
  CheckSquare: () => null,
  User: () => null,
}));

// Store original Platform.OS
const originalPlatform = Platform.OS;

// =============================================================================
// Test Helpers
// =============================================================================

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
    mockCapturedTriggers = {};
    setPlatform('ios');
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatform,
      configurable: true,
    });
  });

  describe('native platforms (iOS/Android)', () => {
    it('renders NativeTabs on iOS', () => {
      setPlatform('ios');
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('native-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('renders NativeTabs on Android', () => {
      setPlatform('android');
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('native-tabs')).toBeTruthy();
      expect(screen.queryByTestId('web-top-nav')).toBeNull();
    });

    it('renders all tab triggers on native', () => {
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('trigger-index')).toBeTruthy();
      expect(screen.getByTestId('trigger-program')).toBeTruthy();
      expect(screen.getByTestId('trigger-journey')).toBeTruthy();
      expect(screen.getByTestId('trigger-tasks')).toBeTruthy();
      expect(screen.getByTestId('trigger-profile')).toBeTruthy();
      expect(screen.getByTestId('trigger-manage-tasks')).toBeTruthy();
    });

    it('provides correct labels for all tabs', () => {
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('trigger-label-Home')).toBeTruthy();
      expect(screen.getByTestId('trigger-label-Program')).toBeTruthy();
      expect(screen.getByTestId('trigger-label-Journey')).toBeTruthy();
      expect(screen.getByTestId('trigger-label-Tasks')).toBeTruthy();
      expect(screen.getByTestId('trigger-label-Profile')).toBeTruthy();
      expect(screen.getByTestId('trigger-label-Manage Tasks')).toBeTruthy();
    });

    it('provides SF Symbols and Material Icons for all tabs', () => {
      renderWithProviders(<TabsLayout />);

      const icons = screen.getAllByTestId('trigger-icon');
      // 5 visible tabs have icons (manage-tasks is hidden and has no icon)
      expect(icons.length).toBe(5);

      // Verify icon data via captured triggers
      expect(mockCapturedTriggers['index']).toBeDefined();
      expect(mockCapturedTriggers['program']).toBeDefined();
      expect(mockCapturedTriggers['journey']).toBeDefined();
      expect(mockCapturedTriggers['tasks']).toBeDefined();
      expect(mockCapturedTriggers['profile']).toBeDefined();
    });

    it('marks manage-tasks trigger as hidden', () => {
      renderWithProviders(<TabsLayout />);

      const manageTasksTrigger = screen.getByTestId('trigger-manage-tasks');
      expect(manageTasksTrigger.props['data-hidden']).toBe(true);
    });
  });

  describe('web platform', () => {
    beforeEach(() => {
      setPlatform('web');
    });

    it('renders WebTopNav on web', () => {
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
      expect(screen.queryByTestId('native-tabs')).toBeNull();
    });

    it('renders Expo Tabs on web (hidden)', () => {
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('expo-tabs')).toBeTruthy();
    });

    it('renders all expo tab screens on web', () => {
      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('expo-tab-screen-index')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-program')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-journey')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-tasks')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-profile')).toBeTruthy();
      expect(screen.getByTestId('expo-tab-screen-manage-tasks')).toBeTruthy();
    });
  });

  describe('platform switching', () => {
    it('switches from native to web navigation', () => {
      setPlatform('ios');
      const { rerender } = renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('native-tabs')).toBeTruthy();

      setPlatform('web');
      rerender(<TabsLayout />);
      expect(screen.getByTestId('web-top-nav')).toBeTruthy();
    });

    it('switches from web to native navigation', () => {
      setPlatform('web');
      const { rerender } = renderWithProviders(<TabsLayout />);
      expect(screen.getByTestId('web-top-nav')).toBeTruthy();

      setPlatform('ios');
      rerender(<TabsLayout />);
      expect(screen.getByTestId('native-tabs')).toBeTruthy();
    });
  });

  describe('conditional Program tab visibility', () => {
    beforeEach(() => {
      setPlatform('ios');
    });

    it('shows Program tab when show_program_content is true', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: true },
      });

      renderWithProviders(<TabsLayout />);

      const trigger = screen.getByTestId('trigger-program');
      expect(trigger.props['data-hidden']).toBeFalsy();
    });

    it('hides Program tab on native when show_program_content is false', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: false },
      });

      renderWithProviders(<TabsLayout />);

      const trigger = screen.getByTestId('trigger-program');
      expect(trigger.props['data-hidden']).toBe(true);
    });

    it('shows Program tab when show_program_content is undefined (existing users)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: undefined },
      });

      renderWithProviders(<TabsLayout />);

      const trigger = screen.getByTestId('trigger-program');
      expect(trigger.props['data-hidden']).toBeFalsy();
    });

    it('shows Program tab when show_program_content is null (existing users)', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: null },
      });

      renderWithProviders(<TabsLayout />);

      const trigger = screen.getByTestId('trigger-program');
      expect(trigger.props['data-hidden']).toBeFalsy();
    });

    it('shows Program tab when profile is null', () => {
      (useAuth as jest.Mock).mockReturnValue({ profile: null });

      renderWithProviders(<TabsLayout />);

      const trigger = screen.getByTestId('trigger-program');
      expect(trigger.props['data-hidden']).toBeFalsy();
    });

    it('hides Program tab on web when show_program_content is false', () => {
      setPlatform('web');
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: false },
      });

      renderWithProviders(<TabsLayout />);

      expect(screen.queryByTestId('expo-tab-screen-program')).toBeNull();
    });

    it('shows Program tab on web when show_program_content is true', () => {
      setPlatform('web');
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: true },
      });

      renderWithProviders(<TabsLayout />);

      expect(screen.getByTestId('expo-tab-screen-program')).toBeTruthy();
    });

    it('shows other tabs regardless of Program visibility', () => {
      (useAuth as jest.Mock).mockReturnValue({
        profile: { ...mockProfile, show_program_content: false },
      });

      renderWithProviders(<TabsLayout />);

      // All other tabs should not be hidden
      expect(screen.getByTestId('trigger-index').props['data-hidden']).toBeFalsy();
      expect(screen.getByTestId('trigger-journey').props['data-hidden']).toBeFalsy();
      expect(screen.getByTestId('trigger-tasks').props['data-hidden']).toBeFalsy();
      expect(screen.getByTestId('trigger-profile').props['data-hidden']).toBeFalsy();
    });
  });

  describe('rendering', () => {
    it('renders without errors', () => {
      const { toJSON } = renderWithProviders(<TabsLayout />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders consistently after re-render', () => {
      const { rerender } = renderWithProviders(<TabsLayout />);
      rerender(<TabsLayout />);
      expect(screen.getByTestId('native-tabs')).toBeTruthy();
    });
  });
});
