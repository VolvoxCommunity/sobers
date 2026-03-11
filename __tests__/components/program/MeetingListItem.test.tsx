// __tests__/components/program/MeetingListItem.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MeetingListItem from '@/components/program/MeetingListItem';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      card: '#fff',
      primary: '#007AFF',
      primaryLight: '#E3F2FD',
      border: '#E5E5E5',
      fontRegular: 'System',
      fontSemiBold: 'System',
    },
  }),
}));

jest.mock('lucide-react-native', () => ({
  Users: () => null,
  Clock: () => null,
  MapPin: () => null,
  ChevronRight: () => null,
}));

describe('MeetingListItem', () => {
  const mockMeeting = {
    id: 'meeting-1',
    meeting_name: 'Morning AA',
    attended_at: '2024-02-15T10:00:00Z',
    location: 'Community Center',
    notes: 'Great meeting',
  };

  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders meeting name', () => {
    render(<MeetingListItem meeting={mockMeeting} onPress={mockOnPress} />);

    expect(screen.getByText('Morning AA')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<MeetingListItem meeting={mockMeeting} onPress={mockOnPress} />);

    const item = screen.getByTestId('meeting-item-meeting-1');
    fireEvent.press(item);

    expect(mockOnPress).toHaveBeenCalledWith(mockMeeting);
  });

  it('renders with showDate prop', () => {
    render(<MeetingListItem meeting={mockMeeting} onPress={mockOnPress} showDate />);

    expect(screen.getByText('Morning AA')).toBeTruthy();
  });

  it('renders without location', () => {
    const meetingWithoutLocation = {
      ...mockMeeting,
      location: null,
    };

    render(<MeetingListItem meeting={meetingWithoutLocation} onPress={mockOnPress} />);

    expect(screen.getByText('Morning AA')).toBeTruthy();
  });

  it('renders without notes', () => {
    const meetingWithoutNotes = {
      ...mockMeeting,
      notes: null,
    };

    render(<MeetingListItem meeting={meetingWithoutNotes} onPress={mockOnPress} />);

    expect(screen.getByText('Morning AA')).toBeTruthy();
  });
});
