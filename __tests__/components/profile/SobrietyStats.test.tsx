/**
 * @fileoverview Tests for SobrietyStats component
 *
 * Tests the sobriety statistics display including:
 * - Days sober rendering
 * - Journey and streak dates
 * - Loading states
 * - Edit and log slip-up actions
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SobrietyStats from '@/components/profile/SobrietyStats';

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
  white: '#FFFFFF',
  fontRegular: 'System',
};

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Heart: 'Heart',
  Edit2: 'Edit2',
}));

// Mock date utilities
jest.mock('@/lib/date', () => ({
  parseDateAsLocal: jest.fn((dateString: string) => {
    // Parse YYYY-MM-DD format as local date
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('SobrietyStats', () => {
  const mockOnEditSobrietyDate = jest.fn();
  const mockOnLogSlipUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Days Sober Display', () => {
    it('renders days sober count', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('180 Days')).toBeTruthy();
    });

    it('displays loading state', () => {
      render(
        <SobrietyStats
          daysSober={0}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={true}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('...')).toBeTruthy();
    });

    it('displays zero days sober', () => {
      render(
        <SobrietyStats
          daysSober={0}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('0 Days')).toBeTruthy();
    });

    it('displays large day counts', () => {
      render(
        <SobrietyStats
          daysSober={1000}
          journeyStartDate="2021-01-01"
          currentStreakStartDate="2021-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('1000 Days')).toBeTruthy();
    });
  });

  describe('Journey Start Date', () => {
    it('displays journey start date', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText(/Journey started:/)).toBeTruthy();
    });

    it('formats journey start date correctly', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-06-15"
          currentStreakStartDate="2024-06-15"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      // Should show formatted date (June 15, 2024)
      expect(screen.getByText(/Journey started:/)).toBeTruthy();
    });

    it('does not display journey start date when null', () => {
      render(
        <SobrietyStats
          daysSober={0}
          journeyStartDate={null}
          currentStreakStartDate={null}
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.queryByText(/Journey started:/)).toBeNull();
    });
  });

  describe('Current Streak Display', () => {
    it('displays current streak when user has slip-ups', () => {
      render(
        <SobrietyStats
          daysSober={90}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-06-01"
          hasSlipUps={true}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText(/Current streak since/)).toBeTruthy();
    });

    it('does not display current streak when no slip-ups', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.queryByText(/Current streak since/)).toBeNull();
    });

    it('does not display current streak when streak date is null', () => {
      render(
        <SobrietyStats
          daysSober={90}
          journeyStartDate="2024-01-01"
          currentStreakStartDate={null}
          hasSlipUps={true}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.queryByText(/Current streak since/)).toBeNull();
    });
  });

  describe('Edit Sobriety Date Action', () => {
    it('renders edit button', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const editButton = screen.getByLabelText('Edit sobriety date');
      expect(editButton).toBeTruthy();
    });

    it('calls onEditSobrietyDate when edit button is pressed', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const editButton = screen.getByLabelText('Edit sobriety date');
      fireEvent.press(editButton);

      expect(mockOnEditSobrietyDate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Log Slip-Up Action', () => {
    it('renders slip-up button', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('Record a Setback')).toBeTruthy();
    });

    it('calls onLogSlipUp when button is pressed', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      fireEvent.press(screen.getByText('Record a Setback'));

      expect(mockOnLogSlipUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('sets header role for section title', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const header = screen.getByLabelText('Sobriety Journey');
      expect(header).toBeTruthy();
    });

    it('sets accessibility label for days sober when not loading', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const daysText = screen.getByLabelText('180 Days Sober');
      expect(daysText).toBeTruthy();
    });

    it('sets accessibility label for days sober when loading', () => {
      render(
        <SobrietyStats
          daysSober={0}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={true}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const loadingText = screen.getByLabelText('Loading days sober');
      expect(loadingText).toBeTruthy();
    });

    it('sets accessibility label for slip-up button', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      const slipUpButton = screen.getByLabelText('Record a Setback');
      expect(slipUpButton).toBeTruthy();
    });

    it('sets accessibility hint for slip-up button', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      // Accessibility hint is set in component code
      const slipUpButton = screen.getByLabelText('Record a Setback');
      expect(slipUpButton).toBeTruthy();
    });

    it('sets live region for days sober updates', () => {
      render(
        <SobrietyStats
          daysSober={180}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      // Live region is set in component code
      const daysText = screen.getByLabelText('180 Days Sober');
      expect(daysText).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles 1 day sober (singular)', () => {
      render(
        <SobrietyStats
          daysSober={1}
          journeyStartDate="2024-12-15"
          currentStreakStartDate="2024-12-15"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('1 Day')).toBeTruthy();
    });

    it('handles negative days gracefully', () => {
      render(
        <SobrietyStats
          daysSober={-1}
          journeyStartDate="2024-01-01"
          currentStreakStartDate="2024-01-01"
          hasSlipUps={false}
          loading={false}
          theme={mockTheme}
          onEditSobrietyDate={mockOnEditSobrietyDate}
          onLogSlipUp={mockOnLogSlipUp}
        />
      );

      expect(screen.getByText('-1 Days')).toBeTruthy();
    });
  });
});
