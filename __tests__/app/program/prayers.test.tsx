/**
 * @fileoverview Tests for Prayers screen
 *
 * Tests the prayers screen including:
 * - Loading, error, and empty states
 * - Prayer list display
 * - Filtering by category
 * - Favorites functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PrayersScreen from '@/app/(app)/(tabs)/program/prayers';
import type { Prayer } from '@/types/database';

// Import Toast mock for assertions
import Toast from 'react-native-toast-message';

// =============================================================================
// Mocks
// =============================================================================

// Mock data
let mockPrayers: Prayer[] = [];
let mockFavorites: { prayer_id: string }[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'prayers') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockImplementation(() => {
              return Promise.resolve({ data: mockPrayers, error: null });
            }),
          }),
        };
      }
      if (table === 'user_prayer_favorites') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(() => {
              return Promise.resolve({ data: mockFavorites, error: null });
            }),
          }),
          insert: jest.fn().mockImplementation(() => Promise.resolve({ error: null })),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => Promise.resolve({ error: null })),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

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
      danger: '#ef4444',
      white: '#ffffff',
      shadow: '#000000',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
    },
    isDark: false,
  }),
}));

const mockProfile = {
  id: 'user-123',
  display_name: 'John D.',
  sobriety_date: '2024-01-01',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'user-123' },
    session: {},
    loading: false,
  }),
}));

jest.mock('lucide-react-native', () => ({
  Heart: ({ fill }: { fill?: string }) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {
      testID: 'heart-icon',
      accessibilityLabel: `Heart ${fill !== 'transparent' ? 'filled' : 'unfilled'}`,
    });
  },
  ChevronDown: () => null,
  ChevronUp: () => null,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'database',
  },
}));

jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 80,
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, []);
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const createMockPrayers = (): Prayer[] => [
  {
    id: 'prayer-1',
    title: 'Third Step Prayer',
    content: 'God, I offer myself to Thee—to build with me and to do with me as Thou wilt.',
    category: 'step',
    step_number: 3,
    sort_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'prayer-2',
    title: 'Seventh Step Prayer',
    content: 'My Creator, I am now willing that you should have all of me, good and bad.',
    category: 'step',
    step_number: 7,
    sort_order: 7,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'prayer-3',
    title: 'Serenity Prayer',
    content:
      'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can.',
    category: 'common',
    step_number: null,
    sort_order: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('PrayersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrayers = createMockPrayers();
    mockFavorites = [];
  });

  describe('rendering', () => {
    it('renders filter buttons', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-all')).toBeTruthy();
        expect(screen.getByTestId('filter-favorites')).toBeTruthy();
        expect(screen.getByTestId('filter-step')).toBeTruthy();
        expect(screen.getByTestId('filter-common')).toBeTruthy();
      });
    });

    it('renders prayer cards', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
        expect(screen.getByText('Seventh Step Prayer')).toBeTruthy();
        expect(screen.getByText('Serenity Prayer')).toBeTruthy();
      });
    });

    it('renders section titles when filter is all', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step Prayers')).toBeTruthy();
        expect(screen.getByText('Common Prayers')).toBeTruthy();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty message when no prayers', async () => {
      mockPrayers = [];

      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('No prayers available')).toBeTruthy();
      });
    });

    it('shows favorites empty message when no favorites', async () => {
      mockFavorites = [];

      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-favorites'));

      await waitFor(() => {
        expect(screen.getByText(/No favorite prayers yet/)).toBeTruthy();
      });
    });
  });

  describe('filtering', () => {
    it('filters to step prayers when step filter is pressed', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-step'));

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
        expect(screen.getByText('Seventh Step Prayer')).toBeTruthy();
        expect(screen.queryByText('Serenity Prayer')).toBeNull();
      });
    });

    it('filters to common prayers when common filter is pressed', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Serenity Prayer')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-common'));

      await waitFor(() => {
        expect(screen.queryByText('Third Step Prayer')).toBeNull();
        expect(screen.getByText('Serenity Prayer')).toBeTruthy();
      });
    });

    it('shows all prayers when all filter is pressed', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      // First filter to step
      fireEvent.press(screen.getByTestId('filter-step'));

      await waitFor(() => {
        expect(screen.queryByText('Serenity Prayer')).toBeNull();
      });

      // Then back to all
      fireEvent.press(screen.getByTestId('filter-all'));

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
        expect(screen.getByText('Serenity Prayer')).toBeTruthy();
      });
    });

    it('filters to favorites when favorites filter is pressed', async () => {
      mockFavorites = [{ prayer_id: 'prayer-1' }];

      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-favorites'));

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
        expect(screen.queryByText('Serenity Prayer')).toBeNull();
      });
    });
  });

  describe('favorites', () => {
    it('shows success toast when adding favorite', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      const favoriteButton = screen.getByTestId('prayer-favorite-prayer-1');
      fireEvent.press(favoriteButton);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Added to favorites' })
        );
      });
    });

    it('shows success toast when removing favorite', async () => {
      mockFavorites = [{ prayer_id: 'prayer-1' }];

      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Third Step Prayer')).toBeTruthy();
      });

      const favoriteButton = screen.getByTestId('prayer-favorite-prayer-1');
      fireEvent.press(favoriteButton);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Removed from favorites' })
        );
      });
    });
  });

  describe('section headers', () => {
    it('does not show section headers when filtering by step', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step Prayers')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-step'));

      await waitFor(() => {
        expect(screen.queryByText('Step Prayers')).toBeNull();
        expect(screen.queryByText('Common Prayers')).toBeNull();
      });
    });

    it('does not show section headers when filtering by common', async () => {
      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Common Prayers')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-common'));

      await waitFor(() => {
        expect(screen.queryByText('Step Prayers')).toBeNull();
        expect(screen.queryByText('Common Prayers')).toBeNull();
      });
    });

    it('does not show section headers when filtering by favorites', async () => {
      mockFavorites = [{ prayer_id: 'prayer-1' }, { prayer_id: 'prayer-3' }];

      render(<PrayersScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step Prayers')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('filter-favorites'));

      await waitFor(() => {
        expect(screen.queryByText('Step Prayers')).toBeNull();
        expect(screen.queryByText('Common Prayers')).toBeNull();
      });
    });
  });
});
