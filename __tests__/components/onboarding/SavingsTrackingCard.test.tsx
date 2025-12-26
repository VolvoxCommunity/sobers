import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import SavingsTrackingCard from '@/components/onboarding/SavingsTrackingCard';

describe('SavingsTrackingCard', () => {
  const defaultProps = {
    isEnabled: false,
    onToggle: jest.fn(),
    amount: '',
    onAmountChange: jest.fn(),
    frequency: 'weekly' as const,
    onFrequencyChange: jest.fn(),
    error: null as string | null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the toggle switch', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} />);
    expect(screen.getByText('I want to track money saved')).toBeTruthy();
  });

  it('should not show input fields when disabled', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} isEnabled={false} />);
    expect(screen.queryByTestId('savings-amount-input')).toBeNull();
    expect(screen.queryByTestId('savings-frequency-picker')).toBeNull();
  });

  it('should show input fields when enabled', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} isEnabled={true} />);
    expect(screen.getByTestId('savings-amount-input')).toBeTruthy();
    expect(screen.getByTestId('savings-frequency-picker')).toBeTruthy();
  });

  it('should call onToggle when switch is pressed', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} />);
    fireEvent.press(screen.getByTestId('savings-toggle'));
    expect(defaultProps.onToggle).toHaveBeenCalledWith(true);
  });

  it('should call onAmountChange when amount is entered', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} isEnabled={true} />);
    fireEvent.changeText(screen.getByTestId('savings-amount-input'), '50');
    expect(defaultProps.onAmountChange).toHaveBeenCalledWith('50');
  });

  it('should display error when provided', () => {
    renderWithProviders(
      <SavingsTrackingCard {...defaultProps} isEnabled={true} error="Amount is required" />
    );
    expect(screen.getByText('Amount is required')).toBeTruthy();
  });

  it('should show all frequency options', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} isEnabled={true} />);
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Weekly')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
  });

  it('should call onFrequencyChange when frequency is selected', () => {
    renderWithProviders(<SavingsTrackingCard {...defaultProps} isEnabled={true} />);
    fireEvent.press(screen.getByText('Monthly'));
    expect(defaultProps.onFrequencyChange).toHaveBeenCalledWith('monthly');
  });

  it('should highlight selected frequency', () => {
    renderWithProviders(
      <SavingsTrackingCard {...defaultProps} isEnabled={true} frequency="monthly" />
    );
    const monthlyButton = screen.getByTestId('frequency-monthly');
    expect(monthlyButton.props.accessibilityState?.selected).toBe(true);
  });
});
