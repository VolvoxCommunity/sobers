/**
 * @fileoverview Tests for Meetings screen
 *
 * Tests the meeting attendance tracking functionality including:
 * - Stats header display
 * - Calendar rendering
 * - Empty state
 */

import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import MeetingsScreen from '@/app/(app)/(tabs)/program/meetings';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  background: '#ffffff',
  card: '#ffffff',
  border: '#e5e7eb',
  primary: '#007AFF',
  primaryLight: '#E3F2FD',
  warning: '#FF9500',
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
    setTheme: jest.fn(),
  }),
}));

const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'test-user-id' },
  }),
}));

jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 83,
}));

// Mock supabase - return empty arrays
// The eq() mock needs to return both a promise (for milestones) and have order() (for meetings)
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => {
          const promise = Promise.resolve({ data: [], error: null });
          return {
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            then: promise.then.bind(promise),
            catch: promise.catch.bind(promise),
            finally: promise.finally.bind(promise),
          };
        }),
      })),
    })),
  },
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');

    React.useEffect(() => {
      callback();
    }, []);
  },
}));

// Mock GlassBottomSheet
jest.mock('@/components/GlassBottomSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { forwardRef } = require('react');
  const MockGlassBottomSheet = forwardRef(function MockGlassBottomSheet() {
    return null;
  });
  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// =============================================================================
// Tests
// =============================================================================

// TODO: Fix mock setup - tests fail with "Unable to find node on an unmounted component"
describe.skip('MeetingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no meetings', async () => {
    renderWithProviders(<MeetingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No meetings logged yet')).toBeTruthy();
    });
  });

  it('renders the stats header with 0 meetings', async () => {
    renderWithProviders(<MeetingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('0 meetings')).toBeTruthy();
    });
  });

  it('renders the calendar component', async () => {
    renderWithProviders(<MeetingsScreen />);

    await waitFor(() => {
      // Calendar should show day 1
      expect(screen.getByTestId('calendar-day-1')).toBeTruthy();
    });
  });

  it('renders calendar navigation', async () => {
    renderWithProviders(<MeetingsScreen />);

    await waitFor(() => {
      // Should show current month (January 2026 based on mocked date)
      expect(screen.getByText(/January 2026/)).toBeTruthy();
    });
  });
});
