/**
 * @fileoverview Tests for MyTasksView component
 *
 * Tests the my tasks view including:
 * - Stats display
 * - Task list rendering
 * - Empty states
 * - Completed tasks toggle
 * - Pull to refresh
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MyTasksView from '@/components/tasks/MyTasksView';
import { Task } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  black: '#000000',
  fontRegular: 'System',
};

// Mock TaskCard component
jest.mock('@/components/tasks/TaskCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ task, variant, isCompleted }: any) =>
      React.createElement(
        Text,
        null,
        `${task.title} (${variant}${isCompleted ? ', completed' : ''})`
      ),
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Circle: 'Circle',
}));

// =============================================================================
// Test Data
// =============================================================================

const mockAssignedTask: Task = {
  id: 'task-1',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-123',
  title: 'Assigned Task 1',
  description: 'Description 1',
  status: 'assigned',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCompletedTask: Task = {
  id: 'task-2',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-123',
  title: 'Completed Task 1',
  description: 'Description 2',
  status: 'completed',
  completed_at: '2024-06-15T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('MyTasksView', () => {
  const mockOnRefresh = jest.fn();
  const mockOnToggleCompleted = jest.fn();
  const mockOnCompleteTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stats Display', () => {
    it('renders pending tasks count', () => {
      render(
        <MyTasksView
          tasks={[mockAssignedTask, mockCompletedTask]}
          assignedTasks={[mockAssignedTask]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      // Check that Pending label exists and stats show "1"
      expect(screen.getByText('Pending')).toBeTruthy();
      // There are multiple "1"s on screen (pending count and completed count potentially)
      expect(screen.getAllByText('1')).toHaveLength(2); // 1 pending, 1 completed
    });

    it('renders completed tasks count', () => {
      render(
        <MyTasksView
          tasks={[mockAssignedTask, mockCompletedTask]}
          assignedTasks={[mockAssignedTask]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('displays zero for empty stats', () => {
      render(
        <MyTasksView
          tasks={[]}
          assignedTasks={[]}
          completedTasks={[]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      // Both pending and completed should show 0
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  describe('Task List Rendering', () => {
    it('renders assigned tasks section', () => {
      render(
        <MyTasksView
          tasks={[mockAssignedTask]}
          assignedTasks={[mockAssignedTask]}
          completedTasks={[]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('New Tasks')).toBeTruthy();
      expect(screen.getByText('Assigned Task 1 (my-task)')).toBeTruthy();
    });

    it('renders multiple assigned tasks', () => {
      const task2 = { ...mockAssignedTask, id: 'task-2', title: 'Assigned Task 2' };

      render(
        <MyTasksView
          tasks={[mockAssignedTask, task2]}
          assignedTasks={[mockAssignedTask, task2]}
          completedTasks={[]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Assigned Task 1 (my-task)')).toBeTruthy();
      expect(screen.getByText('Assigned Task 2 (my-task)')).toBeTruthy();
    });

    it('does not render assigned section when no assigned tasks', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.queryByText('New Tasks')).toBeNull();
    });
  });

  describe('Completed Tasks Toggle', () => {
    it('renders completed section header', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Completed (1)')).toBeTruthy();
    });

    it('shows "Show" text when completed tasks are hidden', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Show')).toBeTruthy();
    });

    it('shows "Hide" text when completed tasks are shown', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={true}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Hide')).toBeTruthy();
    });

    it('calls onToggleCompleted when header is pressed', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      fireEvent.press(screen.getByText('Show'));
      expect(mockOnToggleCompleted).toHaveBeenCalledTimes(1);
    });

    it('renders completed tasks when showCompletedTasks is true', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={true}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('Completed Task 1 (my-task, completed)')).toBeTruthy();
    });

    it('does not render completed tasks when showCompletedTasks is false', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.queryByText('Completed Task 1 (my-task, completed)')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no tasks', () => {
      render(
        <MyTasksView
          tasks={[]}
          assignedTasks={[]}
          completedTasks={[]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByText('No tasks yet')).toBeTruthy();
      expect(screen.getByText(/Your sponsor will assign tasks/)).toBeTruthy();
    });

    it('does not render empty state when tasks exist', () => {
      render(
        <MyTasksView
          tasks={[mockAssignedTask]}
          assignedTasks={[mockAssignedTask]}
          completedTasks={[]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.queryByText('No tasks yet')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('sets accessibility label for completed toggle button', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={false}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByLabelText('Show completed tasks')).toBeTruthy();
    });

    it('sets accessibility label when completed tasks are shown', () => {
      render(
        <MyTasksView
          tasks={[mockCompletedTask]}
          assignedTasks={[]}
          completedTasks={[mockCompletedTask]}
          showCompletedTasks={true}
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onRefresh={mockOnRefresh}
          onToggleCompleted={mockOnToggleCompleted}
          onCompleteTask={mockOnCompleteTask}
        />
      );

      expect(screen.getByLabelText('Hide completed tasks')).toBeTruthy();
    });
  });
});
