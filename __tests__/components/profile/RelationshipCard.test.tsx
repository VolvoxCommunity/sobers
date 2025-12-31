/**
 * @fileoverview Tests for RelationshipCard component
 *
 * Tests the relationship card display including:
 * - Rendering profile information
 * - Displaying days sober
 * - Task statistics for sponsees
 * - Disconnect functionality
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RelationshipCard from '@/components/profile/RelationshipCard';
import { Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  black: '#000000',
  danger: '#FF3B30',
  dangerLight: '#FFE5E5',
  dangerBorder: '#FFCCCC',
  success: '#10b981',
  fontRegular: 'System',
  white: '#FFFFFF',
};

// Mock useDaysSober hook
const mockUseDaysSober = jest.fn();
jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: (userId?: string) => mockUseDaysSober(userId),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Heart: 'Heart',
  UserMinus: 'UserMinus',
  CheckCircle: 'CheckCircle',
  Plus: 'Plus',
}));

// =============================================================================
// Test Data
// =============================================================================

const mockProfile: Profile = {
  id: 'user-123',
  email: 'john@example.com',
  display_name: 'John D.',
  sobriety_date: '2024-01-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: {
    tasks: true,
    messages: true,
    milestones: true,
    daily: true,
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('RelationshipCard', () => {
  const mockOnDisconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDaysSober.mockReturnValue({ daysSober: 180, loading: false });
  });

  describe('Basic Rendering', () => {
    it('renders profile display name', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('John D.')).toBeTruthy();
    });

    it('renders profile initial in avatar', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsor"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('J')).toBeTruthy();
    });

    it('renders connection date', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText(/Connected/)).toBeTruthy();
    });

    it('renders disconnect button', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Disconnect')).toBeTruthy();
    });
  });

  describe('Days Sober Display', () => {
    it('displays days sober when sobriety_date is set', () => {
      mockUseDaysSober.mockReturnValue({ daysSober: 180, loading: false });

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('180 days sober')).toBeTruthy();
    });

    it('calls useDaysSober with correct userId', () => {
      render(
        <RelationshipCard
          userId="test-user-id"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsor"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(mockUseDaysSober).toHaveBeenCalledWith('test-user-id');
    });

    it('does not display days sober when sobriety_date is null', () => {
      const profileWithoutDate = { ...mockProfile, sobriety_date: undefined };

      render(
        <RelationshipCard
          userId="user-123"
          profile={profileWithoutDate}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.queryByText(/days sober/)).toBeNull();
    });

    it('displays 1 day sober correctly (singular)', () => {
      mockUseDaysSober.mockReturnValue({ daysSober: 1, loading: false });

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('1 day sober')).toBeTruthy();
    });

    it('displays loading indicator during loading instead of null', () => {
      mockUseDaysSober.mockReturnValue({ daysSober: null, loading: true });

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Should show "..." during loading, NOT "null days sober"
      expect(screen.getByText('...')).toBeTruthy();
      expect(screen.queryByText(/null days sober/)).toBeNull();
      expect(screen.queryByText('180 days sober')).toBeNull();
    });

    it('has correct accessibility label during loading', () => {
      mockUseDaysSober.mockReturnValue({ daysSober: null, loading: true });

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Should have "Loading days sober" accessibility label during loading
      const sobrietyInfo = screen.getByLabelText('Loading days sober');
      expect(sobrietyInfo).toBeTruthy();
    });
  });

  describe('Task Statistics', () => {
    it('displays task stats for sponsees', () => {
      const taskStats = { total: 10, completed: 7 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      expect(screen.getByText('7/10 tasks completed')).toBeTruthy();
    });

    it('does not display task stats for sponsors', () => {
      const taskStats = { total: 10, completed: 7 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsor"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      expect(screen.queryByText(/tasks completed/)).toBeNull();
    });

    it('displays zero completed tasks', () => {
      const taskStats = { total: 5, completed: 0 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      expect(screen.getByText('0/5 tasks completed')).toBeTruthy();
    });

    it('displays all tasks completed', () => {
      const taskStats = { total: 5, completed: 5 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      expect(screen.getByText('5/5 tasks completed')).toBeTruthy();
    });

    it('displays "Assign a task" link when no tasks are assigned and onAssignTask provided', () => {
      const taskStats = { total: 0, completed: 0 };
      const mockOnAssignTask = jest.fn();

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
          onAssignTask={mockOnAssignTask}
        />
      );

      expect(screen.getByText('Assign a task')).toBeTruthy();
      expect(screen.queryByText('0/0 tasks completed')).toBeNull();
    });

    it('does not display "Assign a task" link when no tasks but onAssignTask not provided', () => {
      const taskStats = { total: 0, completed: 0 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      expect(screen.queryByText('Assign a task')).toBeNull();
      expect(screen.queryByText('0/0 tasks completed')).toBeNull();
    });

    it('calls onAssignTask when "Assign a task" link is pressed', () => {
      const taskStats = { total: 0, completed: 0 };
      const mockOnAssignTask = jest.fn();

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
          onAssignTask={mockOnAssignTask}
        />
      );

      fireEvent.press(screen.getByText('Assign a task'));
      expect(mockOnAssignTask).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility label for "Assign a task" link', () => {
      const taskStats = { total: 0, completed: 0 };
      const mockOnAssignTask = jest.fn();

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
          onAssignTask={mockOnAssignTask}
        />
      );

      const assignTaskLink = screen.getByLabelText('Assign a task');
      expect(assignTaskLink).toBeTruthy();
    });
  });

  describe('Disconnect Functionality', () => {
    it('calls onDisconnect when disconnect button is pressed', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      fireEvent.press(screen.getByText('Disconnect'));
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('disconnect button is rendered and accessible', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByText('Disconnect');
      expect(disconnectButton).toBeTruthy();
    });
  });

  describe('Null Profile Handling', () => {
    it('displays "Unknown" when profile is null', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={null}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('displays "U" initial when profile is null (from "Unknown" fallback)', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={null}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsor"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      // When profile is null, displayName becomes "Unknown", so initial is "U"
      expect(screen.getByText('U')).toBeTruthy();
    });

    it('handles null display_name', () => {
      const profileWithoutName = { ...mockProfile, display_name: null };

      render(
        <RelationshipCard
          userId="user-123"
          profile={profileWithoutName}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Unknown')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('sets accessibility label for sponsee card', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      const card = screen.getByLabelText('Sponsee John D.');
      expect(card).toBeTruthy();
    });

    it('sets accessibility label for sponsor card', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsor"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      const card = screen.getByLabelText('Sponsor John D.');
      expect(card).toBeTruthy();
    });

    it('sets accessibility label for days sober', () => {
      mockUseDaysSober.mockReturnValue({ daysSober: 180, loading: false });

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      const sobrietyInfo = screen.getByLabelText('180 days sober');
      expect(sobrietyInfo).toBeTruthy();
    });

    it('sets accessibility label for task stats', () => {
      const taskStats = { total: 10, completed: 7 };

      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
          taskStats={taskStats}
        />
      );

      const taskStatsInfo = screen.getByLabelText('7 out of 10 tasks completed');
      expect(taskStatsInfo).toBeTruthy();
    });

    it('sets accessibility label for disconnect button', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={mockProfile}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      const disconnectButton = screen.getByLabelText('Disconnect from John D.');
      expect(disconnectButton).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty display name', () => {
      // When display_name is empty string, component shows empty string
      // (nullish coalescing ?? only replaces null/undefined, not empty string)
      const profileWithEmptyName = { ...mockProfile, display_name: '' };

      render(
        <RelationshipCard
          userId="user-123"
          profile={profileWithEmptyName}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Verify avatar shows "?" for empty name and component renders
      expect(screen.getByText('?')).toBeTruthy();
    });

    it('handles null profile with Unknown fallback', () => {
      render(
        <RelationshipCard
          userId="user-123"
          profile={null}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      // Nullish coalescing triggers for null profile, showing "Unknown"
      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('handles long display names', () => {
      const profileWithLongName = {
        ...mockProfile,
        display_name: 'Very Long Name That Might Overflow',
      };

      render(
        <RelationshipCard
          userId="user-123"
          profile={profileWithLongName}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText('Very Long Name That Might Overflow')).toBeTruthy();
    });

    it('handles special characters in display name', () => {
      const profileWithSpecialChars = { ...mockProfile, display_name: "O'Brien-Jones" };

      render(
        <RelationshipCard
          userId="user-123"
          profile={profileWithSpecialChars}
          connectedAt="2024-01-01T00:00:00Z"
          relationshipType="sponsee"
          theme={mockTheme}
          onDisconnect={mockOnDisconnect}
        />
      );

      expect(screen.getByText("O'Brien-Jones")).toBeTruthy();
    });
  });
});
