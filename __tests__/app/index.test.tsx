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
import Toast from 'react-native-toast-message';
import HomeScreen from '@/app/(app)/(tabs)/index';
import { Task, SponsorSponseeRelationship, Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

// Mock showConfirm
jest.mock('@/lib/alert', () => ({
  showConfirm: jest.fn(),
}));

// Import the mocked functions so we can control them in tests
const { showConfirm: mockShowConfirm } = jest.requireMock('@/lib/alert');

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
            eq: jest.fn().mockImplementation((field: string, _value: string) => {
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

const mockRefreshProfile = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    profile: mockProfile,
    user: { id: 'user-123' },
    session: {},
    loading: false,
    refreshProfile: mockRefreshProfile,
  })),
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
  DollarSign: () => null,
  MoreVertical: () => null,
  Edit3: () => null,
  EyeOff: () => null,
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

// Mock MoneySavedCard
const mockMoneySavedCardOnPress = jest.fn();
const mockMoneySavedCardOnHide = jest.fn();
const mockMoneySavedCardOnSetup = jest.fn();
jest.mock('@/components/dashboard/MoneySavedCard', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({
      variant,
      onPress,
      onHide,
      onSetup,
    }: {
      variant?: string;
      onPress?: () => void;
      onHide?: () => void;
      onSetup?: () => void;
    }) => {
      // Store callbacks for test access
      if (onPress) mockMoneySavedCardOnPress.mockImplementation(onPress);
      if (onHide) mockMoneySavedCardOnHide.mockImplementation(onHide);
      if (onSetup) mockMoneySavedCardOnSetup.mockImplementation(onSetup);

      return React.createElement(
        View,
        { testID: 'money-saved-card' },
        React.createElement(
          Text,
          null,
          variant === 'unconfigured' ? 'Set Up Savings Tracker' : 'Money Saved'
        ),
        onHide &&
          React.createElement(
            TouchableOpacity,
            { testID: 'hide-savings-button', onPress: onHide },
            React.createElement(Text, null, 'Hide')
          ),
        onPress &&
          React.createElement(
            TouchableOpacity,
            { testID: 'edit-savings-button', onPress: onPress },
            React.createElement(Text, null, 'Edit')
          ),
        onSetup &&
          React.createElement(
            TouchableOpacity,
            { testID: 'setup-savings-button', onPress: onSetup },
            React.createElement(Text, null, 'Setup')
          )
      );
    },
  };
});

// Mock EditSavingsSheet
jest.mock('@/components/sheets/EditSavingsSheet', () => {
  const React = require('react');
  const MockEditSavingsSheet = React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      present: jest.fn(),
      dismiss: jest.fn(),
    }));
    return React.createElement('View', { testID: 'edit-savings-sheet' });
  });
  MockEditSavingsSheet.displayName = 'EditSavingsSheet';
  return {
    __esModule: true,
    default: MockEditSavingsSheet,
  };
});

// Mock WhatsNewSheet
const mockWhatsNewPresent = jest.fn();
jest.mock('@/components/whats-new', () => {
  const React = require('react');
  const MockWhatsNewSheet = React.forwardRef(
    (
      { onDismiss }: { onDismiss?: () => void },
      ref: React.Ref<{ present: () => void; dismiss: () => void }>
    ) => {
      React.useImperativeHandle(ref, () => ({
        present: mockWhatsNewPresent,
        dismiss: jest.fn(),
      }));
      const { View, TouchableOpacity, Text } = require('react-native');
      return React.createElement(
        View,
        { testID: 'whats-new-sheet' },
        onDismiss &&
          React.createElement(
            TouchableOpacity,
            { testID: 'dismiss-whats-new', onPress: onDismiss },
            React.createElement(Text, null, 'Dismiss')
          )
      );
    }
  );
  MockWhatsNewSheet.displayName = 'WhatsNewSheet';
  return {
    __esModule: true,
    WhatsNewSheet: MockWhatsNewSheet,
  };
});

// Mock useWhatsNew hook
let mockShouldShowWhatsNew = false;
let mockReleases: {
  version: string;
  title: string;
  id: string;
  createdAt: string;
  features: [];
}[] = [];
const mockMarkAsSeen = jest.fn();
jest.mock('@/lib/whats-new', () => ({
  useWhatsNew: jest.fn(() => ({
    shouldShowWhatsNew: mockShouldShowWhatsNew,
    releases: mockReleases,
    markAsSeen: mockMarkAsSeen,
  })),
}));

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
    mockShowConfirm.mockClear();
    (Toast.show as jest.Mock).mockClear();
    mockRelationshipsAsSponsor = [];
    mockRelationshipsAsSponsee = [];
    mockTasks = [];
    mockDaysSober = 180;
    mockIsLoadingDaysSober = false;
    // Reset new mocks
    mockShouldShowWhatsNew = false;
    mockActiveRelease = null;
    mockMarkAsSeen.mockClear();
    mockWhatsNewPresent.mockClear();
    mockMoneySavedCardOnPress.mockClear();
    mockMoneySavedCardOnHide.mockClear();
    mockMoneySavedCardOnSetup.mockClear();
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
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      // Find and press disconnect button (via accessibility label)
      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Disconnect from'),
          'Disconnect',
          'Cancel',
          true
        );
      });
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

    it('opens task creation sheet when assign task button is pressed', async () => {
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      // Find and press the assign task button for sponsee
      const assignTaskButton = screen.getByLabelText('Assign task to Jane D.');
      fireEvent.press(assignTaskButton);

      // The task creation sheet should be rendered (it's mocked but the state updates happen)
      await waitFor(() => {
        expect(screen.getByTestId('task-creation-sheet')).toBeTruthy();
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
      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      // Find and press disconnect button (via accessibility label)
      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Disconnect from'),
          'Disconnect',
          'Cancel',
          true
        );
      });
    });

    it('successfully disconnects when confirmed', async () => {
      // Mock showConfirm to auto-confirm (return true)
      mockShowConfirm.mockResolvedValue(true);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Successfully disconnected' })
        );
      });
    });

    it('does not disconnect when cancelled', async () => {
      // Mock showConfirm to auto-cancel (return false)
      mockShowConfirm.mockResolvedValue(false);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      // Should not show success message
      await waitFor(
        () => {
          expect(Toast.show).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        },
        { timeout: 100 }
      );
    });

    it('shows error when disconnect fails', async () => {
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

      // Mock showConfirm to auto-confirm (return true)
      mockShowConfirm.mockResolvedValue(true);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      const disconnectButtons = screen.getAllByLabelText(/Disconnect from/);
      fireEvent.press(disconnectButtons[0]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Database error' })
        );
      });
    });
  });

  describe('Error Handling - Data Fetching', () => {
    it('handles sponsor relationships fetch error gracefully', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsor_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Failed to fetch sponsor relationships' },
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      render(<HomeScreen />);

      // Should render without crashing despite error
      await waitFor(() => {
        expect(screen.getByText('Your Sobriety Journey')).toBeTruthy();
      });
    });

    it('handles sponsee relationships fetch error gracefully', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsor_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }
                if (field === 'sponsee_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Failed to fetch sponsee relationships' },
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      render(<HomeScreen />);

      // Should render without crashing despite error
      await waitFor(() => {
        expect(screen.getByText('Your Sobriety Journey')).toBeTruthy();
      });
    });

    it('handles tasks fetch error gracefully', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsor_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }
                if (field === 'sponsee_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }
                return {
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Failed to fetch tasks' },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      render(<HomeScreen />);

      // Should render without crashing despite error
      await waitFor(() => {
        expect(screen.getByText('Your Sobriety Journey')).toBeTruthy();
      });
    });
  });

  describe('Money Saved Card', () => {
    it('shows configured MoneySavedCard when spend_amount and spend_frequency are set', async () => {
      // Update AuthContext mock to include spending data
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: 50,
          spend_frequency: 'daily',
          hide_savings_card: false,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: jest.fn(),
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('money-saved-card')).toBeTruthy();
        expect(screen.getByText('Money Saved')).toBeTruthy();
      });
    });

    it('shows unconfigured MoneySavedCard when spending data is not set', async () => {
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: null,
          spend_frequency: null,
          hide_savings_card: false,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: jest.fn(),
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('money-saved-card')).toBeTruthy();
        expect(screen.getByText('Set Up Savings Tracker')).toBeTruthy();
      });
    });

    it('hides MoneySavedCard when hide_savings_card is true', async () => {
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: 50,
          spend_frequency: 'daily',
          hide_savings_card: true,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: jest.fn(),
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('money-saved-card')).toBeNull();
      });
    });

    it('triggers onHide callback when hide button is pressed and confirmed', async () => {
      const mockRefreshProfile = jest.fn();
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: 50,
          spend_frequency: 'daily',
          hide_savings_card: false,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: mockRefreshProfile,
      });

      // Mock supabase update for profiles
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((_field: string) => {
                return {
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
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

      mockShowConfirm.mockResolvedValue(true);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('hide-savings-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('hide-savings-button'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Hide Savings Card?',
          'You can re-enable this from Settings > Dashboard anytime.',
          'Hide',
          'Cancel',
          false
        );
      });

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', text1: 'Card hidden from dashboard' })
        );
      });
    });

    it('does not hide card when confirmation is cancelled', async () => {
      const mockRefreshProfile = jest.fn();
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: 50,
          spend_frequency: 'daily',
          hide_savings_card: false,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: mockRefreshProfile,
      });

      mockShowConfirm.mockResolvedValue(false);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('hide-savings-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('hide-savings-button'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled();
      });

      // Should not call refreshProfile or show success toast
      expect(mockRefreshProfile).not.toHaveBeenCalled();
      expect(Toast.show).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });

    it('shows error toast when hide fails', async () => {
      const mockRefreshProfile = jest.fn();
      const useAuthModule = require('@/contexts/AuthContext');
      useAuthModule.useAuth.mockReturnValue({
        profile: {
          ...mockProfile,
          spend_amount: 50,
          spend_frequency: 'daily',
          hide_savings_card: false,
        },
        user: { id: 'user-123' },
        session: {},
        loading: false,
        refreshProfile: mockRefreshProfile,
      });

      // Mock supabase update to fail
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
            }),
          };
        }
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
              })),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
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

      mockShowConfirm.mockResolvedValue(true);

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('hide-savings-button')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('hide-savings-button'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Failed to hide card. Please try again.',
          })
        );
      });
    });
  });

  describe("What's New", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("auto-shows What's New sheet after delay when shouldShowWhatsNew is true", async () => {
      mockShouldShowWhatsNew = true;
      mockReleases = [
        {
          version: '1.0.0',
          title: 'New Features',
          id: 'r1',
          createdAt: '2024-12-01',
          features: [],
        },
      ];

      // Update the mock to return these values
      const useWhatsNewModule = require('@/lib/whats-new');
      useWhatsNewModule.useWhatsNew.mockReturnValue({
        shouldShowWhatsNew: true,
        releases: mockReleases,
        markAsSeen: mockMarkAsSeen,
      });

      render(<HomeScreen />);

      // Should not show immediately
      expect(mockWhatsNewPresent).not.toHaveBeenCalled();

      // Advance timers past the 2500ms delay
      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      expect(mockWhatsNewPresent).toHaveBeenCalled();
    });

    it("does not auto-show What's New when shouldShowWhatsNew is false", async () => {
      mockShouldShowWhatsNew = false;
      mockReleases = [];

      const useWhatsNewModule = require('@/lib/whats-new');
      useWhatsNewModule.useWhatsNew.mockReturnValue({
        shouldShowWhatsNew: false,
        releases: [],
        markAsSeen: mockMarkAsSeen,
      });

      render(<HomeScreen />);

      // Advance timers
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockWhatsNewPresent).not.toHaveBeenCalled();
    });

    it("calls markAsSeen when What's New sheet is dismissed", async () => {
      mockReleases = [
        {
          version: '1.0.0',
          title: 'New Features',
          id: 'r1',
          createdAt: '2024-12-01',
          features: [],
        },
      ];

      const useWhatsNewModule = require('@/lib/whats-new');
      useWhatsNewModule.useWhatsNew.mockReturnValue({
        shouldShowWhatsNew: false,
        releases: mockReleases,
        markAsSeen: mockMarkAsSeen,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('whats-new-sheet')).toBeTruthy();
      });

      // Press dismiss button
      fireEvent.press(screen.getByTestId('dismiss-whats-new'));

      await waitFor(() => {
        expect(mockMarkAsSeen).toHaveBeenCalled();
      });
    });

    it('does not render WhatsNewSheet when releases array is empty', async () => {
      mockReleases = [];

      const useWhatsNewModule = require('@/lib/whats-new');
      useWhatsNewModule.useWhatsNew.mockReturnValue({
        shouldShowWhatsNew: false,
        releases: [],
        markAsSeen: mockMarkAsSeen,
      });

      render(<HomeScreen />);

      await waitFor(() => {
        expect(screen.queryByTestId('whats-new-sheet')).toBeNull();
      });
    });
  });
});
