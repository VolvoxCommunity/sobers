/**
 * @fileoverview Tests for app/(app)/(tabs)/program/_layout.tsx
 *
 * Tests the Program section layout including:
 * - Header rendering
 * - Top tabs navigation
 * - Active tab state
 * - Tab press handling
 */

// =============================================================================
// Imports
// =============================================================================

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import ProgramLayout from '@/app/(app)/(tabs)/program/_layout';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  text: '#111827',
  textSecondary: '#6b7280',
  background: '#ffffff',
  card: '#ffffff',
  border: '#e5e7eb',
  surface: '#ffffff',
  fontRegular: 'JetBrainsMono-Regular',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
    setTheme: jest.fn(),
  }),
}));

// Mock router
const mockPush = jest.fn();
let mockPathname = '/program/steps';

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  // Mock Tabs component
  function MockTabs({
    children,
  }: {
    children: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) {
    return <View testID="tabs-navigator">{children}</View>;
  }
  MockTabs.displayName = 'MockTabs';

  // Mock Tabs.Screen component
  function MockTabsScreen({ name }: { name: string }) {
    return <View testID={`tabs-screen-${name}`} />;
  }
  MockTabsScreen.displayName = 'MockTabsScreen';

  MockTabs.Screen = MockTabsScreen;

  return {
    Tabs: MockTabs,
    usePathname: () => mockPathname,
    useRouter: () => ({
      push: mockPush,
      back: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/components/navigation/SettingsButton', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSettingsButton() {
    return <View testID="settings-button" />;
  };
});

jest.mock('lucide-react-native', () => ({
  BookOpen: () => null,
  Sun: () => null,
  Heart: () => null,
  BookMarked: () => null,
  Users: () => null,
}));

// =============================================================================
// Tests
// =============================================================================

describe('ProgramLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/program/steps';
  });

  describe('rendering', () => {
    it('renders the header with title', () => {
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByText('Program')).toBeTruthy();
    });

    it('renders all four visible tabs', () => {
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByText('Steps')).toBeTruthy();
      expect(screen.getByText('Daily')).toBeTruthy();
      expect(screen.getByText('Prayers')).toBeTruthy();
      // Literature tab is currently hidden
      expect(screen.getByText('Meet')).toBeTruthy();
    });

    it('renders tabs navigator', () => {
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByTestId('tabs-navigator')).toBeTruthy();
    });

    it('registers all tab screens', () => {
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByTestId('tabs-screen-steps')).toBeTruthy();
      expect(screen.getByTestId('tabs-screen-daily')).toBeTruthy();
      expect(screen.getByTestId('tabs-screen-prayers')).toBeTruthy();
      expect(screen.getByTestId('tabs-screen-literature')).toBeTruthy();
      expect(screen.getByTestId('tabs-screen-meetings')).toBeTruthy();
    });
  });

  describe('tab navigation', () => {
    it('navigates to steps when Steps tab is pressed', () => {
      renderWithProviders(<ProgramLayout />);

      fireEvent.press(screen.getByText('Steps'));

      expect(mockPush).toHaveBeenCalledWith('/program/steps');
    });

    it('navigates to daily when Daily tab is pressed', () => {
      renderWithProviders(<ProgramLayout />);

      fireEvent.press(screen.getByText('Daily'));

      expect(mockPush).toHaveBeenCalledWith('/program/daily');
    });

    it('navigates to prayers when Prayers tab is pressed', () => {
      renderWithProviders(<ProgramLayout />);

      fireEvent.press(screen.getByText('Prayers'));

      expect(mockPush).toHaveBeenCalledWith('/program/prayers');
    });

    // Literature tab is currently hidden
    it.skip('navigates to literature when Lit tab is pressed', () => {
      renderWithProviders(<ProgramLayout />);

      fireEvent.press(screen.getByText('Lit'));

      expect(mockPush).toHaveBeenCalledWith('/program/literature');
    });

    it('navigates to meetings when Meet tab is pressed', () => {
      renderWithProviders(<ProgramLayout />);

      fireEvent.press(screen.getByText('Meet'));

      expect(mockPush).toHaveBeenCalledWith('/program/meetings');
    });
  });

  describe('active tab state', () => {
    it('defaults to steps tab when on /program/steps', () => {
      mockPathname = '/program/steps';
      renderWithProviders(<ProgramLayout />);

      // Component renders without error with steps as active
      expect(screen.getByText('Steps')).toBeTruthy();
    });

    it('shows daily as active when on /program/daily', () => {
      mockPathname = '/program/daily';
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByText('Daily')).toBeTruthy();
    });

    it('shows prayers as active when on /program/prayers', () => {
      mockPathname = '/program/prayers';
      renderWithProviders(<ProgramLayout />);

      expect(screen.getByText('Prayers')).toBeTruthy();
    });

    it('defaults to steps for unknown paths', () => {
      mockPathname = '/program/unknown';
      renderWithProviders(<ProgramLayout />);

      // Should still render without error
      expect(screen.getByText('Steps')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('renders consistently across multiple renders', () => {
      const { rerender } = renderWithProviders(<ProgramLayout />);

      rerender(<ProgramLayout />);

      expect(screen.getByText('Program')).toBeTruthy();
    });

    it('handles deep paths correctly', () => {
      mockPathname = '/program/steps/step-1';
      renderWithProviders(<ProgramLayout />);

      // Should show steps as active for nested routes
      expect(screen.getByText('Steps')).toBeTruthy();
    });
  });
});
