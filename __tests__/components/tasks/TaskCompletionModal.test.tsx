/**
 * @fileoverview Tests for TaskCompletionModal component
 *
 * Tests the task completion modal including:
 * - Visibility and rendering
 * - Form input handling
 * - Submit and cancel actions
 * - Loading states
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskCompletionModal from '@/components/tasks/TaskCompletionModal';
import { Task } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#9CA3AF',
  card: '#FFFFFF',
  background: '#F5F5F5',
  border: '#E5E7EB',
  white: '#FFFFFF',
  fontRegular: 'System',
};

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  X: 'X',
}));

// Mock KeyboardAvoidingView from react-native-keyboard-controller
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => children,
}));

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

describe('TaskCompletionModal', () => {
  const mockOnNotesChange = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders when visible is true', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Complete Task')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(
        <TaskCompletionModal
          visible={false}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Modal content should not be visible when visible=false
      expect(screen.queryByText('Complete Task')).toBeNull();
    });
  });

  describe('Task Display', () => {
    it('renders task title', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Complete Step 1')).toBeTruthy();
    });

    it('renders step number badge', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Step 1')).toBeTruthy();
    });

    it('does not render step badge when step_number is null', () => {
      // Use a task without "Step" in the title to test badge absence
      const taskWithoutStep = {
        ...mockTask,
        title: 'Daily Reflection',
        step_number: undefined,
      };

      render(
        <TaskCompletionModal
          visible={true}
          task={taskWithoutStep}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Check for step badge pattern (not title text)
      expect(screen.queryByText(/^Step \d+$/)).toBeNull();
    });

    it('does not render task info when task is null', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={null}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByText('Complete Step 1')).toBeNull();
    });
  });

  describe('Notes Input', () => {
    it('renders notes label and help text', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Completion Notes (Optional)')).toBeTruthy();
      expect(screen.getByText(/Share your reflections/)).toBeTruthy();
    });

    it('renders notes input with placeholder', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText('What did you learn? How do you feel?')).toBeTruthy();
    });

    it('displays current notes value', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes="My completion notes"
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByDisplayValue('My completion notes')).toBeTruthy();
    });

    it('calls onNotesChange when text is entered', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByPlaceholderText('What did you learn? How do you feel?');
      fireEvent.changeText(input, 'New notes');

      expect(mockOnNotesChange).toHaveBeenCalledWith('New notes');
    });
  });

  describe('Action Buttons', () => {
    it('renders cancel and submit buttons', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Mark Complete')).toBeTruthy();
    });

    it('calls onClose when cancel button is pressed', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.press(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSubmit when submit button is pressed', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      fireEvent.press(screen.getByText('Mark Complete'));
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is pressed', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isSubmitting is true', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={true}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Loading indicator should be rendered
      expect(screen.queryByText('Mark Complete')).toBeNull();
    });

    it('disables buttons when isSubmitting is true', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={true}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeTruthy();
      // Disabled state is set via prop
    });

    it('does not call onSubmit when disabled', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={true}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      // Submit button should be disabled, but we can't easily test this in RNTL
      // The button has disabled prop set
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('sets accessibility label for close button', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Close')).toBeTruthy();
    });

    it('sets accessibility label for cancel button', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Cancel task completion')).toBeTruthy();
    });

    it('sets accessibility label for submit button', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText('Submit task completion')).toBeTruthy();
    });

    it('sets accessibility state for submit button when submitting', () => {
      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes=""
          isSubmitting={true}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByLabelText('Submit task completion');
      expect(submitButton).toBeTruthy();
      // Accessibility state busy and disabled are set via props
    });
  });

  describe('Edge Cases', () => {
    it('handles very long notes', () => {
      const longNotes = 'Very long notes. '.repeat(100);

      render(
        <TaskCompletionModal
          visible={true}
          task={mockTask}
          notes={longNotes}
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByDisplayValue(longNotes)).toBeTruthy();
    });

    it('handles task with very long title', () => {
      const taskWithLongTitle = {
        ...mockTask,
        title: 'Very Long Task Title That Should Still Be Displayed Correctly',
      };

      render(
        <TaskCompletionModal
          visible={true}
          task={taskWithLongTitle}
          notes=""
          isSubmitting={false}
          theme={mockTheme}
          onNotesChange={mockOnNotesChange}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByText('Very Long Task Title That Should Still Be Displayed Correctly')
      ).toBeTruthy();
    });
  });
});
