/**
 * @fileoverview Tests for MoneySavedCard component
 *
 * Tests the dashboard card displaying money saved since sobriety including:
 * - Total saved amount rendering
 * - Spending basis text display
 * - Breakdown values for day/week/month
 * - Menu interactions (edit, hide)
 * - Edge cases (zero days, large amounts)
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import MoneySavedCard from '@/components/dashboard/MoneySavedCard';

// =============================================================================
// Tests
// =============================================================================

describe('MoneySavedCard', () => {
  const defaultProps = {
    amount: 50,
    frequency: 'weekly' as const,
    daysSober: 30,
    onPress: jest.fn(),
    onHide: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Total Saved Amount', () => {
    it('should render total saved amount', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      // $50/week = $7.14/day, 30 days = $214.29
      expect(screen.getByTestId('money-saved-total')).toBeTruthy();
    });

    it('should handle zero days sober', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} daysSober={0} />);
      const totalText = screen.getByTestId('money-saved-total');
      expect(totalText).toHaveTextContent('$0.00');
    });

    it('should format large amounts with commas', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} amount={1000} daysSober={365} />);
      // $1000/week = $142.86/day, 365 days = $52,142.86
      const totalText = screen.getByTestId('money-saved-total');
      expect(totalText.props.children).toMatch(/\$\d{1,3}(,\d{3})*\.\d{2}/);
    });
  });

  describe('Spending Basis Text', () => {
    it('should render spending basis text', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      expect(screen.getByText(/Based on \$50.*week/)).toBeTruthy();
    });

    it('should display correct frequency in basis text', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} frequency="monthly" />);
      expect(screen.getByText(/Based on \$50.*month/)).toBeTruthy();
    });
  });

  describe('Breakdown Buttons', () => {
    it('should render breakdown buttons', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      expect(screen.getByTestId('breakdown-day')).toBeTruthy();
      expect(screen.getByTestId('breakdown-week')).toBeTruthy();
      expect(screen.getByTestId('breakdown-month')).toBeTruthy();
    });

    it('should display correct daily breakdown', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      const dayButton = screen.getByTestId('breakdown-day');
      // $50/week = $7.14/day
      expect(dayButton).toHaveTextContent(/\$7\.14/);
    });

    it('should display correct weekly breakdown', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      const weekButton = screen.getByTestId('breakdown-week');
      expect(weekButton).toHaveTextContent(/\$50\.00/);
    });

    it('should display correct monthly breakdown', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      const monthButton = screen.getByTestId('breakdown-month');
      // $7.14/day * 30.44 = $217.39
      expect(monthButton).toHaveTextContent(/\$217/);
    });
  });

  describe('Card Interaction', () => {
    it('should not have onPress handler (edit via menu only)', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      const card = screen.getByTestId('money-saved-card');
      // Card is a View, not TouchableOpacity, so it has no onPress prop
      expect(card.props.onPress).toBeUndefined();
    });

    it('should have correct accessibility label', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      const card = screen.getByTestId('money-saved-card');
      expect(card.props.accessibilityLabel).toContain('Use menu to edit');
    });
  });

  describe('Different Frequencies', () => {
    it('should calculate correctly for daily frequency', () => {
      renderWithProviders(
        <MoneySavedCard {...defaultProps} amount={10} frequency="daily" daysSober={10} />
      );
      const totalText = screen.getByTestId('money-saved-total');
      // $10/day * 10 days = $100
      expect(totalText).toHaveTextContent('$100.00');
    });

    it('should calculate correctly for monthly frequency', () => {
      // Use 365/12 (average days per month) for precise calculation
      const monthlyAmount = 365 / 12; // ≈ 30.4167
      renderWithProviders(
        <MoneySavedCard
          {...defaultProps}
          amount={monthlyAmount}
          frequency="monthly"
          daysSober={30}
        />
      );
      const totalText = screen.getByTestId('money-saved-total');
      // $30.4167/month / (365/12) = $1/day * 30 days = $30.00
      expect(totalText).toHaveTextContent('$30.00');
    });

    it('should calculate correctly for yearly frequency', () => {
      renderWithProviders(
        <MoneySavedCard {...defaultProps} amount={3650} frequency="yearly" daysSober={365} />
      );
      const totalText = screen.getByTestId('money-saved-total');
      // $3650/year / 365 = $10/day * 365 days = $3650
      expect(totalText).toHaveTextContent('$3,650.00');
    });
  });

  describe('Three-Dot Menu (Configured)', () => {
    it('should render three-dot menu button', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      expect(screen.getByTestId('money-saved-menu-button')).toBeTruthy();
    });

    it('should show menu options when button is pressed', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      fireEvent.press(screen.getByTestId('money-saved-menu-button'));
      expect(screen.getByText('Edit savings')).toBeTruthy();
      expect(screen.getByText('Hide from dashboard')).toBeTruthy();
    });

    it('should call onPress when Edit savings is selected', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      fireEvent.press(screen.getByTestId('money-saved-menu-button'));
      fireEvent.press(screen.getByText('Edit savings'));
      expect(defaultProps.onPress).toHaveBeenCalled();
    });

    it('should call onHide when Hide from dashboard is selected', () => {
      renderWithProviders(<MoneySavedCard {...defaultProps} />);
      fireEvent.press(screen.getByTestId('money-saved-menu-button'));
      fireEvent.press(screen.getByText('Hide from dashboard'));
      expect(defaultProps.onHide).toHaveBeenCalled();
    });
  });

  describe('Unconfigured State', () => {
    const unconfiguredProps = {
      variant: 'unconfigured' as const,
      onSetup: jest.fn(),
      onHide: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render setup prompt', () => {
      renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
      expect(screen.getByText('Track Money Saved')).toBeTruthy();
    });

    it('should render setup description', () => {
      renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
      expect(screen.getByText(/Set up spending tracking/)).toBeTruthy();
    });

    it('should call onSetup when card is pressed', () => {
      renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
      fireEvent.press(screen.getByTestId('money-saved-card'));
      expect(unconfiguredProps.onSetup).toHaveBeenCalled();
    });

    it('should render three-dot menu', () => {
      renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
      expect(screen.getByTestId('money-saved-menu-button')).toBeTruthy();
    });

    it('should call onHide when hide option is selected', () => {
      renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
      fireEvent.press(screen.getByTestId('money-saved-menu-button'));
      fireEvent.press(screen.getByText('Hide from dashboard'));
      expect(unconfiguredProps.onHide).toHaveBeenCalled();
    });
  });
});
