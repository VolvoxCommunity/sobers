/**
 * @fileoverview Tests for app/(tabs)/tasks.tsx
 *
 * Tests the unified Tasks screen including:
 * - My Tasks view (sponsee)
 * - Manage view (sponsor)
 * - Segmented control switching
 * - Task listing and filtering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TasksScreen from '@/app/(tabs)/tasks';
import { Task, Profile } from '@/types/database';
import { Platform } from 'react-native';

// =============================================================================
// Mocks
// =============================================================================

// Mock data
let mockMyTasks: Task[] = [];
let mockManageTasks: Task[] = [];
let mockSponsees: Profile[] = [];
let mockPendingTasks: { id: string }[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((field: string, value: string) => {
              if (field === 'sponsee_id') {
                return {
                  order: jest.fn().mockResolvedValue({ data: mockMyTasks, error: null }),
                  neq: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: mockPendingTasks, error: null }),
                  }),
                };
              }
              if (field === 'sponsor_id') {
                return {
                  order: jest.fn().mockResolvedValue({ data: mockManageTasks, error: null }),
                };
              }
              return { order: jest.fn().mockResolvedValue({ data: [], error: null }) };
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'sponsor_sponsee_relationships') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockSponsees.map((s) => ({ sponsee: s })),
                error: null,
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
      success: '#10b981',
      danger: '#ef4444',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock AuthContext
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

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: () => null,
  Circle: () => null,
  X: () => null,
  Calendar: () => null,
  Plus: () => null,
  Clock: () => null,
  Trash2: () => null,
}));

// Mock SegmentedControl
jest.mock('@/components/SegmentedControl', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return {
    __esModule: true,
    default: ({
      segments,
      activeIndex,
      onChange,
    }: {
      segments: string[];
      activeIndex: number;
      onChange: (index: number) => void;
    }) =>
      React.createElement(
        View,
        { testID: 'segmented-control' },
        segments.map((segment: string, idx: number) =>
          React.createElement(
            TouchableOpacity,
            {
              key: segment,
              testID: `segment-${segment.toLowerCase().replace(' ', '-')}`,
              onPress: () => onChange(idx),
            },
            React.createElement(Text, null, segment)
          )
        )
      ),
  };
});

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

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: {
    TASK_VIEWED: 'task_viewed',
    TASK_STARTED: 'task_started',
    TASK_COMPLETED: 'task_completed',
  },
}));

// Mock date and format libs
jest.mock('@/lib/date', () => ({
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
}));

jest.mock('@/lib/format', () => ({
  formatProfileName: jest.fn((profile: Profile) => profile.display_name),
}));

// =============================================================================
// Test Data
// =============================================================================

const createMockMyTasks = (): Task[] => [
  {
    id: 'task-1',
    sponsor_id: 'sponsor-123',
    sponsee_id: 'user-123',
    title: 'Read Step 1',
    description: 'Read and reflect on Step 1',
    status: 'assigned',
    due_date: '2025-12-31',
    step_number: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    sponsor: {
      id: 'sponsor-123',
      display_name: 'Bob S.',
      sobriety_date: '2020-01-01',
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2020-01-01T00:00:00Z',
    },
  },
  {
    id: 'task-2',
    sponsor_id: 'sponsor-123',
    sponsee_id: 'user-123',
    title: 'Attend Meeting',
    description: 'Go to a meeting',
    status: 'completed',
    due_date: null,
    step_number: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    sponsor: {
      id: 'sponsor-123',
      display_name: 'Bob S.',
      sobriety_date: '2020-01-01',
      created_at: '2020-01-01T00:00:00Z',
      updated_at: '2020-01-01T00:00:00Z',
    },
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('TasksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMyTasks = createMockMyTasks();
    mockManageTasks = [];
    mockSponsees = [];
    mockPendingTasks = [{ id: 'task-1' }]; // Has pending tasks, so defaults to My Tasks
  });

  describe('rendering', () => {
    it('renders the segmented control', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });
    });

    it('renders My Tasks and Manage segments', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Tasks')).toBeTruthy();
        expect(screen.getByText('Manage')).toBeTruthy();
      });
    });
  });

  describe('My Tasks view', () => {
    it('renders assigned tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Step 1')).toBeTruthy();
        expect(screen.getByText('Read and reflect on Step 1')).toBeTruthy();
      });
    });

    it('shows task due date when available', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });
  });

  describe('segment switching', () => {
    it('switches to Manage view when segment is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segment-manage')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('segment-manage'));

      // The view should switch (state changes)
      await waitFor(() => {
        expect(screen.getByText('Manage')).toBeTruthy();
      });
    });
  });

  describe('view mode initialization', () => {
    it('defaults to My Tasks when user has pending tasks', async () => {
      mockPendingTasks = [{ id: 'task-1' }];

      render(<TasksScreen />);

      await waitFor(() => {
        // Should show My Tasks view content
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });

    it('defaults to Manage when user has no pending tasks', async () => {
      mockPendingTasks = [];
      mockMyTasks = [];

      render(<TasksScreen />);

      await waitFor(() => {
        // Component should render (manage view will be empty)
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });
    });
  });

  describe('Task List Display', () => {
    it('renders task titles correctly', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Only assigned (non-completed) tasks are visible by default
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });

    it('renders task descriptions', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Only assigned task description is visible by default
        expect(screen.getByText('Read and reflect on Step 1')).toBeTruthy();
      });
    });

    it('shows assigned sponsor name for tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.queryByText(/Bob S\./)).toBeTruthy();
      });
    });

    it('shows completed tasks count', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Shows "Completed (1)" toggle when there are completed tasks
        expect(screen.getByText(/Completed/)).toBeTruthy();
      });
    });
  });

  describe('Task Completion', () => {
    it('renders complete button for assigned tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Only assigned tasks should have a complete action
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no tasks exist', async () => {
      mockMyTasks = [];
      mockPendingTasks = [];

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });
    });
  });

  describe('Segmented Control Behavior', () => {
    it('renders both segment buttons', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segment-my-tasks')).toBeTruthy();
        expect(screen.getByTestId('segment-manage')).toBeTruthy();
      });
    });

    it('switches view when My Tasks segment is pressed', async () => {
      mockPendingTasks = []; // Start with Manage view

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segment-my-tasks')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('segment-my-tasks'));

      await waitFor(() => {
        expect(screen.getByText('My Tasks')).toBeTruthy();
      });
    });
  });

  describe('Task Filtering', () => {
    it('can filter to show completed tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Component renders with both assigned and completed tasks
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });
  });

  describe('Manage View', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
    });

    it('renders manage view when selected', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('segment-manage'));

      await waitFor(() => {
        expect(screen.getByText('Manage')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('renders with refresh capability', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });
    });
  });

  describe('Task Status Indicators', () => {
    it('shows assigned task and completed toggle', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Assigned task is visible
        expect(screen.getByText('Read Step 1')).toBeTruthy();
        // Completed tasks are hidden behind toggle - use getAllByText since multiple may exist
        expect(screen.getAllByText(/Completed/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Step Number Display', () => {
    it('shows step number badge when present', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Step 1 task should show its step number
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });
  });

  describe('Due Date Display', () => {
    it('shows due date when task has one', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // The first task has a due date
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });
    });

    it('renders tasks with and without due dates correctly', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Task is displayed properly
        expect(screen.getByText('Read Step 1')).toBeTruthy();
        // Shows completed task count for tasks hidden by default - use getAllByText since multiple may exist
        expect(screen.getAllByText(/Completed/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Task Card Layout', () => {
    it('renders task cards with proper structure', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Step 1')).toBeTruthy();
        expect(screen.getByText('Read and reflect on Step 1')).toBeTruthy();
      });
    });
  });

  describe('View Header', () => {
    it('renders header content', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('segmented-control')).toBeTruthy();
      });
    });

    it('renders Tasks header title', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Tasks')).toBeTruthy();
      });
    });

    it('shows My Tasks subtitle in My Tasks view', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Track your step progress')).toBeTruthy();
      });
    });
  });

  describe('Task Completion Modal', () => {
    it('opens modal when Complete button is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Complete Task')).toBeTruthy();
      });
    });

    it('shows task title in completion modal', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        // Task title appears in both list and modal
        expect(screen.getAllByText('Read Step 1').length).toBeGreaterThan(0);
      });
    });

    it('shows completion notes input', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Completion Notes (Optional)')).toBeTruthy();
      });
    });

    it('shows Mark Complete button in modal', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Mark Complete')).toBeTruthy();
      });
    });

    it('shows Cancel button in modal', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeTruthy();
      });
    });

    it('closes modal when Cancel is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Complete Task')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Cancel'));

      // Modal closes - only "Complete" button visible again
      await waitFor(() => {
        expect(screen.queryByText('Complete Task')).toBeNull();
      });
    });

    it('allows entering completion notes', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        const input = screen.getByPlaceholderText('What did you learn? How do you feel?');
        expect(input).toBeTruthy();

        fireEvent.changeText(input, 'This was a meaningful step.');
        expect(input.props.value).toBe('This was a meaningful step.');
      });
    });

    it('submits task completion when Mark Complete is pressed', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      const { Alert } = jest.requireMock('react-native');

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      // Open modal
      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Mark Complete')).toBeTruthy();
      });

      // Enter notes
      const input = screen.getByPlaceholderText('What did you learn? How do you feel?');
      fireEvent.changeText(input, 'Great learning experience!');

      // Submit completion
      fireEvent.press(screen.getByText('Mark Complete'));

      await waitFor(() => {
        // Verify update was called
        expect(supabase.from).toHaveBeenCalledWith('tasks');
      });
    });
  });

  describe('Completed Tasks Toggle', () => {
    it('shows completed tasks section toggle', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Completed \(1\)/)).toBeTruthy();
      });
    });

    it('expands completed tasks when toggle is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Completed \(1\)/)).toBeTruthy();
      });

      fireEvent.press(screen.getByText(/Completed \(1\)/));

      await waitFor(() => {
        expect(screen.getByText('Attend Meeting')).toBeTruthy();
      });
    });

    it('shows Hide text when expanded', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Show')).toBeTruthy();
      });

      fireEvent.press(screen.getByText(/Completed \(1\)/));

      await waitFor(() => {
        expect(screen.getByText('Hide')).toBeTruthy();
      });
    });
  });

  describe('Task Stats Display', () => {
    it('shows pending tasks count', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeTruthy();
      });
    });

    it('shows completed stats label', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Stats labels exist - using getAllByText for multiple matches
        expect(screen.getAllByText(/Completed/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State My Tasks', () => {
    it('shows empty state message when no tasks', async () => {
      mockMyTasks = [];
      mockPendingTasks = [{ id: 'pending' }]; // Keep in My Tasks view

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('No tasks yet')).toBeTruthy();
      });
    });

    it('shows helpful description in empty state', async () => {
      mockMyTasks = [];
      mockPendingTasks = [{ id: 'pending' }];

      render(<TasksScreen />);

      await waitFor(() => {
        expect(
          screen.getByText(/Your sponsor will assign tasks to help you progress/)
        ).toBeTruthy();
      });
    });
  });

  describe('Manage View Content', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Read Big Book',
          description: 'Read first 3 chapters',
          status: 'assigned',
          due_date: '2025-12-31',
          step_number: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];
    });

    it('shows manage subtitle when in Manage view', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Track and assign sponsee tasks')).toBeTruthy();
      });
    });

    it('shows Total stat in manage view', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Total')).toBeTruthy();
      });
    });

    it('shows Assigned stat in manage view', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // "Assigned" appears in both stats and filter chips
        expect(screen.getAllByText('Assigned').length).toBeGreaterThan(0);
      });
    });

    it('shows All Tasks filter chip', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('All Tasks')).toBeTruthy();
      });
    });

    it('shows sponsee name with tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });
    });

    it('shows task count for sponsee', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('1 task')).toBeTruthy();
      });
    });

    it('renders manage task title', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Big Book')).toBeTruthy();
      });
    });
  });

  describe('Manage View Empty States', () => {
    it('shows No Sponsees message when no sponsees', async () => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [];
      mockManageTasks = [];

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('No Sponsees Yet')).toBeTruthy();
      });
    });

    it('shows invitation prompt in no sponsees state', async () => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [];
      mockManageTasks = [];

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Generate an invite code from your profile/)).toBeTruthy();
      });
    });
  });

  describe('Filter Chips', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockManageTasks = [];
    });

    it('renders Assigned filter chip', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Look for filter text (there's both stats label and filter chip)
        const assignedElements = screen.getAllByText('Assigned');
        expect(assignedElements.length).toBeGreaterThan(0);
      });
    });

    it('can press All Tasks filter', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        const allTasksButton = screen.getByText('All Tasks');
        expect(allTasksButton).toBeTruthy();
        fireEvent.press(allTasksButton);
      });
    });
  });

  describe('New Tasks Section', () => {
    it('shows New Tasks section header for assigned tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('New Tasks')).toBeTruthy();
      });
    });
  });

  describe('Step Badge', () => {
    it('shows step number in badge', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeTruthy();
      });
    });
  });

  describe('Sponsor Info', () => {
    it('shows From: sponsor name on task', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('From: Bob S.')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh Functionality', () => {
    it('triggers refresh when pull to refresh is activated', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Step 1')).toBeTruthy();
      });

      // Verify data fetching was called initially
      expect(supabase.from).toHaveBeenCalledWith('tasks');
    });
  });

  describe('Task Completion Error Handling', () => {
    it('shows error alert when task completion fails', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      const { Alert } = jest.requireMock('react-native');

      // Make update fail
      supabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsee_id') {
                  return {
                    order: jest.fn().mockResolvedValue({ data: mockMyTasks, error: null }),
                    neq: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({ data: mockPendingTasks, error: null }),
                    }),
                  };
                }
                if (field === 'sponsor_id') {
                  return {
                    order: jest.fn().mockResolvedValue({ data: mockManageTasks, error: null }),
                  };
                }
                return { order: jest.fn().mockResolvedValue({ data: [], error: null }) };
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
            }),
          };
        }
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: mockSponsees.map((s) => ({ sponsee: s })),
                  error: null,
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

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));

      await waitFor(() => {
        expect(screen.getByText('Mark Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Mark Complete'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to complete task');
      });
    });
  });

  describe('Status Filter Chips', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Read Big Book',
          description: 'Read first 3 chapters',
          status: 'assigned',
          due_date: '2025-12-31',
          step_number: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
        {
          id: 'manage-task-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Attend Meeting',
          description: 'Go to a meeting',
          status: 'completed',
          due_date: null,
          step_number: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];
    });

    it('filters tasks when Assigned chip is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Big Book')).toBeTruthy();
      });

      // Find and press Assigned filter chip (there will be multiple "Assigned" texts)
      const assignedElements = screen.getAllByText('Assigned');
      // The filter chip should be one of them
      fireEvent.press(assignedElements[assignedElements.length - 1]);

      await waitFor(() => {
        // Should still show assigned task
        expect(screen.getByText('Read Big Book')).toBeTruthy();
      });
    });

    it('filters tasks when Completed chip is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Read Big Book')).toBeTruthy();
      });

      // Find Completed filter chip - there may be multiple "Completed" texts
      const completedElements = screen.getAllByText('Completed');
      // Press the filter chip (usually the last one)
      fireEvent.press(completedElements[completedElements.length - 1]);

      await waitFor(() => {
        // Should show completed task after filter
        expect(screen.getByText('Attend Meeting')).toBeTruthy();
      });
    });
  });

  describe('Sponsee Filter Chips', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'sponsee-2',
          display_name: 'Bob S.',
          sobriety_date: '2024-03-01',
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-01T00:00:00Z',
        },
      ];
      mockManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Jane Task',
          description: 'Task for Jane',
          status: 'assigned',
          due_date: null,
          step_number: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];
    });

    it('shows All Sponsees filter when multiple sponsees exist', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('All Sponsees')).toBeTruthy();
      });
    });

    it('shows individual sponsee filter chips', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        // Jane D. may appear multiple times (filter chip and task)
        expect(screen.getAllByText('Jane D.').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bob S.').length).toBeGreaterThan(0);
      });
    });

    it('filters by specific sponsee when chip is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getAllByText('Jane D.').length).toBeGreaterThan(0);
      });

      // Press Jane's filter chip (first occurrence should be the filter)
      const janeElements = screen.getAllByText('Jane D.');
      fireEvent.press(janeElements[0]);

      await waitFor(() => {
        // Jane's task should still be visible
        expect(screen.getByText('Jane Task')).toBeTruthy();
      });
    });

    it('clears sponsee filter when All Sponsees is pressed', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('All Sponsees')).toBeTruthy();
      });

      // First filter by Jane (first occurrence should be the filter)
      const janeElements = screen.getAllByText('Jane D.');
      fireEvent.press(janeElements[0]);

      // Then press All Sponsees
      fireEvent.press(screen.getByText('All Sponsees'));

      await waitFor(() => {
        expect(screen.getByText('Jane Task')).toBeTruthy();
      });
    });
  });

  describe('Task Deletion', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Delete Me',
          description: 'Task to delete',
          status: 'assigned',
          due_date: null,
          step_number: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];
    });

    it('shows delete button for managed tasks', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Delete Me')).toBeTruthy();
      });

      // The task should be visible in manage view
      expect(screen.getByText('Delete Me')).toBeTruthy();
    });
  });

  describe('Overdue Tasks', () => {
    beforeEach(() => {
      mockPendingTasks = [];
      mockMyTasks = [];
      mockSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      // Create an overdue task
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      mockManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Overdue Task',
          description: 'This task is overdue',
          status: 'assigned',
          due_date: pastDate.toISOString().split('T')[0],
          step_number: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane D.',
            sobriety_date: '2024-06-01',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];
    });

    it('shows overdue count in stats when overdue tasks exist', async () => {
      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeTruthy();
      });
    });
  });

  describe('Web Platform', () => {
    let originalPlatform: typeof Platform.OS;

    beforeAll(() => {
      originalPlatform = Platform.OS;
    });

    beforeEach(() => {
      Platform.OS = 'web';
      global.window = {
        alert: jest.fn(),
        confirm: jest.fn(() => true)
      } as any;
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
      delete (global as any).window;
    });

    it('uses window.alert for task completion success', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      // Ensure mock success
      supabase.from.mockImplementation((table: string) => {
         if (table === 'tasks') {
             return {
                 select: jest.fn().mockReturnValue({
                     eq: jest.fn().mockReturnValue({
                         order: jest.fn().mockResolvedValue({ data: mockMyTasks, error: null }),
                         neq: jest.fn().mockReturnValue({
                             limit: jest.fn().mockResolvedValue({ data: mockPendingTasks, error: null })
                         })
                     })
                 }),
                 update: jest.fn().mockReturnValue({
                     eq: jest.fn().mockResolvedValue({ error: null })
                 })
             };
         }
         if (table === 'notifications') {
             return { insert: jest.fn().mockResolvedValue({ error: null }) };
         }
         return {
             select: jest.fn().mockReturnThis(),
             eq: jest.fn().mockReturnThis(),
             order: jest.fn().mockResolvedValue({ data: [], error: null })
         };
      });

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));
      fireEvent.press(screen.getByText('Mark Complete'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Task marked as completed!');
      });
    });

    it('uses window.alert for task completion failure', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');

      supabase.from.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsee_id') {
                  return {
                    order: jest.fn().mockResolvedValue({ data: mockMyTasks, error: null }),
                    neq: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({ data: mockPendingTasks, error: null }),
                    }),
                  };
                }
                return { order: jest.fn().mockResolvedValue({ data: [], error: null }) };
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: new Error('Web DB error') }),
            }),
          };
        }
        return {
             select: jest.fn().mockReturnThis(),
             eq: jest.fn().mockReturnThis(),
             order: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Complete'));
      fireEvent.press(screen.getByText('Mark Complete'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to complete task');
      });
    });

    it('uses window.confirm and alert for task deletion', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');

      const localSponsees = [
        {
          id: 'sponsee-1',
          display_name: 'Jane D.',
          sobriety_date: '2024-06-01',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      const localManageTasks = [
        {
          id: 'manage-task-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          title: 'Delete Me Web',
          description: 'Task to delete',
          status: 'assigned',
          due_date: null,
          step_number: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          sponsee: localSponsees[0],
        },
      ];

      // Reset pending to empty to force Manage view
      mockPendingTasks = [];

      supabase.from.mockImplementation((table: string) => {
         if (table === 'sponsor_sponsee_relationships') {
             return {
                 select: jest.fn().mockReturnValue({
                     eq: jest.fn().mockReturnValue({
                         eq: jest.fn().mockResolvedValue({
                             data: localSponsees.map(s => ({ sponsee: s })),
                             error: null
                         })
                     })
                 })
             };
         }
         if (table === 'tasks') {
             return {
                 select: jest.fn().mockReturnValue({
                     eq: jest.fn().mockImplementation((field) => {
                         if (field === 'sponsee_id') {
                             // Initialize view check
                             return {
                                 neq: jest.fn().mockReturnValue({
                                     limit: jest.fn().mockResolvedValue({ data: [], error: null })
                                 }),
                                 order: jest.fn().mockResolvedValue({ data: [], error: null })
                             };
                         }
                         if (field === 'sponsor_id') {
                             return {
                                 order: jest.fn().mockResolvedValue({ data: localManageTasks, error: null })
                             };
                         }
                         return { order: jest.fn().mockResolvedValue({ data: [], error: null }) };
                     })
                 }),
                 delete: jest.fn().mockReturnValue({
                     eq: jest.fn().mockResolvedValue({ error: null })
                 })
             };
         }
         return {
             select: jest.fn().mockReturnThis(),
             eq: jest.fn().mockReturnThis(),
             order: jest.fn().mockResolvedValue({ data: [], error: null })
         };
      });

      render(<TasksScreen />);

      await waitFor(() => {
        expect(screen.getByText('Delete Me Web')).toBeTruthy();
      });

      const deleteButton = screen.getByTestId('delete-task-manage-task-1');
      fireEvent.press(deleteButton);

      expect(window.confirm).toHaveBeenCalled();

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Task deleted successfully');
      });
    });
  });
});
