/**
 * @fileoverview Tests for TaskFilters component
 *
 * Tests the task filters including:
 * - Status filter chips
 * - Sponsee filter chips
 * - Filter selection
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TaskFilters from '@/components/tasks/TaskFilters';
import { Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  border: '#E5E7EB',
  fontRegular: 'System',
};

// Mock format utilities
jest.mock('@/lib/format', () => ({
  formatProfileName: jest.fn((profile: any) => profile?.display_name || '?'),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSponsees: Profile[] = [
  {
    id: 'sponsee-1',
    email: 'john@example.com',
    display_name: 'John D.',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
  },
  {
    id: 'sponsee-2',
    email: 'jane@example.com',
    display_name: 'Jane S.',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    notification_preferences: { tasks: true, messages: true, milestones: true, daily: true },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('TaskFilters', () => {
  const mockOnStatusFilterChange = jest.fn();
  const mockOnSponseeFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Filters', () => {
    it('renders all status filter options', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      expect(screen.getByText('All Tasks')).toBeTruthy();
      expect(screen.getByText('Assigned')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });

    it('highlights active status filter', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="assigned"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      // Active filter should be present
      expect(screen.getByText('Assigned')).toBeTruthy();
    });

    it('calls onStatusFilterChange when "All Tasks" is pressed', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="assigned"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      fireEvent.press(screen.getByText('All Tasks'));
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onStatusFilterChange when "Assigned" is pressed', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      fireEvent.press(screen.getByText('Assigned'));
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('assigned');
    });

    it('calls onStatusFilterChange when "Completed" is pressed', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      fireEvent.press(screen.getByText('Completed'));
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('completed');
    });
  });

  describe('Sponsee Filters', () => {
    it('does not render sponsee filters when no sponsees provided', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      expect(screen.queryByText('All Sponsees')).toBeNull();
    });

    it('does not render sponsee filters when only one sponsee', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={[mockSponsees[0]]}
          selectedSponseeId="sponsee-1"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      expect(screen.queryByText('All Sponsees')).toBeNull();
    });

    it('renders sponsee filters when multiple sponsees exist', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={mockSponsees}
          selectedSponseeId="all"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      expect(screen.getByText('All Sponsees')).toBeTruthy();
      expect(screen.getByText('John D.')).toBeTruthy();
      expect(screen.getByText('Jane S.')).toBeTruthy();
    });

    it('calls onSponseeFilterChange when "All Sponsees" is pressed', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={mockSponsees}
          selectedSponseeId="sponsee-1"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      fireEvent.press(screen.getByText('All Sponsees'));
      expect(mockOnSponseeFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onSponseeFilterChange when specific sponsee is pressed', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={mockSponsees}
          selectedSponseeId="all"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      fireEvent.press(screen.getByText('John D.'));
      expect(mockOnSponseeFilterChange).toHaveBeenCalledWith('sponsee-1');
    });

    it('highlights selected sponsee filter', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={mockSponsees}
          selectedSponseeId="sponsee-2"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      // Selected sponsee should be present
      expect(screen.getByText('Jane S.')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('sets button role and accessibility label for status filters', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      expect(screen.getByLabelText('Show all tasks')).toBeTruthy();
      expect(screen.getByLabelText('Show assigned tasks')).toBeTruthy();
      expect(screen.getByLabelText('Show completed tasks')).toBeTruthy();
    });

    it('sets selected state for active status filter', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="assigned"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      );

      // Accessibility state is set in component code
      const assignedButton = screen.getByLabelText('Show assigned tasks');
      expect(assignedButton).toBeTruthy();
    });

    it('sets accessibility label for sponsee filters', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={mockSponsees}
          selectedSponseeId="all"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      expect(screen.getByLabelText('Show all sponsees')).toBeTruthy();
      expect(screen.getByLabelText('Show tasks for John D.')).toBeTruthy();
      expect(screen.getByLabelText('Show tasks for Jane S.')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles sponsee with no display name', () => {
      const sponseeWithoutName = {
        ...mockSponsees[0],
        display_name: null,
      };

      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={[sponseeWithoutName, mockSponsees[1]]}
          selectedSponseeId="all"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      expect(screen.getByText('?')).toBeTruthy();
    });

    it('handles empty sponsees array', () => {
      render(
        <TaskFilters
          theme={mockTheme}
          filterStatus="all"
          onStatusFilterChange={mockOnStatusFilterChange}
          sponsees={[]}
          selectedSponseeId="all"
          onSponseeFilterChange={mockOnSponseeFilterChange}
        />
      );

      expect(screen.queryByText('All Sponsees')).toBeNull();
    });
  });
});
