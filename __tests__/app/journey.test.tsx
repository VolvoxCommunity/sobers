import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import JourneyScreen from '@/app/(tabs)/journey';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useDaysSober } from '@/hooks/useDaysSober';

// Mock Contexts
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#6200ee',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      background: '#ffffff',
      card: '#f5f5f5',
      border: '#e0e0e0',
      fontRegular: 'System',
    },
  }),
}));

// Mock Hooks
jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: jest.fn(),
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
  };
});

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockIcon = (props: any) => <View {...props} />;
  return {
    Calendar: MockIcon,
    CheckCircle: MockIcon,
    Heart: MockIcon,
    RefreshCw: MockIcon,
    Award: MockIcon,
    TrendingUp: MockIcon,
    CheckSquare: MockIcon,
    ListChecks: MockIcon,
    Target: MockIcon,
  };
});

describe('JourneyScreen', () => {
  const mockProfile = {
    id: 'user-123',
    sobriety_date: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ profile: mockProfile });
    (useDaysSober as jest.Mock).mockReturnValue({
      daysSober: 100,
      hasSlipUps: false,
      mostRecentSlipUp: null,
      journeyStartDate: '2024-01-01',
      currentStreakStartDate: '2024-01-01',
      loading: false,
      error: null,
    });
  });

  const setupSupabaseMock = (slipUps: any[] = [], steps: any[] = [], tasks: any[] = []) => {
    (supabase.from as jest.Mock).mockImplementation((table) => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
      };

      if (table === 'slip_ups') {
        mockChain.order.mockResolvedValue({ data: slipUps, error: null });
      } else if (table === 'user_step_progress') {
        mockChain.order.mockResolvedValue({ data: steps, error: null });
      } else if (table === 'tasks') {
        mockChain.order.mockResolvedValue({ data: tasks, error: null });
      }

      return mockChain;
    });
  };

  it('renders single metric when there are no slip-ups', async () => {
    setupSupabaseMock([], [], []);

    render(<JourneyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Days Sober')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
    });

    expect(screen.queryByText('Current Streak')).toBeNull();
    expect(screen.queryByText('Journey Started')).toBeNull();
  });

  it('renders dual metrics when there are slip-ups', async () => {
    const slipUps = [
      {
        id: 'slip-1',
        slip_up_date: '2024-02-01',
        recovery_restart_date: '2024-02-02',
        notes: 'Test slip up',
      },
    ];
    setupSupabaseMock(slipUps, [], []);

    // Update days sober to reflect current streak with slip-up
    (useDaysSober as jest.Mock).mockReturnValue({
      daysSober: 50,
      hasSlipUps: true,
      mostRecentSlipUp: slipUps[0],
      journeyStartDate: '2024-01-01',
      currentStreakStartDate: '2024-02-02',
      loading: false,
      error: null,
    });

    render(<JourneyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Current Streak')).toBeTruthy();
      expect(screen.getByText('Journey Started')).toBeTruthy();
      // 50 days streak
      expect(screen.getByText('50')).toBeTruthy();
    });
  });

  it('displays timeline events correctly', async () => {
    const slipUps = [
      {
        id: 'slip-1',
        slip_up_date: '2024-02-01',
        recovery_restart_date: '2024-02-02',
        notes: 'Relapse',
      },
    ];
    setupSupabaseMock(slipUps, [], []);

    render(<JourneyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Recovery Journey Began')).toBeTruthy();
      expect(screen.getByText('Slip Up')).toBeTruthy();
      expect(screen.getByText('Relapse')).toBeTruthy();
    });
  });

  it('shows loading state', () => {
    // Make supabase promise never resolve to keep loading state
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue(new Promise(() => {})),
    }));

    render(<JourneyScreen />);

    expect(screen.getByText('Loading your journey...')).toBeTruthy();
  });

  it('handles empty state', async () => {
    (useAuth as jest.Mock).mockReturnValue({ profile: { ...mockProfile, sobriety_date: null } });
    setupSupabaseMock([], [], []);

    render(<JourneyScreen />);

    await waitFor(() => {
      expect(screen.getByText('Your journey is just beginning')).toBeTruthy();
    });
  });
});
