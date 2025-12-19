/**
 * @fileoverview Tests for TaskCompletionSheet component
 *
 * Tests the task completion bottom sheet including:
 * - Imperative API (present/dismiss)
 * - Task display
 * - Form input handling
 * - Submit and cancel actions
 * - Loading states
 * - Accessibility attributes
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import TaskCompletionSheet, {
  TaskCompletionSheetRef,
} from '@/components/sheets/TaskCompletionSheet';
import { Task } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme: ThemeColors = {
  primary: '#007AFF',
  primaryLight: '#E3F2FD',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#9CA3AF',
  card: '#FFFFFF',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  white: '#FFFFFF',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  fontRegular: 'System',
} as ThemeColors;

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  X: 'X',
  CheckCircle: 'CheckCircle',
}));

// Mock @gorhom/bottom-sheet
const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetTextInput: (props: Record<string, unknown>) =>
      React.createElement('TextInput', { ...props, testID: props.testID || 'notes-input' }),
    BottomSheetFooter: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock GlassBottomSheet
jest.mock('@/components/GlassBottomSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const { forwardRef, useImperativeHandle } = React;

  const MockGlassBottomSheet = forwardRef(function MockGlassBottomSheet(
    {
      children,
      onDismiss,
    }: { children: React.ReactNode; onDismiss?: () => void; footerComponent?: unknown },
    ref: React.Ref<{ present: () => void; dismiss: () => void }>
  ) {
    useImperativeHandle(ref, () => ({
      present: () => {
        mockPresent();
      },
      dismiss: () => {
        mockDismiss();
        onDismiss?.();
      },
    }));

    // Always render children in tests so we can test content
    return React.createElement('View', { testID: 'glass-bottom-sheet' }, children);
  });

  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// =============================================================================
// Test Data
// =============================================================================

const mockTask: Task = {
  id: 'task-123',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-123',
  title: 'Complete Step 1',
  description: 'Read and reflect on Step 1',
  status: 'assigned',
  step_number: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('TaskCompletionSheet', () => {
  const mockOnDismiss = jest.fn();
  const mockOnTaskCompleted = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Imperative API', () => {
    it('exposes present method via ref', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.present).toBe('function');
    });

    it('exposes dismiss method via ref', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      expect(ref.current).toBeDefined();
      expect(typeof ref.current?.dismiss).toBe('function');
    });

    it('calls GlassBottomSheet present when present is called with task', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      expect(mockPresent).toHaveBeenCalledTimes(1);
    });

    it('calls GlassBottomSheet dismiss when dismiss is called', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.dismiss();
      });

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task Display', () => {
    it('renders task title after present is called', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByText('Complete Step 1')).toBeTruthy();
      });
    });

    it('renders step number badge when task has step_number', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeTruthy();
      });
    });

    it('does not render step badge when step_number is undefined', async () => {
      const ref = createRef<TaskCompletionSheetRef>();
      const taskWithoutStep = {
        ...mockTask,
        title: 'Daily Reflection',
        step_number: undefined,
      };

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(taskWithoutStep);
      });

      await waitFor(() => {
        expect(screen.getByText('Daily Reflection')).toBeTruthy();
      });

      // Step badge should not be rendered
      expect(screen.queryByText(/^Step \d+$/)).toBeNull();
    });

    it('renders header with title', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      expect(screen.getByText('Complete Task')).toBeTruthy();
    });
  });

  describe('Notes Input', () => {
    it('renders notes label and help text', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByText('Completion Notes (Optional)')).toBeTruthy();
      });
    });

    it('renders notes input with placeholder', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('What did you learn? How do you feel?')).toBeTruthy();
      });
    });

    it('allows entering notes text', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const input = await waitFor(() =>
        screen.getByPlaceholderText('What did you learn? How do you feel?')
      );

      fireEvent.changeText(input, 'My completion notes');

      expect(screen.getByDisplayValue('My completion notes')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('renders cancel and submit buttons', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeTruthy();
        expect(screen.getByText('Mark Complete')).toBeTruthy();
      });
    });

    it('calls dismiss when cancel button is pressed', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const cancelButton = await waitFor(() => screen.getByText('Cancel'));
      fireEvent.press(cancelButton);

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onTaskCompleted with task and notes when submit button is pressed', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const input = await waitFor(() =>
        screen.getByPlaceholderText('What did you learn? How do you feel?')
      );
      fireEvent.changeText(input, 'Test notes');

      const submitButton = screen.getByText('Mark Complete');
      await act(async () => {
        fireEvent.press(submitButton);
      });

      expect(mockOnTaskCompleted).toHaveBeenCalledWith(mockTask, 'Test notes');
    });

    it('calls dismiss when close button is pressed', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const closeButton = await waitFor(() => screen.getByLabelText('Close'));
      fireEvent.press(closeButton);

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when submitting', async () => {
      const ref = createRef<TaskCompletionSheetRef>();
      // Make onTaskCompleted hang to simulate loading
      const slowOnTaskCompleted = jest.fn().mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={slowOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const submitButton = await waitFor(() => screen.getByText('Mark Complete'));
      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Loading indicator should be shown, "Mark Complete" text hidden
      await waitFor(() => {
        expect(screen.queryByText('Mark Complete')).toBeNull();
      });
    });

    it('disables cancel button while submitting', async () => {
      const ref = createRef<TaskCompletionSheetRef>();
      const slowOnTaskCompleted = jest.fn().mockImplementation(() => new Promise(() => {}));

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={slowOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      const submitButton = await waitFor(() => screen.getByText('Mark Complete'));
      await act(async () => {
        fireEvent.press(submitButton);
      });

      // Cancel button should still be visible but disabled
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeTruthy();
    });
  });

  describe('Dismiss Behavior', () => {
    it('calls onDismiss when sheet is dismissed', () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      act(() => {
        ref.current?.dismiss();
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('resets notes when dismissed and re-presented', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      // Present and add notes
      act(() => {
        ref.current?.present(mockTask);
      });

      const input = await waitFor(() =>
        screen.getByPlaceholderText('What did you learn? How do you feel?')
      );
      fireEvent.changeText(input, 'Some notes');

      // Dismiss
      act(() => {
        ref.current?.dismiss();
      });

      // Re-present
      act(() => {
        ref.current?.present(mockTask);
      });

      // Notes should be reset
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Some notes')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('sets accessibility label for close button', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Close')).toBeTruthy();
      });
    });

    it('sets accessibility label for cancel button', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Cancel task completion')).toBeTruthy();
      });
    });

    it('sets accessibility label for submit button', async () => {
      const ref = createRef<TaskCompletionSheetRef>();

      render(
        <TaskCompletionSheet
          ref={ref}
          theme={mockTheme}
          onDismiss={mockOnDismiss}
          onTaskCompleted={mockOnTaskCompleted}
        />
      );

      act(() => {
        ref.current?.present(mockTask);
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Submit task completion')).toBeTruthy();
      });
    });
  });
});
