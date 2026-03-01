/**
 * @fileoverview Tests for Program Daily Reflections screen
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import DailyReflectionsScreen from '@/app/(app)/(tabs)/program/daily';

const mockFetchDailyReflectionForDate = jest.fn();
const mockProfile = {
  id: 'user-123',
  timezone: 'America/New_York',
};

jest.mock('@/lib/daily-reflections', () => ({
  fetchDailyReflectionForDate: (...args: unknown[]) => mockFetchDailyReflectionForDate(...args),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      text: '#111827',
      textSecondary: '#6b7280',
      background: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      danger: '#ef4444',
      white: '#ffffff',
      shadow: '#000000',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
    },
    isDark: false,
    setTheme: jest.fn(),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'user-123' },
    session: {},
    loading: false,
  }),
}));

jest.mock('@/lib/date', () => ({
  getUserTimezone: jest.fn(() => 'America/New_York'),
  formatDateWithTimezone: jest.fn(() => '2026-02-28'),
}));

jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 80,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    API: 'http',
    UI: 'ui',
  },
}));

describe('DailyReflectionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while reflection is being fetched', () => {
    mockFetchDailyReflectionForDate.mockImplementation(
      () => new Promise(() => undefined) as Promise<unknown>
    );

    renderWithProviders(<DailyReflectionsScreen />);

    expect(screen.getByText('Loading daily reflection...')).toBeTruthy();
  });

  it('renders reflection content when fetch succeeds', async () => {
    mockFetchDailyReflectionForDate.mockResolvedValue({
      date: '2026-02-28',
      program: 'aa',
      title: 'A New Freedom',
      content: 'Today I choose progress over perfection.',
      source: 'Daily Reflections, p. 88',
      fetched_from: 'external',
    });

    renderWithProviders(<DailyReflectionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Daily Reflections')).toBeTruthy();
      expect(screen.getByText('A New Freedom')).toBeTruthy();
      expect(screen.getByText('Today I choose progress over perfection.')).toBeTruthy();
      expect(screen.getByText('Daily Reflections, p. 88')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockFetchDailyReflectionForDate.mockRejectedValue(new Error('network'));

    renderWithProviders(<DailyReflectionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load daily reflection')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });
  });

  it('retries fetch when retry button is pressed', async () => {
    mockFetchDailyReflectionForDate
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce({
        date: '2026-02-28',
        program: 'aa',
        title: 'Try Again',
        content: 'Second attempt succeeded.',
        source: 'Daily Reflections, p. 101',
        fetched_from: 'cache',
      });

    renderWithProviders(<DailyReflectionsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load daily reflection')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeTruthy();
      expect(screen.getByText('Second attempt succeeded.')).toBeTruthy();
    });

    expect(mockFetchDailyReflectionForDate).toHaveBeenCalledTimes(2);
    expect(mockFetchDailyReflectionForDate).toHaveBeenCalledWith('2026-02-28');
  });
});
