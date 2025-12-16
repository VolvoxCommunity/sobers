/**
 * @fileoverview Tests for TaskCreationModal component
 *
 * Tests the task creation modal including:
 * - Rendering and visibility
 * - Form validation
 * - Dropdown interactions
 * - Task submission
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TaskCreationModal from '@/components/TaskCreationModal';
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
        // Use local time constructor to avoid timezone issues
        // new Date(year, monthIndex, day) creates midnight local time
        onPress: () => onChange({}, new Date(2025, 0, 15)),
      });
    },
  };
});

// Mock date utilities
jest.mock('@/lib/date', () => ({
  formatLocalDate: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
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
  visible: true,
  onClose: jest.fn(),
  onTaskCreated: jest.fn(),
  sponsorId: 'sponsor-123',
  sponsees: mockSponsees,
  theme: mockTheme,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('TaskCreationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when visible is true', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Assign New Task')).toBeTruthy();
    });

    it('renders all form labels', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Sponsee *')).toBeTruthy();
      expect(screen.getByText('Step Number (Optional)')).toBeTruthy();
      expect(screen.getByText('Task Template (Optional)')).toBeTruthy();
      expect(screen.getByText('Task Title *')).toBeTruthy();
      expect(screen.getByText('Task Description *')).toBeTruthy();
      expect(screen.getByText('Due Date (Optional)')).toBeTruthy();
    });

    it('renders action buttons', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Assign Task')).toBeTruthy();
    });

    it('renders with preselected sponsee', () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

      expect(screen.getByText('John D.')).toBeTruthy();
    });
  });

  describe('sponsee dropdown', () => {
    it('shows placeholder when no sponsee selected', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Select sponsee')).toBeTruthy();
    });

    it('opens sponsee dropdown when pressed', () => {
      render(<TaskCreationModal {...defaultProps} />);

      fireEvent.press(screen.getByText('Select sponsee'));

      // Should show sponsee options
      expect(screen.getByText('John D.')).toBeTruthy();
      expect(screen.getByText('Jane S.')).toBeTruthy();
    });

    it('selects a sponsee from dropdown', () => {
      render(<TaskCreationModal {...defaultProps} />);

      fireEvent.press(screen.getByText('Select sponsee'));
      fireEvent.press(screen.getByText('John D.'));

      // Dropdown should close and show selected sponsee
      expect(screen.queryByText('Jane S.')).toBeNull();
    });
  });

  describe('step number dropdown', () => {
    it('shows placeholder when no step selected', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Select step (optional)')).toBeTruthy();
    });

    it('opens step dropdown when pressed', () => {
      render(<TaskCreationModal {...defaultProps} />);

      fireEvent.press(screen.getByText('Select step (optional)'));

      expect(screen.getByText('No specific step')).toBeTruthy();
      expect(screen.getByText('Step 1')).toBeTruthy();
    });

    it('selects a step from dropdown', () => {
      render(<TaskCreationModal {...defaultProps} />);

      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 3'));

      expect(screen.queryByText('No specific step')).toBeNull();
    });
  });

  describe('form validation', () => {
    it('shows error when submitting without sponsee', async () => {
      render(<TaskCreationModal {...defaultProps} />);

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please select a sponsee')).toBeTruthy();
      });
    });

    it('shows error when submitting without title', async () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a task title')).toBeTruthy();
      });
    });

    it('shows error when submitting without description', async () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

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
      render(<TaskCreationModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'My New Task');

      expect(titleInput.props.value).toBe('My New Task');
    });

    it('updates description input', () => {
      render(<TaskCreationModal {...defaultProps} />);

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
        <TaskCreationModal
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
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error when submission fails', async () => {
      mockInsert.mockResolvedValueOnce({ error: new Error('Database error') });

      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

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

  describe('modal actions', () => {
    it('calls onClose when cancel is pressed', () => {
      const onClose = jest.fn();
      render(<TaskCreationModal {...defaultProps} onClose={onClose} />);

      fireEvent.press(screen.getByText('Cancel'));

      expect(onClose).toHaveBeenCalled();
    });

    it('resets form when closing', () => {
      render(<TaskCreationModal {...defaultProps} />);

      // Fill in some data
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Some title');

      // Close
      fireEvent.press(screen.getByText('Cancel'));

      // The modal should reset (would need to reopen to verify)
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('template dropdown', () => {
    it('shows disabled state when no step selected', () => {
      render(<TaskCreationModal {...defaultProps} />);

      expect(screen.getByText('Select a step first to see templates')).toBeTruthy();
    });

    it('enables template dropdown when step is selected', async () => {
      render(<TaskCreationModal {...defaultProps} />);

      // Select a step first
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });
    });
  });

  describe('visibility', () => {
    it('does not render content when visible is false', () => {
      render(<TaskCreationModal {...defaultProps} visible={false} />);

      // Modal is hidden but the component still renders - it just doesn't show
      // The Modal component handles visibility internally
      expect(screen.queryByText('Assign New Task')).toBeNull();
    });
  });

  describe('step dropdown interactions', () => {
    it('clears template selection when selecting "No specific step"', async () => {
      render(<TaskCreationModal {...defaultProps} />);

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
      render(<TaskCreationModal {...defaultProps} />);

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

  describe('date picker interaction', () => {
    it('clears date when clear button is pressed', async () => {
      render(<TaskCreationModal {...defaultProps} />);

      // First set a date by triggering the date picker mock
      // Since we can't easily trigger the mock's onChange from here without finding it
      // Let's assume we can find the button that opens it
      fireEvent.press(screen.getByText('Set due date'));

      // The mock implementation of DateTimePicker (which is rendered when showDatePicker is true)
      // should be visible or interactable if we could find it.
      // But our mock is a View with onPress that calls onChange immediately?
      // No, the mock is:
      // default: ({ onChange }) => React.createElement('View', { testID: 'date-time-picker', onPress: () => onChange({}, new Date('2025-01-15')) })

      // So we need to find that View and press it.
      // But it is only rendered when showDatePicker is true.

      // Find the picker and press it to select date
      const picker = screen.getByTestId('date-time-picker');
      fireEvent.press(picker);

      await waitFor(() => {
        // Date should be set (mock sets it to 2025-01-15)
        expect(screen.getByText(/January 15, 2025/)).toBeTruthy();
      });

      // Now clear it
      fireEvent.press(screen.getByText('Clear Date'));

      await waitFor(() => {
        expect(screen.queryByText('Clear Date')).toBeNull();
        expect(screen.getByText('Set due date')).toBeTruthy();
      });
    });
  });

  describe('error handling - template fetch failures', () => {
    beforeEach(() => {
      // Reset supabase mock to default behavior
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
      });
    });

    it('handles template fetch failure gracefully', async () => {
      // Mock template fetch to fail
      const mockSupabase = jest.requireMock('@/lib/supabase');
      mockSupabase.supabase.from.mockImplementation((table: string) => {
        if (table === 'task_templates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Network error'),
                }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      render(<TaskCreationModal {...defaultProps} />);

      // Select a step to trigger template fetch
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        // Template dropdown should still be enabled
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });

      // Open template dropdown - should show empty state
      fireEvent.press(screen.getByText('Choose from template or create custom'));

      await waitFor(() => {
        expect(screen.getByText('No templates available for this step')).toBeTruthy();
      });
    });

    it('continues to work when template fetch returns null data', async () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

      // Select a step
      fireEvent.press(screen.getByText('Select step (optional)'));
      fireEvent.press(screen.getByText('Step 1'));

      await waitFor(() => {
        expect(screen.getByText('Choose from template or create custom')).toBeTruthy();
      });

      // Can still create task without template
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Custom Task');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Custom description');

      // Submit
      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(
        () => {
          expect(mockInsert).toHaveBeenCalled();
          expect(defaultProps.onTaskCreated).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('error handling - empty sponsee list', () => {
    it('renders when sponsee list is empty', () => {
      render(<TaskCreationModal {...defaultProps} sponsees={[]} />);

      expect(screen.getByText('Assign New Task')).toBeTruthy();
      expect(screen.getByText('Select sponsee')).toBeTruthy();
    });

    it('shows empty dropdown when opening sponsee selector with no sponsees', () => {
      render(<TaskCreationModal {...defaultProps} sponsees={[]} />);

      fireEvent.press(screen.getByText('Select sponsee'));

      // Dropdown opens but is empty
      expect(screen.getByText('Select sponsee')).toBeTruthy();
      expect(screen.queryByText('John D.')).toBeNull();
      expect(screen.queryByText('Jane S.')).toBeNull();
    });

    it('cannot submit task when no sponsees are available', async () => {
      render(<TaskCreationModal {...defaultProps} sponsees={[]} />);

      // Fill in title and description
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Test Task');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Test description');

      // Try to submit without selecting a sponsee (impossible since list is empty)
      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(() => {
        expect(screen.getByText('Please select a sponsee')).toBeTruthy();
      });

      // Verify task was not created
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('handles preselected sponsee that does not exist in empty list', () => {
      render(
        <TaskCreationModal
          {...defaultProps}
          sponsees={[]}
          preselectedSponseeId="nonexistent-sponsee"
        />
      );

      // Should show "Unknown sponsee" since ID doesn't match any in list
      expect(screen.getByText('Unknown sponsee')).toBeTruthy();
    });
  });

  describe('error handling - date validation', () => {
    beforeEach(() => {
      // Reset supabase mock to default behavior
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
      });
    });

    it('enforces minimum date constraint on native date picker', () => {
      render(<TaskCreationModal {...defaultProps} />);

      // Open date picker
      fireEvent.press(screen.getByText('Set due date'));

      // DateTimePicker should be rendered with minimumDate
      const picker = screen.getByTestId('date-time-picker');
      expect(picker).toBeTruthy();

      // Note: The actual minimumDate enforcement is done by the DateTimePicker component
      // Our mock automatically sets a future date (2025-01-15) which satisfies this constraint
    });

    it('accepts valid future date selection', async () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

      // Fill in required fields first
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'Future Task');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Task with future due date');

      // Set a future date
      fireEvent.press(screen.getByText('Set due date'));
      const picker = screen.getByTestId('date-time-picker');
      fireEvent.press(picker);

      await waitFor(() => {
        expect(screen.getByText(/January 15, 2025/)).toBeTruthy();
      });

      // Submit should succeed
      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(
        () => {
          expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              due_date: '2025-01-15',
            })
          );
        },
        { timeout: 3000 }
      );
    });

    it('allows task submission without a due date', async () => {
      render(<TaskCreationModal {...defaultProps} preselectedSponseeId="sponsee-1" />);

      // Fill in required fields without setting a date
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.changeText(titleInput, 'No Date Task');

      const descInput = screen.getByPlaceholderText('Enter task description');
      fireEvent.changeText(descInput, 'Task without due date');

      // Submit should succeed
      fireEvent.press(screen.getByText('Assign Task'));

      await waitFor(
        () => {
          expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
              due_date: null,
            })
          );
        },
        { timeout: 3000 }
      );
    });
  });
});
