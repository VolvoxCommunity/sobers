// __tests__/components/program/DayDetailSheet.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import DayDetailSheet from '@/components/program/DayDetailSheet';

// Mock dependencies
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      card: '#fff',
      background: '#f5f5f5',
      surface: '#fff',
      primary: '#007AFF',
      border: '#E5E5E5',
      fontRegular: 'System',
      fontMedium: 'System',
      fontSemiBold: 'System',
    },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => ({
  X: function MockX() {
    return null;
  },
  Plus: function MockPlus() {
    return null;
  },
  Calendar: function MockCalendar() {
    return null;
  },
}));

// Mock GlassBottomSheet
const mockPresent = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@/components/GlassBottomSheet', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockGlassBottomSheet(
      { children, footerComponent }: any,
      ref: any
    ) {
      React.useImperativeHandle(ref, () => ({
        present: mockPresent,
        dismiss: mockDismiss,
      }));
      return (
        <>
          {children}
          {footerComponent && footerComponent({})}
        </>
      );
    }),
  };
});

// Mock MeetingListItem
jest.mock('@/components/program/MeetingListItem', () => {
  const React = jest.requireActual('react');
  const { View, Pressable, Text } = require('react-native');
  return function MockMeetingListItem({
    meeting,
    onPress,
  }: {
    meeting: any;
    onPress?: (m: any) => void;
  }) {
    return (
      <View testID={`meeting-list-item-${meeting.id}`}>
        <Pressable onPress={() => onPress?.(meeting)} testID={`meeting-press-${meeting.id}`}>
          <Text>{meeting.meeting_name}</Text>
        </Pressable>
      </View>
    );
  };
});

describe('DayDetailSheet', () => {
  const mockOnLogMeeting = jest.fn();
  const mockOnEditMeeting = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state', () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    // Should render the sheet structure
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('presents sheet with date and meetings', () => {
    const ref = React.createRef<any>();
    const mockMeetings = [
      {
        id: 'meeting-1',
        meeting_name: 'Morning AA',
        attended_at: '2024-02-15T10:00:00Z',
        location: 'Community Center',
      },
    ];

    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', mockMeetings);

    expect(mockPresent).toHaveBeenCalled();
  });

  it('dismisses sheet when called via ref', () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.dismiss();

    expect(mockDismiss).toHaveBeenCalled();
  });

  it('closes sheet when close button is pressed', () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockDismiss).toHaveBeenCalled();
  });

  it('shows empty state when no meetings', async () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', []);

    await waitFor(() => {
      expect(screen.getByText('No meetings logged')).toBeTruthy();
      expect(screen.getByText('Tap the button below to log a meeting')).toBeTruthy();
    });
  });

  it('displays meetings list when meetings exist', async () => {
    const ref = React.createRef<any>();
    const mockMeetings = [
      {
        id: 'meeting-1',
        meeting_name: 'Morning AA',
        attended_at: '2024-02-15T10:00:00Z',
        location: 'Community Center',
      },
      {
        id: 'meeting-2',
        meeting_name: 'Evening NA',
        attended_at: '2024-02-15T19:00:00Z',
        location: 'Church Hall',
      },
    ];

    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', mockMeetings);

    await waitFor(() => {
      expect(screen.getByTestId('meeting-list-item-meeting-1')).toBeTruthy();
      expect(screen.getByTestId('meeting-list-item-meeting-2')).toBeTruthy();
    });
  });

  it.skip('calls onEditMeeting when meeting is pressed', async () => {
    const ref = React.createRef<any>();
    const mockMeetings = [
      {
        id: 'meeting-1',
        meeting_name: 'Morning AA',
        attended_at: '2024-02-15T10:00:00Z',
        location: 'Community Center',
      },
    ];

    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    act(() => {
      ref.current?.present('2024-02-15', mockMeetings);
    });

    await waitFor(() => {
      const meetingItem = screen.getByTestId('meeting-list-item-meeting-1');
      fireEvent.press(meetingItem);
    });

    expect(mockOnEditMeeting).toHaveBeenCalledWith(mockMeetings[0]);
  });

  it('calls onLogMeeting when log button is pressed', async () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    act(() => {
      ref.current?.present('2024-02-15', []);
    });

    await waitFor(() => {
      expect(screen.getByText('Log Meeting')).toBeTruthy();
    });

    // Find and press log button
    const logButton = screen.getByText('Log Meeting');
    fireEvent.press(logButton);

    expect(mockOnLogMeeting).toHaveBeenCalledWith('2024-02-15');
  });

  it('formats date correctly for display', async () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', []);

    await waitFor(() => {
      // Should show formatted date (format depends on locale)
      expect(screen.getByText(/February|Thursday/)).toBeTruthy();
    });
  });

  it('handles meeting with null location', async () => {
    const ref = React.createRef<any>();
    const mockMeetings = [
      {
        id: 'meeting-1',
        meeting_name: 'Morning AA',
        attended_at: '2024-02-15T10:00:00Z',
        location: null,
      },
    ];

    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', mockMeetings);

    await waitFor(() => {
      expect(screen.getByTestId('meeting-list-item-meeting-1')).toBeTruthy();
    });
  });

  it('handles meeting with notes', async () => {
    const ref = React.createRef<any>();
    const mockMeetings = [
      {
        id: 'meeting-1',
        meeting_name: 'Morning AA',
        attended_at: '2024-02-15T10:00:00Z',
        location: 'Community Center',
        notes: 'Great meeting today',
      },
    ];

    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', mockMeetings);

    await waitFor(() => {
      expect(screen.getByTestId('meeting-list-item-meeting-1')).toBeTruthy();
    });
  });

  it('renders footer with log button', () => {
    const ref = React.createRef<any>();
    render(
      <DayDetailSheet ref={ref} onLogMeeting={mockOnLogMeeting} onEditMeeting={mockOnEditMeeting} />
    );

    ref.current?.present('2024-02-15', []);

    expect(screen.getByText('Log Meeting')).toBeTruthy();
  });
});
