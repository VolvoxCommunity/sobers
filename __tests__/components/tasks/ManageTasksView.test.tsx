/**
 * @fileoverview Tests for ManageTasksView component
 *
 * Tests the manage tasks view including:
 * - Stats display
 * - Filters integration
 * - Task grouping by sponsee
 * - Empty states
 * - FAB functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ManageTasksView from '@/components/tasks/ManageTasksView';
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
  black: '#000000',
  fontRegular: 'System',
};

// Mock TaskCard component
jest.mock('@/components/tasks/TaskCard', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ task }: any) => React.createElement(Text, null, task.title),
  };
});

// Mock TaskFilters component
jest.mock('@/components/tasks/TaskFilters', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'TaskFilters'),
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Plus: 'Plus',
}));

// Mock format utilities
jest.mock('@/lib/format', () => ({
  formatProfileName: jest.fn((profile: any) => profile?.display_name || '?'),
}));

// Mock layout constants
jest.mock('@/constants/layout', () => ({
  IOS_TAB_BAR_HEIGHT: 80,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSponsee1: Profile = {
  id: 'sponsee-1',
  email: 'john@example.com',
  display_name: 'John D.',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
};

const mockSponsee2: Profile = {
  id: 'sponsee-2',
  email: 'jane@example.com',
  display_name: 'Jane S.',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
};

const mockTask1: Task = {
  id: 'task-1',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-1',
  title: 'Task for John',
  description: 'Description 1',
  status: 'assigned',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockTask2: Task = {
  id: 'task-2',
  sponsor_id: 'sponsor-123',
  sponsee_id: 'sponsee-2',
  title: 'Task for Jane',
  description: 'Description 2',
  status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('ManageTasksView', () => {
  const mockOnStatusFilterChange = jest.fn();
  const mockOnSponseeFilterChange = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockOnCreateTask = jest.fn();
  const mockOnAddTaskForSponsee = jest.fn();
  const mockOnDeleteTask = jest.fn();
  const mockIsOverdue = jest.fn(() => false);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stats Display', () => {
    it('renders total tasks count', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('Total')).toBeTruthy();
    });

    it('renders assigned tasks count', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      // Check for assigned count label
      const assignedLabels = screen.getAllByText('Assigned');
      expect(assignedLabels.length).toBeGreaterThan(0);
      // Verify at least one "1" appears (assigned task count may appear multiple times)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });

    it('renders completed tasks count', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('renders overdue count when overdue tasks exist', () => {
      const overdueTask = { ...mockTask1, due_date: '2024-01-01' };
      mockIsOverdue.mockReturnValue(true);

      render(
        <ManageTasksView
          tasks={[overdueTask]}
          filteredTasks={[overdueTask]}
          groupedTasks={{ 'sponsee-1': [overdueTask] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('Overdue')).toBeTruthy();
    });
  });

  describe('Task Grouping', () => {
    it('renders sponsee sections', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('John D.')).toBeTruthy();
      expect(screen.getByText('Jane S.')).toBeTruthy();
    });

    it('renders tasks within sponsee sections', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('Task for John')).toBeTruthy();
      expect(screen.getByText('Task for Jane')).toBeTruthy();
    });

    it('renders task count for each sponsee', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1, mockTask2]}
          filteredTasks={[mockTask1, mockTask2]}
          groupedTasks={{ 'sponsee-1': [mockTask1], 'sponsee-2': [mockTask2] }}
          sponsees={[mockSponsee1, mockSponsee2]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      // Multiple sponsees each have "1 task" text
      expect(screen.getAllByText('1 task').length).toBeGreaterThan(0);
    });

    it('renders add task button for each sponsee', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[mockTask1]}
          groupedTasks={{ 'sponsee-1': [mockTask1] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      const addButton = screen.getByLabelText('Assign task to John D.');
      expect(addButton).toBeTruthy();
    });

    it('calls onAddTaskForSponsee when add button is pressed', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[mockTask1]}
          groupedTasks={{ 'sponsee-1': [mockTask1] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      const addButton = screen.getByLabelText('Assign task to John D.');
      fireEvent.press(addButton);

      expect(mockOnAddTaskForSponsee).toHaveBeenCalledWith('sponsee-1');
    });
  });

  describe('Empty States', () => {
    it('renders "No Sponsees" state when no sponsees', () => {
      render(
        <ManageTasksView
          tasks={[]}
          filteredTasks={[]}
          groupedTasks={{}}
          sponsees={[]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('No Sponsees Yet')).toBeTruthy();
      expect(screen.getByText(/Connect with sponsees/)).toBeTruthy();
    });

    it('renders "No Tasks" state when no tasks match filter', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[]}
          groupedTasks={{}}
          sponsees={[mockSponsee1]}
          filterStatus="completed"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('No Tasks')).toBeTruthy();
      expect(screen.getByText('No tasks match your current filter.')).toBeTruthy();
    });

    it('shows different empty message for "all" filter', () => {
      render(
        <ManageTasksView
          tasks={[]}
          filteredTasks={[]}
          groupedTasks={{}}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText(/Start assigning tasks/)).toBeTruthy();
    });
  });

  describe('FAB', () => {
    it('renders FAB when sponsees exist', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[mockTask1]}
          groupedTasks={{ 'sponsee-1': [mockTask1] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByLabelText('Create new task')).toBeTruthy();
    });

    it('does not render FAB when no sponsees', () => {
      render(
        <ManageTasksView
          tasks={[]}
          filteredTasks={[]}
          groupedTasks={{}}
          sponsees={[]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.queryByLabelText('Create new task')).toBeNull();
    });

    it('calls onCreateTask when FAB is pressed', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[mockTask1]}
          groupedTasks={{ 'sponsee-1': [mockTask1] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      fireEvent.press(screen.getByLabelText('Create new task'));
      expect(mockOnCreateTask).toHaveBeenCalledTimes(1);
    });
  });

  describe('Filters Integration', () => {
    it('renders TaskFilters component', () => {
      render(
        <ManageTasksView
          tasks={[mockTask1]}
          filteredTasks={[mockTask1]}
          groupedTasks={{ 'sponsee-1': [mockTask1] }}
          sponsees={[mockSponsee1]}
          filterStatus="all"
          selectedSponseeId="all"
          refreshing={false}
          theme={mockTheme}
          tabBarHeight={80}
          onStatusFilterChange={mockOnStatusFilterChange}
          onSponseeFilterChange={mockOnSponseeFilterChange}
          onRefresh={mockOnRefresh}
          onCreateTask={mockOnCreateTask}
          onAddTaskForSponsee={mockOnAddTaskForSponsee}
          onDeleteTask={mockOnDeleteTask}
          isOverdue={mockIsOverdue}
        />
      );

      expect(screen.getByText('TaskFilters')).toBeTruthy();
    });
  });
});
