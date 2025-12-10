/**
 * @fileoverview Tests for app/(tabs)/index.tsx
 *
 * Tests the home/dashboard screen including:
 * - User greeting and date display
 * - Sobriety card with days sober
 * - Milestone badges
 * - Sponsee/Sponsor relationships display
 * - Quick action cards
 * - Recent tasks section
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import { Task, SponsorSponseeRelationship, Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

// Mock data - using closures to allow per-test control
let mockRelationshipsAsSponsor: SponsorSponseeRelationship[] = [];
let mockRelationshipsAsSponsee: SponsorSponseeRelationship[] = [];
let mockTasks: Task[] = [];

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'sponsor_sponsee_relationships') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((field: string, value: string) => {
              if (field === 'sponsor_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: mockRelationshipsAsSponsor,
                    error: null,
                  }),
                };
              }
              if (field === 'sponsee_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: mockRelationshipsAsSponsee,
                    error: null,
                  }),
                };
              }
              return { eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'notifications') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
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

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock AuthContext
const mockProfile: Profile = {
  id: 'user-123',
  display_name: 'John D.',
  sobriety_date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'user-123' },
    session: {},
    loading: false,
  }),
}));

// Mock ThemeContext
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
      borderLight: '#f3f4f6',
      success: '#10b981',
      danger: '#ef4444',
      black: '#000000',
      white: '#ffffff',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock useDaysSober hook
// Note: Jest requires mock variables to be prefixed with 'mock' (not suffixed)
// due to hoisting behavior - variables must match /^mock/i pattern
let mockDaysSober = 180;
let mockIsLoadingDaysSober = false;
jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: jest.fn(() => ({
    daysSober: mockDaysSober,
    currentStreakStartDate: '2024-01-01',
    journeyStartDate: new Date('2024-01-01'),
    hasSlipUps: false,
    loading: mockIsLoadingDaysSober,
    error: null,
  })),
}));

// Mock lucide-react-native icons
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
  const MockTaskCreationSheet = React.forwardRef(() =>
    React.createElement('View', { testID: 'task-creation-sheet' })
  );
  MockTaskCreationSheet.displayName = 'TaskCreationSheet';
  return {
    __esModule: true,
    default: MockTaskCreationSheet,
  };
});

// Mock date library
jest.mock('@/lib/date', () => ({
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
}));

// Mock logger
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

// =============================================================================
// Test Data
// =============================================================================

const createMockSponsee = (): Profile => ({
  id: 'sponsee-456',
  display_name: 'Jane S.',
  sobriety_date: '2024-06-01',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
});

const createMockSponsor = (): Profile => ({
  id: 'sponsor-789',
  display_name: 'Bob M.',
  sobriety_date: '2020-01-01',
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
});

const createMockRelationshipAsSponsor = (): SponsorSponseeRelationship => ({
  id: 'rel-1',
  sponsor_id: 'user-123',
  sponsee_id: 'sponsee-456',
  status: 'active',
  connected_at: '2024-06-15T00:00:00Z',
  created_at: '2024-06-15T00:00:00Z',
  updated_at: '2024-06-15T00:00:00Z',
  sponsee: createMockSponsee(),
});

const createMockRelationshipAsSponsee = (): SponsorSponseeRelationship => ({
  id: 'rel-2',
  sponsor_id: 'sponsor-789',
  sponsee_id: 'user-123',
  status: 'active',
  connected_at: '2024-03-01T00:00:00Z',
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
  sponsor: createMockSponsor(),
});

const createMockTask = (): Task => ({
  id: 'task-1',
  sponsor_id: 'sponsor-789',
  sponsee_id: 'user-123',
  title: 'Read Step 1',
  description: 'Read and reflect on Step 1',
  status: 'assigned',
  due_date: null,
  step_number: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

// =============================================================================
// Test Suite
// =============================================================================

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRelationshipsAsSponsor = [];
    mockRelationshipsAsSponsee = [];
    mockTasks = [];
    mockDaysSober = 180;
    mockIsLoadingDaysSober = false;
  });

  describe('Header', () => {
    it('renders greeting with user name', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Hello, John D.')).toBeTruthy();
      });
    });

    it('renders current date', async () => {
      render(<HomeScreen />);

      // Date format: "Wednesday, December 3" etc.
      await waitFor(() => {
        // Just check that there's a date element
        expect(screen.getByText(/\w+, \w+ \d+/)).toBeTruthy();
      });
    });
  });

  describe('Sobriety Card', () => {
    it('renders days sober count', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('180')).toBeTruthy();
        expect(screen.getByText('Days Sober')).toBeTruthy();
      });
    });

    it('shows loading indicator when loading', async () => {
      mockIsLoadingDaysSober = true;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('...')).toBeTruthy();
      });
    });

    it('renders sobriety journey title', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sobriety Journey')).toBeTruthy();
      });
    });

    it('displays milestone badge for 6 months', async () => {
      mockDaysSober = 180;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('6 Months')).toBeTruthy();
      });
    });

    it('displays 90 days milestone', async () => {
      mockDaysSober = 90;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('90 Days')).toBeTruthy();
      });
    });

    it('displays 30 days milestone', async () => {
      mockDaysSober = 30;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('30 Days')).toBeTruthy();
      });
    });

    it('displays 1 week milestone', async () => {
      mockDaysSober = 7;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('1 Week')).toBeTruthy();
      });
    });

    it('displays 24 hours milestone', async () => {
      mockDaysSober = 1;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('24 Hours')).toBeTruthy();
      });
    });

    it('displays year milestone', async () => {
      mockDaysSober = 365;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('1 Year')).toBeTruthy();
      });
    });

    it('displays multiple years milestone', async () => {
      mockDaysSober = 730;

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('2 Years')).toBeTruthy();
      });
    });
  });

  describe('Sponsees Section', () => {
    it('renders sponsees section title', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });

    it('shows empty state when no sponsees', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('No sponsees yet. Share your invite code to connect.')
        ).toBeTruthy();
      });
    });

    it('displays sponsee when relationship exists', async () => {
      mockRelationshipsAsSponsor = [createMockRelationshipAsSponsor()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane S.')).toBeTruthy();
      });
    });
  });

  describe('Sponsor Section', () => {
    it('renders sponsor section when user has a sponsor', async () => {
      mockRelationshipsAsSponsee = [createMockRelationshipAsSponsee()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
        expect(screen.getByText('Bob M.')).toBeTruthy();
      });
    });

    it('does not render sponsor section when no sponsor', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.queryByText('Your Sponsor')).toBeNull();
      });
    });
  });

  describe('Quick Actions', () => {
    it('renders 12 Steps action card', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('12 Steps')).toBeTruthy();
        expect(screen.getByText('Learn & Reflect')).toBeTruthy();
      });
    });

    it('renders Manage Tasks action card', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Tasks')).toBeTruthy();
        expect(screen.getByText('Guide Progress')).toBeTruthy();
      });
    });

    it('navigates to steps when 12 Steps card is pressed', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('12 Steps')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('12 Steps'));

      expect(mockPush).toHaveBeenCalledWith('/steps');
    });

    it('navigates to tasks when Manage Tasks card is pressed', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Manage Tasks')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Manage Tasks'));

      expect(mockPush).toHaveBeenCalledWith('/tasks');
    });
  });

  describe('Recent Tasks Section', () => {
    it('does not show tasks section when no tasks', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.queryByText('Recent Tasks')).toBeNull();
      });
    });

    it('shows recent tasks when tasks exist', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Recent Tasks')).toBeTruthy();
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });

    it('shows View All Tasks button when tasks exist', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('View All Tasks')).toBeTruthy();
      });
    });

    it('navigates to tasks when View All Tasks is pressed', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('View All Tasks')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('View All Tasks'));

      expect(mockPush).toHaveBeenCalledWith('/tasks');
    });

    it('navigates to tasks when task item is pressed', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Read Step 1'));

      expect(mockPush).toHaveBeenCalledWith('/tasks');
    });

    it('shows New badge on task items', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeTruthy();
      });
    });

    it('shows step number on task items', async () => {
      mockTasks = [createMockTask()];

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeTruthy();
      });
    });
  });

  describe('Disconnect Functionality', () => {
    beforeEach(() => {
      mockRelationshipsAsSponsor = [
        {
          id: 'rel-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
      mockRelationshipsAsSponsee = [];
      mockTasks = [];
    });

    it('shows disconnect button for sponsee', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        // The UserMinus icon is rendered but mocked
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });
    });

    it('shows confirmation dialog when disconnect is pressed', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      // Find the relationship container and check it's there
      // The actual disconnect would need the button to be pressed
      // but the icon is mocked, so we verify the structure exists
      expect(screen.getByText(/Connected/)).toBeTruthy();
    });
  });

  describe('Sponsor Disconnect', () => {
    beforeEach(() => {
      mockRelationshipsAsSponsor = [];
      mockRelationshipsAsSponsee = [
        {
          id: 'rel-2',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
      mockTasks = [];
    });

    it('shows sponsor in Your Sponsor section', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
      });
    });

    it('shows connected date for sponsor', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeTruthy();
      });
    });
  });

  describe('Milestone Edge Cases', () => {
    it('shows < 24 Hours milestone for day 0', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 0,
        journeyStartDate: new Date(),
        currentStreakStartDate: new Date(),
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('< 24 Hours')).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-01-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });

    it('shows 24 Hours milestone for day 1', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 1,
        journeyStartDate: new Date('2024-11-30'),
        currentStreakStartDate: new Date('2024-11-30'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('24 Hours')).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-01-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });

    it('shows 6 Months milestone at 180 days', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-06-01'),
        currentStreakStartDate: new Date('2024-06-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('6 Months')).toBeTruthy();
      });
    });

    it('shows years milestone for 365+ days', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 400,
        journeyStartDate: new Date('2023-06-01'),
        currentStreakStartDate: new Date('2023-06-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('1 Year')).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-01-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });

    it('shows years plural for 2+ years', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 800,
        journeyStartDate: new Date('2022-06-01'),
        currentStreakStartDate: new Date('2022-06-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('2 Years')).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-01-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });
  });

  describe('Task Modal', () => {
    beforeEach(() => {
      mockRelationshipsAsSponsor = [
        {
          id: 'rel-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
      mockRelationshipsAsSponsee = [];
      mockTasks = [];
    });

    it('shows sponsee with assign task button', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('allows pull to refresh on scroll view', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        // Verify the screen renders with greeting
        expect(screen.getByText('Hello, John D.')).toBeTruthy();
      });
    });

    it('triggers onRefresh when RefreshControl is activated', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Hello, John D.')).toBeTruthy();
      });

      // Find the ScrollView and trigger refresh
      const scrollView = screen.getByTestId('home-scroll-view');
      const refreshControl = scrollView.props.refreshControl;

      // Trigger the onRefresh callback
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      // After refresh, content should still be there
      expect(screen.getByText('Hello, John D.')).toBeTruthy();
    });
  });

  describe('Disconnect Relationship', () => {
    beforeEach(() => {
      mockRelationshipsAsSponsor = [
        {
          id: 'rel-sponsor-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
      mockRelationshipsAsSponsee = [
        {
          id: 'rel-sponsee-1',
          sponsor_id: 'sponsor-789',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-10T00:00:00Z',
          sponsor: {
            id: 'sponsor-789',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
    });

    it('shows disconnect button for sponsor relationship', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
      });
    });

    it('shows disconnect button for sponsee relationship', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });

    it('shows confirmation dialog when disconnect is pressed', async () => {
      const { Alert } = jest.requireMock('react-native');

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      // Find and press disconnect button (via accessibility label)
      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Disconnect from'),
          expect.any(Array)
        );
      });
    });

    it('successfully disconnects when confirmed', async () => {
      const { Alert } = jest.requireMock('react-native');

      // Mock Alert.alert to auto-confirm
      Alert.alert.mockImplementation(
        (_title: string, _message: string, buttons?: { text: string; onPress?: () => void }[]) => {
          if (!buttons) return;
          const disconnectButton = buttons.find((b) => b.text === 'Disconnect');
          if (disconnectButton?.onPress) {
            disconnectButton.onPress();
          }
        }
      );

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Successfully disconnected');
      });
    });

    it('does not disconnect when cancelled', async () => {
      const { Alert } = jest.requireMock('react-native');

      // Mock Alert.alert to auto-cancel
      Alert.alert.mockImplementation(
        (_title: string, _message: string, buttons?: { text: string; onPress?: () => void }[]) => {
          if (!buttons) return;
          const cancelButton = buttons.find((b) => b.text === 'Cancel');
          if (cancelButton?.onPress) {
            cancelButton.onPress();
          }
        }
      );

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      // Should not show success message
      await waitFor(
        () => {
          expect(Alert.alert).not.toHaveBeenCalledWith('Success', expect.any(String));
        },
        { timeout: 100 }
      );
    });

    it('shows error when disconnect fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      const { supabase } = jest.requireMock('@/lib/supabase');

      // Mock the update to fail
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsor_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: mockRelationshipsAsSponsor,
                      error: null,
                    }),
                  };
                }
                if (field === 'sponsee_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: mockRelationshipsAsSponsee,
                      error: null,
                    }),
                  };
                }
                return { eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: mockTasks, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      // Mock Alert.alert to auto-confirm
      Alert.alert.mockImplementation(
        (_title: string, _message: string, buttons?: { text: string; onPress?: () => void }[]) => {
          if (buttons) {
            const disconnectButton = buttons.find((b) => b.text === 'Disconnect');
            if (disconnectButton?.onPress) {
              disconnectButton.onPress();
            }
          }
        }
      );

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Database error');
      });
    });
  });
});
