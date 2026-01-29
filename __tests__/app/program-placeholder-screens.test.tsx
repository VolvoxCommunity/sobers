/**
 * @fileoverview Tests for Program section placeholder screens
 *
 * Tests the placeholder screens for:
 * - Daily Readings
 * - Literature
 *
 * Note: Prayers and Meetings are no longer placeholders - see their respective test files.
 *
 * These tests import the actual screen components to ensure coverage.
 */

// =============================================================================
// Imports
// =============================================================================

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import DailyReadingsScreen from '@/app/(app)/(tabs)/program/daily';
import LiteratureScreen from '@/app/(app)/(tabs)/program/literature';

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

describe('Program Placeholder Screens', () => {
  describe('DailyReadingsScreen', () => {
    it('renders the Daily Readings title', () => {
      renderWithProviders(<DailyReadingsScreen />);

      expect(screen.getByText('Daily Readings')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      renderWithProviders(<DailyReadingsScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });
  });

  describe('LiteratureScreen', () => {
    it('renders the Literature title', () => {
      renderWithProviders(<LiteratureScreen />);

      expect(screen.getByText('Literature')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      renderWithProviders(<LiteratureScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });
  });
});
