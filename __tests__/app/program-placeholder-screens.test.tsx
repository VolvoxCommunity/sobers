/**
 * @fileoverview Tests for Program section placeholder screens
 *
 * Tests the placeholder screens for:
 * - Daily Readings
 * - Prayers
 * - Literature
 * - Meetings
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
import PrayersScreen from '@/app/(app)/(tabs)/program/prayers';
import LiteratureScreen from '@/app/(app)/(tabs)/program/literature';
import MeetingsScreen from '@/app/(app)/(tabs)/program/meetings';

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

  describe('PrayersScreen', () => {
    it('renders the Prayers title', () => {
      renderWithProviders(<PrayersScreen />);

      expect(screen.getByText('Prayers')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      renderWithProviders(<PrayersScreen />);

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

  describe('MeetingsScreen', () => {
    it('renders the Meetings title', () => {
      renderWithProviders(<MeetingsScreen />);

      expect(screen.getByText('Meetings')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      renderWithProviders(<MeetingsScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });
  });
});
