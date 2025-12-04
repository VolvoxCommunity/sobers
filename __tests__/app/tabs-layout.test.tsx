/**
 * @fileoverview Tests for app/(tabs)/_layout.tsx
 *
 * Tests the tab navigation layout including:
 * - Rendering with theme
 * - Tab navigation items
 * - Active index synchronization with pathname
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabLayout from '@/app/(tabs)/_layout';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router
const mockPush = jest.fn();
const mockUsePathname = jest.fn(() => '/');

jest.mock('expo-router', () => ({
  Tabs: ({ children, tabBar }: { children: React.ReactNode; tabBar: () => React.ReactNode }) => {
    const React = require('react');
    return React.createElement('View', { testID: 'tabs-container' }, [
      React.createElement('View', { key: 'content', testID: 'tabs-content' }, children),
      React.createElement('View', { key: 'tabbar', testID: 'custom-tabbar' }, tabBar()),
    ]);
  },
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Add Tabs.Screen mock
const TabsScreen = function TabsScreen({ name }: { name: string }) {
  const React = require('react');
  return React.createElement('View', { testID: `tab-screen-${name}` });
};
TabsScreen.displayName = 'TabsScreen';
(jest.requireMock('expo-router') as { Tabs: { Screen: typeof TabsScreen } }).Tabs.Screen =
  TabsScreen;

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      primaryLight: '#E5F1FF',
      text: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Home: () => null,
  BookOpen: () => null,
  TrendingUp: () => null,
  CheckSquare: () => null,
  User: () => null,
}));

// Mock AnimatedBottomNav
jest.mock('@/components/AnimatedBottomNav', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return {
    __esModule: true,
    default: ({
      items,
      activeIndex,
      onActiveIndexChange,
      accentColor,
    }: {
      items: Array<{ label: string; icon: unknown; onPress: () => void }>;
      activeIndex: number;
      onActiveIndexChange: (index: number) => void;
      accentColor: string;
    }) =>
      React.createElement(
        View,
        { testID: 'animated-bottom-nav' },
        items.map((item: { label: string; onPress: () => void }, idx: number) =>
          React.createElement(
            TouchableOpacity,
            {
              key: item.label,
              testID: `nav-item-${item.label.toLowerCase()}`,
              onPress: () => {
                item.onPress();
                onActiveIndexChange(idx);
              },
              style: { backgroundColor: idx === activeIndex ? accentColor : 'transparent' },
            },
            React.createElement(Text, null, item.label)
          )
        )
      ),
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('TabLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('rendering', () => {
    it('renders the tabs container', () => {
      render(<TabLayout />);

      expect(screen.getByTestId('tabs-container')).toBeTruthy();
    });

    it('renders the animated bottom nav', () => {
      render(<TabLayout />);

      expect(screen.getByTestId('animated-bottom-nav')).toBeTruthy();
    });

    it('renders all navigation items', () => {
      render(<TabLayout />);

      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Steps')).toBeTruthy();
      expect(screen.getByText('Journey')).toBeTruthy();
      expect(screen.getByText('Tasks')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });

    it('renders all tab screens', () => {
      render(<TabLayout />);

      expect(screen.getByTestId('tab-screen-index')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-steps')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-journey')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-tasks')).toBeTruthy();
      expect(screen.getByTestId('tab-screen-profile')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('navigates to home when Home tab is pressed', () => {
      render(<TabLayout />);

      const homeTab = screen.getByTestId('nav-item-home');
      homeTab.props.onPress();

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('navigates to steps when Steps tab is pressed', () => {
      render(<TabLayout />);

      const stepsTab = screen.getByTestId('nav-item-steps');
      stepsTab.props.onPress();

      expect(mockPush).toHaveBeenCalledWith('/steps');
    });

    it('navigates to journey when Journey tab is pressed', () => {
      render(<TabLayout />);

      const journeyTab = screen.getByTestId('nav-item-journey');
      journeyTab.props.onPress();

      expect(mockPush).toHaveBeenCalledWith('/journey');
    });

    it('navigates to tasks when Tasks tab is pressed', () => {
      render(<TabLayout />);

      const tasksTab = screen.getByTestId('nav-item-tasks');
      tasksTab.props.onPress();

      expect(mockPush).toHaveBeenCalledWith('/tasks');
    });

    it('navigates to profile when Profile tab is pressed', () => {
      render(<TabLayout />);

      const profileTab = screen.getByTestId('nav-item-profile');
      profileTab.props.onPress();

      expect(mockPush).toHaveBeenCalledWith('/profile');
    });
  });

  describe('active index synchronization', () => {
    it('sets active index to 0 for root path', () => {
      mockUsePathname.mockReturnValue('/');
      render(<TabLayout />);

      // Home should be highlighted (first item)
      const homeTab = screen.getByTestId('nav-item-home');
      expect(homeTab.props.style.backgroundColor).toBe('#007AFF');
    });

    it('sets active index to 1 for /steps path', () => {
      mockUsePathname.mockReturnValue('/steps');
      render(<TabLayout />);

      const stepsTab = screen.getByTestId('nav-item-steps');
      expect(stepsTab.props.style.backgroundColor).toBe('#007AFF');
    });

    it('sets active index to 2 for /journey path', () => {
      mockUsePathname.mockReturnValue('/journey');
      render(<TabLayout />);

      const journeyTab = screen.getByTestId('nav-item-journey');
      expect(journeyTab.props.style.backgroundColor).toBe('#007AFF');
    });

    it('sets active index to 3 for /tasks path', () => {
      mockUsePathname.mockReturnValue('/tasks');
      render(<TabLayout />);

      const tasksTab = screen.getByTestId('nav-item-tasks');
      expect(tasksTab.props.style.backgroundColor).toBe('#007AFF');
    });

    it('sets active index to 4 for /profile path', () => {
      mockUsePathname.mockReturnValue('/profile');
      render(<TabLayout />);

      const profileTab = screen.getByTestId('nav-item-profile');
      expect(profileTab.props.style.backgroundColor).toBe('#007AFF');
    });
  });
});
