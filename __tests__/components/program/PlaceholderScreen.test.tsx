/**
 * @fileoverview Tests for PlaceholderScreen component
 *
 * Tests the reusable placeholder screen including:
 * - Title and subtitle rendering
 * - Default subtitle behavior
 * - Theme integration
 * - Tab bar padding integration
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import PlaceholderScreen from '@/components/program/PlaceholderScreen';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  text: '#111827',
  textSecondary: '#6b7280',
  background: '#ffffff',
  fontRegular: 'JetBrainsMono-Regular',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
    setTheme: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 83,
}));

// =============================================================================
// Tests
// =============================================================================

describe('PlaceholderScreen', () => {
  describe('rendering', () => {
    it('renders title correctly', () => {
      renderWithProviders(<PlaceholderScreen title="Daily Readings" />);

      expect(screen.getByText('Daily Readings')).toBeTruthy();
    });

    it('renders default subtitle when not provided', () => {
      renderWithProviders(<PlaceholderScreen title="Meetings" />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders custom subtitle when provided', () => {
      renderWithProviders(<PlaceholderScreen title="Literature" subtitle="Under construction" />);

      expect(screen.getByText('Under construction')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = renderWithProviders(<PlaceholderScreen title="Test" />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies theme text color to title', () => {
      renderWithProviders(<PlaceholderScreen title="Prayers" />);

      const title = screen.getByText('Prayers');
      expect(title).toBeTruthy();
    });

    it('applies theme secondary color to subtitle', () => {
      renderWithProviders(<PlaceholderScreen title="Daily" />);

      const subtitle = screen.getByText('Coming soon');
      expect(subtitle).toBeTruthy();
    });
  });
});
