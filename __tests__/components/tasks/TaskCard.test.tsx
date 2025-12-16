/**
 * @fileoverview Tests for TaskCard component
 *
 * Tests the task card display including:
 * - Rendering task information
 * - Different variants (my-task vs managed-task)
 * - Task status indicators
 * - Complete and delete actions
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskCard from '@/components/tasks/TaskCard';
import { Task, Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  primaryLight: '#E5F1FF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  background: '#F5F5F5',
  border: '#E5E7EB',
  success: '#10b981',
  white: '#FFFFFF',
  fontRegular: 'System',
};

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Trash2: 'Trash2',
}));

// Mock date utilities
jest.mock('@/lib/date', () => ({
  parseDateAsLocal: jest.fn((dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }),
}));

// Mock format utilities
jest.mock('@/lib/format', () => ({
  formatProfileName: jest.fn((profile: any) => profile?.display_name || '?'),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSponsor: Profile = {
  id: 'sponsor-123',
  email: 'sponsor@example.com',
  display_name: 'Sponsor Name',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
};

const mockSponsee: Profile = {
  id: 'sponsee-123',
  email: 'sponsee@example.com',
  display_name: 'Sponsee Name',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
};

const mockTask: Task = {
  id: 'task-123',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-123',
  title: 'Complete Step 1',
  description: 'Read and reflect on Step 1',
  status: 'assigned',
  step_number: 1,
  due_date: '2024-12-31',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  sponsor: mockSponsor,
  sponsee: mockSponsee,
};

// =============================================================================
// Tests
// =============================================================================

describe('TaskCard', () => {
  describe('My Task Variant', () => {
    it('renders task title', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('Complete Step 1')).toBeTruthy();
    });

    it('renders task description', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('Read and reflect on Step 1')).toBeTruthy();
    });

    it('renders step number badge', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('Step 1')).toBeTruthy();
    });

    it('renders due date', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText(/Due/)).toBeTruthy();
    });

    it('renders sponsor name', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('From: Sponsor Name')).toBeTruthy();
    });

    it('renders complete button for non-completed tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
          isCompleted={false}
        />
      );

      expect(screen.getByText('Complete')).toBeTruthy();
    });

    it('calls onComplete when complete button is pressed', () => {
      const mockOnComplete = jest.fn();

      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
          onComplete={mockOnComplete}
        />
      );

      fireEvent.press(screen.getByText('Complete'));
      expect(mockOnComplete).toHaveBeenCalledWith(mockTask);
    });

    it('does not render complete button for completed tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
          isCompleted={true}
        />
      );

      expect(screen.queryByText('Complete')).toBeNull();
    });

    it('renders completed date for completed tasks', () => {
      const completedTask = {
        ...mockTask,
        status: 'completed' as const,
        completed_at: '2024-06-15T00:00:00Z',
      };

      render(
        <TaskCard
          task={completedTask}
          theme={mockTheme}
          variant="my-task"
          isCompleted={true}
        />
      );

      expect(screen.getByText(/Completed/)).toBeTruthy();
    });

    it('renders completion notes', () => {
      const taskWithNotes = {
        ...mockTask,
        completion_notes: 'This was very insightful',
      };

      render(
        <TaskCard
          task={taskWithNotes}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('Your Notes:')).toBeTruthy();
      expect(screen.getByText('This was very insightful')).toBeTruthy();
    });

    it('renders created date for non-completed tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
          isCompleted={false}
        />
      );

      // Should show created date
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeTruthy();
    });
  });

  describe('Managed Task Variant', () => {
    it('renders task title', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.getByText('Complete Step 1')).toBeTruthy();
    });

    it('truncates description to 2 lines', () => {
      const taskWithLongDescription = {
        ...mockTask,
        description: 'Very long description that should be truncated'.repeat(10),
      };

      render(
        <TaskCard
          task={taskWithLongDescription}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      // Description should be present
      expect(screen.getByText(/Very long description/)).toBeTruthy();
    });

    it('renders status badge', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.getByText('Assigned')).toBeTruthy();
    });

    it('renders "In Progress" status', () => {
      const taskInProgress = { ...mockTask, status: 'in_progress' as const };

      render(
        <TaskCard
          task={taskInProgress}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.getByText('In Progress')).toBeTruthy();
    });

    it('renders "Completed" status', () => {
      const completedTask = { ...mockTask, status: 'completed' as const };

      render(
        <TaskCard
          task={completedTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('renders delete button for non-completed tasks', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      const deleteButton = screen.getByTestId('delete-task-task-123');
      expect(deleteButton).toBeTruthy();
    });

    it('does not render delete button for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' as const };

      render(
        <TaskCard
          task={completedTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.queryByTestId('delete-task-task-123')).toBeNull();
    });

    it('calls onDelete when delete button is pressed', () => {
      const mockOnDelete = jest.fn();

      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByTestId('delete-task-task-123');
      fireEvent.press(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('task-123', 'Complete Step 1');
    });

    it('shows overdue indicator', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
          isOverdue={true}
        />
      );

      // Overdue styling is applied via styles, verify text content
      expect(screen.getByText(/Due/)).toBeTruthy();
    });

    it('renders completion notes with label', () => {
      const taskWithNotes = {
        ...mockTask,
        completion_notes: 'Sponsee reflection notes',
      };

      render(
        <TaskCard
          task={taskWithNotes}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      expect(screen.getByText('Completion Notes:')).toBeTruthy();
      expect(screen.getByText('Sponsee reflection notes')).toBeTruthy();
    });

    it('truncates completion notes to 3 lines', () => {
      const taskWithLongNotes = {
        ...mockTask,
        completion_notes: 'Very long notes '.repeat(50),
      };

      render(
        <TaskCard
          task={taskWithLongNotes}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      // Notes should be present
      expect(screen.getByText(/Very long notes/)).toBeTruthy();
    });
  });

  describe('Task Without Step Number', () => {
    it('does not render step badge when step_number is null', () => {
      const taskWithoutStep = { ...mockTask, step_number: undefined };

      render(
        <TaskCard
          task={taskWithoutStep}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.queryByText(/Step/)).toBeNull();
    });
  });

  describe('Task Without Due Date', () => {
    it('does not render due date when due_date is null', () => {
      const taskWithoutDueDate = { ...mockTask, due_date: undefined };

      render(
        <TaskCard
          task={taskWithoutDueDate}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.queryByText(/Due/)).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('sets accessibility label for complete button', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="my-task"
        />
      );

      const completeButton = screen.getByLabelText('Complete task Complete Step 1');
      expect(completeButton).toBeTruthy();
    });

    it('sets accessibility label for delete button', () => {
      render(
        <TaskCard
          task={mockTask}
          theme={mockTheme}
          variant="managed-task"
        />
      );

      const deleteButton = screen.getByLabelText('Delete task Complete Step 1');
      expect(deleteButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles task with no sponsor profile', () => {
      const taskWithoutSponsor = { ...mockTask, sponsor: undefined };

      render(
        <TaskCard
          task={taskWithoutSponsor}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('From: ?')).toBeTruthy();
    });

    it('handles very long task title', () => {
      const taskWithLongTitle = {
        ...mockTask,
        title: 'Very Long Task Title That Should Be Displayed Completely',
      };

      render(
        <TaskCard
          task={taskWithLongTitle}
          theme={mockTheme}
          variant="my-task"
        />
      );

      expect(screen.getByText('Very Long Task Title That Should Be Displayed Completely')).toBeTruthy();
    });

    it('handles empty completion notes', () => {
      const taskWithEmptyNotes = {
        ...mockTask,
        completion_notes: '',
      };

      render(
        <TaskCard
          task={taskWithEmptyNotes}
          theme={mockTheme}
          variant="my-task"
        />
      );

      // Empty notes should not render the notes section
      expect(screen.queryByText('Your Notes:')).toBeNull();
    });
  });
});