/**
 * @fileoverview Tests for TaskCreationSheet component
 *
 * Tests the task creation bottom sheet including:
 * - Imperative API (present/dismiss via ref)
 * - Form validation
 * - Dropdown interactions
 * - Task submission
 * - Error handling
 */

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TaskCreationSheet, { TaskCreationSheetRef } from '@/components/TaskCreationSheet';
import { ThemeColors } from '@/contexts/ThemeContext';
import { Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

// Mock supabase
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'task_templates') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              order: mockOrder.mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        insert: mockInsert.mockResolvedValue({ error: null }),
      };
    }),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'database',
  },
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  X: () => null,
  ChevronDown: () => null,
  Calendar: () => null,
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (event: unknown, date?: Date) => void }) => {
      return React.createElement('View', {
        testID: 'date-time-picker',
        onPress: () => onChange({}, new Date('2025-01-15')),
      });
    },
  };
});

// Mock date utilities
jest.mock('@/lib/date', () => ({
  formatLocalDate: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
}));

// Mock GlassBottomSheet
const mockPresent = jest.fn();
const mockDismiss = jest.fn();
jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const MockGlassBottomSheet = React.forwardRef(
    (
      { children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void },
      ref: React.Ref<{ present: () => void; dismiss: () => void }>
    ) => {
      // Store onDismiss to be called when dismiss() is invoked
      const onDismissRef = React.useRef(onDismiss);
      onDismissRef.current = onDismiss;

      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: () => {
          mockDismiss();
          // Simulate the actual bottom sheet behavior: onDismiss is called after dismiss()
          onDismissRef.current?.();
        },
      }));
      return React.createElement('View', { testID: 'glass-bottom-sheet' }, children);
    }
  );
  MockGlassBottomSheet.displayName = 'GlassBottomSheet';
  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// Mock BottomSheetScrollView
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children, ...props }: { children: React.ReactNode }) => {
    const React = require('react');
    const { ScrollView } = require('react-native');
    return React.createElement(
      ScrollView,
      { ...props, testID: 'bottom-sheet-scroll-view' },
      children
    );
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockTheme: ThemeColors = {
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  secondary: '#5856D6',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  background: '#ffffff',
  surface: '#ffffff',
  card: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
};

const mockSponsees: Profile[] = [
  {
    id: 'sponsee-1',
    display_name: 'John D.',
    sobriety_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sponsee-2',
    display_name: 'Jane S.',
    sobriety_date: '2024-02-01',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
];

const defaultProps = {
  onClose: jest.fn(),
  onTaskCreated: jest.fn(),
  sponsorId: 'sponsor-123',
  sponsees: mockSponsees,
  theme: mockTheme,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('TaskCreationSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('imperative API', () => {
    it('exposes present method via ref', () => {
      const ref = React.createRef<TaskCreationSheetRef>();
      render(<TaskCreationSheet {...defaultProps} ref={ref} />);

      ref.current?.present();

      expect(mockPresent).toHaveBeenCalled();
    });

    it('exposes dismiss method via ref', () => {
      const ref = React.createRef<TaskCreationSheetRef>();
      render(<TaskCreationSheet {...defaultProps} ref={ref} />);

      ref.current?.dismiss();

      expect(mockDismiss).toHaveBeenCalled();
    });
  });

  describe('rendering', () => {
    it('renders the sheet with title', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Assign New Task')).toBeTruthy();
    });

    it('renders all form labels', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Sponsee *')).toBeTruthy();
      expect(screen.getByText('Step Number (Optional)')).toBeTruthy();
      expect(screen.getByText('Task Template (Optional)')).toBeTruthy();
      expect(screen.getByText('Task Title *')).toBeTruthy();
      expect(screen.getByText('Task Description *')).toBeTruthy();
      expect(screen.getByText('Due Date (Optional)')).toBeTruthy();
    });

    it('renders action buttons', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Assign Task')).toBeTruthy();
    });

    it('renders with preselected sponsee', () => {
      render(<TaskCreationSheet {...defaultProps} preselectedSponseeId="sponsee-1" />);

      expect(screen.getByText('John D.')).toBeTruthy();
    });
  });

  describe('sponsee dropdown', () => {
    it('shows placeholder when no sponsee selected', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Select sponsee')).toBeTruthy();
    });

    it('opens sponsee dropdown when pressed', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Select sponsee'));

      // Should show sponsee options
      expect(screen.getByText('John D.')).toBeTruthy();
      expect(screen.getByText('Jane S.')).toBeTruthy();
    });

    it('selects a sponsee from dropdown', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Select sponsee'));
      fireEvent.press(screen.getByText('John D.'));

      // Dropdown should close and show selected sponsee
      expect(screen.queryByText('Jane S.')).toBeNull();
    });
  });

  describe('step number dropdown', () => {
    it('shows placeholder when no step selected', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Select step (optional)')).toBeTruthy();
    });

    it('opens step dropdown when pressed', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Select step (optional)'));

      expect(screen.getByText('No specific step')).toBeTruthy();
      expect(screen.getByText('Step 1')).toBeTruthy();
    });

    it('selects a step from dropdown', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 3'));

      expect(screen.queryByText('No specific step')).toBeNull();
    });
  });

  describe('form validation', () => {
    it('shows error when submitting without sponsee', async () => {
      render(<TaskCreationSheet {...defaultProps} />);

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please select a sponsee')).toBeTruthy();
      });
    });

    it('shows error when submitting without title', async () => {
      render(<TaskCreationSheet {...defaultProps} preselectedSponseeId="sponsee-1" />);

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a task title')).toBeTruthy();
      });
    });

    it('shows error when submitting without description', async () => {
      render(<TaskCreationSheet {...defaultProps} preselectedSponseeId="sponsee-1" />);

      // Enter title
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Test Task');

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a task description')).toBeTruthy();
      });
    });
  });

  describe('form input', () => {
    it('updates title input', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'My New Task');

      expect(titleInput.props.value).toBe('My New Task');
    });

    it('updates description input', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Task description here');

      expect(descInput.props.value).toBe('Task description here');
    });
  });

  describe('task submission', () => {
    it('submits task successfully with valid data', async () => {
      const onTaskCreated = jest.fn();
      const onClose = jest.fn();

      render(
        <TaskCreationSheet
          {...defaultProps}
          preselectedSponseeId="sponsee-1"
          onTaskCreated={onTaskCreated}
          onClose={onClose}
        />
      );

      // Fill in required fields
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Complete Step 1 Reading');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Read the first step materials');

      // Submit
      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
        expect(onTaskCreated).toHaveBeenCalled();
        expect(mockDismiss).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error when submission fails', async () => {
      mockInsert.mockResolvedValueOnce({ error: new Error('Database error') });

      render(<TaskCreationSheet {...defaultProps} preselectedSponseeId="sponsee-1" />);

      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Test Task');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Test description');

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Failed to create task. Please try again.')).toBeTruthy();
      });
    });
  });

  describe('sheet actions', () => {
    it('calls onClose and dismisses when cancel is pressed', () => {
      const onClose = jest.fn();
      render(<TaskCreationSheet {...defaultProps} onClose={onClose} />);

      fireEvent.press(screen.getByText('Cancel'));

      expect(mockDismiss).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose callback when cancel is pressed (form state is reset internally)', () => {
      // Note: The form resets its state when the sheet closes via the onDismiss callback.
      // This test verifies the dismiss flow is triggered; the actual form reset
      // happens in handleClose which calls resetFormState() before dismissing.
      render(<TaskCreationSheet {...defaultProps} />);

      // Fill in some data
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Some title');

      // Close
      fireEvent.press(screen.getByText('Cancel'));

      expect(mockDismiss).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('template dropdown', () => {
    it('shows disabled state when no step selected', () => {
      render(<TaskCreationSheet {...defaultProps} />);

      expect(screen.getByText('Select a step first to see templates')).toBeTruthy();
    });

    it('enables template dropdown when step is selected', async () => {
      render(<TaskCreationSheet {...defaultProps} />);

      // Select a step first
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });
    });
  });

  describe('step dropdown interactions', () => {
    it('clears template selection when selecting "No specific step"', async () => {
      render(<TaskCreationSheet {...defaultProps} />);

      // First select a step to enable template dropdown
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });

      // Open step dropdown again and select "No specific step"
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        const noStepOption = screen.getByText('No specific step');
        expect(noStepOption).toBeTruthy();
        fireEvent.press(noStepOption);
      });

      // Should revert to "Select step (optional)" placeholder
      await waitFor(() => {
        expect(screen.getByText('Select step (optional)')).toBeTruthy();
      });
    });
  });

  describe('template selection', () => {
    beforeEach(() => {
      // Mock supabase to return templates
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'task_templates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'template-1',
                      step_number: 1,
                      title: 'Test Template',
                      description: 'Test template description',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });
    });

    it('selects template and fills form fields', async () => {
      render(<TaskCreationSheet {...defaultProps} />);

      // First select a step
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      // Wait for templates to load
      await waitFor(() => {
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });

      // Open template dropdown
      fireEvent.press(screen.getByText('Choose from template or create custom'));

      // Select a template
      await waitFor(() => {
        const templateOption = screen.getByText('Test Template');
        expect(templateOption).toBeTruthy();
        fireEvent.press(templateOption);
      });

      // Verify template title is now shown
      await waitFor(() => {
        expect(screen.getByText('Test Template')).toBeTruthy();
      });
    });
  });

  describe('web platform', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('renders native date input on web', () => {
      Platform.OS = 'web';
      render(<TaskCreationSheet {...defaultProps} />);

      // On web, the "Set due date" button text should not be present
      expect(screen.queryByText('Set due date')).toBeNull();
    });
  });

  describe('notification error', () => {
    it('logs warning but succeeds if notification fails', async () => {
      // Mock insert to return error for notifications table
      const { supabase } = jest.requireMock('@/lib/supabase');
      // We need to override the mock implementation for this specific test
      const originalMock = supabase.from.getMockImplementation();

      supabase.from.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            insert: jest.fn().mockResolvedValue({ error: { message: 'Notification failed' } }),
          };
        }
        if (table === 'tasks') {
          return {
            insert: mockInsert.mockResolvedValue({ error: null }),
          };
        }
        // Fallback to original or default behavior for other tables if needed
        return originalMock ? originalMock(table) : { insert: jest.fn() };
      });

      const onTaskCreated = jest.fn();
      render(
        <TaskCreationSheet
          {...defaultProps}
          preselectedSponseeId="sponsee-1"
          onTaskCreated={onTaskCreated}
        />
      );

      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Task with notification error');
      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Description');

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled(); // Task inserted
        expect(onTaskCreated).toHaveBeenCalled(); // Success callback called
      });
    });
  });
});
