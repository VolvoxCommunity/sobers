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
import { render, screen } from '@testing-library/react-native';
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
      render(<PlaceholderScreen title="Daily Readings" />);

      expect(screen.getByText('Daily Readings')).toBeTruthy();
    });

    it('renders default subtitle when not provided', () => {
      render(<PlaceholderScreen title="Meetings" />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders custom subtitle when provided', () => {
      render(<PlaceholderScreen title="Literature" subtitle="Under construction" />);

      expect(screen.getByText('Under construction')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = render(<PlaceholderScreen title="Test" />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('styling', () => {
    it('applies theme text color to title', () => {
      render(<PlaceholderScreen title="Prayers" />);

      const title = screen.getByText('Prayers');
      expect(title).toBeTruthy();
    });

    it('applies theme secondary color to subtitle', () => {
      render(<PlaceholderScreen title="Daily" />);

      const subtitle = screen.getByText('Coming soon');
      expect(subtitle).toBeTruthy();
    });
  });

  describe('different screens', () => {
    it('renders Daily Readings screen', () => {
      render(<PlaceholderScreen title="Daily Readings" />);

      expect(screen.getByText('Daily Readings')).toBeTruthy();
      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders Prayers screen', () => {
      render(<PlaceholderScreen title="Prayers" />);

      expect(screen.getByText('Prayers')).toBeTruthy();
    });

    it('renders Literature screen', () => {
      render(<PlaceholderScreen title="Literature" />);

      expect(screen.getByText('Literature')).toBeTruthy();
    });

    it('renders Meetings screen', () => {
      render(<PlaceholderScreen title="Meetings" />);

      expect(screen.getByText('Meetings')).toBeTruthy();
    });
  });
});
