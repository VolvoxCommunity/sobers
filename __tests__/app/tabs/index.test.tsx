/**
 * @fileoverview Tests for Home/Dashboard screen
 *
 * Tests the main dashboard including:
 * - Rendering days sober
 * - Displaying relationships
 * - Task list
 * - Quick actions
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import { ThemeProvider } from '@/contexts/ThemeContext';

// =============================================================================
// Mocks
// =============================================================================

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test U.',
  sobriety_date: '2024-01-01',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
  }),
}));

jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: () => ({
    daysSober: 100,
    currentStreakStartDate: '2024-01-01',
    loading: false,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'database',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock supabase
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  CheckCircle: () => null,
  Users: () => null,
  Award: () => null,
  UserMinus: () => null,
  Plus: () => null,
  BookOpen: () => null,
  ClipboardList: () => null,
}));

// Mock TaskCreationSheet
jest.mock('@/components/TaskCreationSheet', () => {
  const React = require('react');
  const MockTaskCreationSheet = React.forwardRef(() => null);
  MockTaskCreationSheet.displayName = 'TaskCreationSheet';
  return {
    __esModule: true,
    default: MockTaskCreationSheet,
  };
});

// Mock date utility
jest.mock('@/lib/date', () => ({
  parseDateAsLocal: (dateString: string) => new Date(dateString),
}));

// =============================================================================
// Helper
// =============================================================================

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// =============================================================================
// Test Suite
// =============================================================================

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for supabase queries
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
  });

  describe('rendering', () => {
    it('renders the dashboard', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        // Should show days sober
        expect(screen.getByText('100')).toBeTruthy();
      });
    });

    it('displays days sober count', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeTruthy();
        expect(screen.getByText(/days sober/i)).toBeTruthy();
      });
    });

    it('shows quick action buttons', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('12 Steps')).toBeTruthy();
        expect(screen.getByText('Manage Tasks')).toBeTruthy();
      });
    });
  });

  describe('data fetching', () => {
    it('fetches relationships on mount', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('sponsor_sponsee_relationships');
      });
    });

    it('fetches tasks on mount', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('tasks');
      });
    });
  });

  describe('greeting', () => {
    it('displays personalized greeting with user name', async () => {
      renderWithTheme(<HomeScreen />);

      await waitFor(() => {
        // Should greet the user
        expect(screen.getByText(/Test/)).toBeTruthy();
      });
    });
  });
});
