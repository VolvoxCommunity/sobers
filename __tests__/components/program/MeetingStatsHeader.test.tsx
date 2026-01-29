// __tests__/components/program/MeetingStatsHeader.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MeetingStatsHeader from '@/components/program/MeetingStatsHeader';

// Mock theme context
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      card: '#fff',
      primary: '#007AFF',
      warning: '#FF9500',
      border: '#E5E5E5',
      shadow: '#000',
      fontRegular: 'System',
      fontMedium: 'System',
      fontSemiBold: 'System',
    },
  }),
}));

describe('MeetingStatsHeader', () => {
  it('displays meeting count', () => {
    render(<MeetingStatsHeader totalMeetings={47} streak={0} />);
    expect(screen.getByText('47 meetings')).toBeTruthy();
  });

  it('displays singular meeting for count of 1', () => {
    render(<MeetingStatsHeader totalMeetings={1} streak={0} />);
    expect(screen.getByText('1 meeting')).toBeTruthy();
  });

  it('displays streak when active', () => {
    render(<MeetingStatsHeader totalMeetings={10} streak={5} />);
    expect(screen.getByText('5 day streak')).toBeTruthy();
  });

  it('hides streak when zero', () => {
    render(<MeetingStatsHeader totalMeetings={10} streak={0} />);
    expect(screen.queryByText('day streak')).toBeNull();
  });

  it('displays 0 meetings when empty', () => {
    render(<MeetingStatsHeader totalMeetings={0} streak={0} />);
    expect(screen.getByText('0 meetings')).toBeTruthy();
  });
});
