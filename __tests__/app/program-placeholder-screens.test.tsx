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

import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
      render(<DailyReadingsScreen />);

      expect(screen.getByText('Daily Readings')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      render(<DailyReadingsScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = render(<DailyReadingsScreen />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('PrayersScreen', () => {
    it('renders the Prayers title', () => {
      render(<PrayersScreen />);

      expect(screen.getByText('Prayers')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      render(<PrayersScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = render(<PrayersScreen />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('LiteratureScreen', () => {
    it('renders the Literature title', () => {
      render(<LiteratureScreen />);

      expect(screen.getByText('Literature')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      render(<LiteratureScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = render(<LiteratureScreen />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('MeetingsScreen', () => {
    it('renders the Meetings title', () => {
      render(<MeetingsScreen />);

      expect(screen.getByText('Meetings')).toBeTruthy();
    });

    it('renders the Coming soon subtitle', () => {
      render(<MeetingsScreen />);

      expect(screen.getByText('Coming soon')).toBeTruthy();
    });

    it('renders without crashing', () => {
      const { toJSON } = render(<MeetingsScreen />);

      expect(toJSON()).toBeTruthy();
    });
  });
});
