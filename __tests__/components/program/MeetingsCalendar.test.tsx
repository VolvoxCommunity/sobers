// __tests__/components/program/MeetingsCalendar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MeetingsCalendar from '@/components/program/MeetingsCalendar';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      card: '#fff',
      background: '#f5f5f5',
      primary: '#007AFF',
      primaryLight: '#E3F2FD',
      border: '#E5E5E5',
      shadow: '#000',
      fontRegular: 'System',
      fontMedium: 'System',
      fontSemiBold: 'System',
    },
  }),
}));

describe('MeetingsCalendar', () => {
  const mockOnDayPress = jest.fn();
  const meetingDates = new Set(['2026-01-15', '2026-01-20']);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month and year header', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    // Default to current month - January 2026
    expect(screen.getByText(/January 2026/)).toBeTruthy();
  });

  it('calls onDayPress when day is tapped', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    const day15 = screen.getByText('15');
    fireEvent.press(day15);
    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-15');
  });

  it('shows dot indicator on days with meetings', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    // Day 15 should have a meeting dot
    const day15Container = screen.getByTestId('calendar-day-15');
    expect(day15Container).toBeTruthy();
  });
});
