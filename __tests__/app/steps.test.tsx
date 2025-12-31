/**
 * @fileoverview Tests for app/(tabs)/steps/index.tsx
 *
 * Tests the Steps list screen including:
 * - Loading, error, and empty states
 * - Step list rendering
 * - Completed step badge display
 * - Navigation to detail screen when step is pressed
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import StepsScreen from '@/app/(app)/(tabs)/steps/index';
import { StepContent, Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router for navigation testing
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      back: jest.fn(),
      replace: jest.fn(),
    }),
    // useFocusEffect runs the callback immediately (simulating focused state)
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// Mock supabase - simpler approach
let mockStepsData: StepContent[] | null = null;
let mockStepsError: Error | null = null;
let mockProgressData: unknown[] = [];

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'steps_content') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest
              .fn()
              .mockImplementation(() =>
                Promise.resolve({ data: mockStepsData, error: mockStepsError })
              ),
          }),
        };
      }
      if (table === 'user_step_progress') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest
              .fn()
              .mockImplementation(() => Promise.resolve({ data: mockProgressData, error: null })),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      primaryLight: '#E5F1FF',
      text: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock AuthContext
let mockProfile: Profile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'John D.',
  sobriety_date: '2024-01-01',
  notification_preferences: {
    tasks: true,
    messages: true,
    milestones: true,
    daily: true,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'user-123' },
    session: {},
    loading: false,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  CheckCircle: () => null,
  Settings: () => null,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'database',
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSteps: StepContent[] = [
  {
    id: 'step-1',
    step_number: 1,
    title: 'We admitted we were powerless',
    description: 'The first step in recovery',
    detailed_content: 'Detailed content for step 1',
    reflection_prompts: ['What does powerlessness mean to you?'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'step-2',
    step_number: 2,
    title: 'Came to believe',
    description: 'Finding a higher power',
    detailed_content: 'Detailed content for step 2',
    reflection_prompts: ['What does a higher power mean to you?'],
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'step-3',
    step_number: 3,
    title: 'Made a decision',
    description: 'Turning our will over',
    detailed_content: 'Detailed content for step 3',
    reflection_prompts: [],
    created_at: '2024-01-01T00:00:00Z',
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('StepsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    // Default mock setup: steps load successfully with no progress
    mockStepsData = mockSteps;
    mockStepsError = null;
    mockProgressData = [];
    // Reset profile to default with display_name
    mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      display_name: 'John D.',
      sobriety_date: '2024-01-01',
      notification_preferences: {
        tasks: true,
        messages: true,
        milestones: true,
        daily: true,
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
  });

  describe('loading state', () => {
    it('shows loading text initially', () => {
      render(<StepsScreen />);

      // Initially shows loading (before async completes)
      expect(screen.getByText('Loading steps...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockStepsData = null;
      mockStepsError = new Error('Network error');

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load steps content')).toBeTruthy();
      });
    });

    it('shows retry button when error occurs', async () => {
      mockStepsData = null;
      mockStepsError = new Error('Network error');

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty message when no steps available', async () => {
      mockStepsData = [];

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('No steps content available')).toBeTruthy();
      });
    });
  });

  describe('steps list', () => {
    it('renders header correctly', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('The 12 Steps')).toBeTruthy();
        expect(screen.getByText('Your path to recovery')).toBeTruthy();
      });
    });

    it('renders all steps when loaded', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
        expect(screen.getByText('Came to believe')).toBeTruthy();
        expect(screen.getByText('Made a decision')).toBeTruthy();
      });
    });

    it('renders step numbers', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.getByText('3')).toBeTruthy();
      });
    });

    it('renders step descriptions', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('The first step in recovery')).toBeTruthy();
        expect(screen.getByText('Finding a higher power')).toBeTruthy();
      });
    });
  });

  describe('step navigation', () => {
    it('navigates to detail screen when step is pressed', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('We admitted we were powerless'));

      expect(mockPush).toHaveBeenCalledWith('/steps/step-1');
    });

    it('navigates with correct id for different steps', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Came to believe')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Came to believe'));

      expect(mockPush).toHaveBeenCalledWith('/steps/step-2');
    });
  });

  describe('step completion badges', () => {
    it('shows completed badge for completed steps', async () => {
      // Mock progress for step 1
      mockProgressData = [
        { id: 'progress-1', step_number: 1, user_id: 'user-123', completed: true },
      ];

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeTruthy();
      });
    });

    it('shows multiple completed badges when multiple steps are completed', async () => {
      // Mock progress for steps 1 and 2
      mockProgressData = [
        { id: 'progress-1', step_number: 1, user_id: 'user-123', completed: true },
        { id: 'progress-2', step_number: 2, user_id: 'user-123', completed: true },
      ];

      render(<StepsScreen />);

      await waitFor(() => {
        // Should have two "Completed" badges
        const completedBadges = screen.getAllByText('Completed');
        expect(completedBadges).toHaveLength(2);
      });
    });

    it('does not show completed badge for incomplete steps', async () => {
      mockProgressData = [];

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      expect(screen.queryByText('Completed')).toBeNull();
    });
  });

  describe('display_name handling', () => {
    it('renders StepsScreen with profile containing display_name and verifies schema change', async () => {
      // Reset to default profile with display_name (new schema)
      mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'John D.',
        sobriety_date: '2024-01-01',
        notification_preferences: {
          tasks: true,
          messages: true,
          milestones: true,
          daily: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<StepsScreen />);

      // Verify component renders successfully with display_name in profile
      await waitFor(() => {
        expect(screen.getByText('The 12 Steps')).toBeTruthy();
      });

      // Verify component can access profile and use it (via profile.id in fetchProgress)
      // The component uses profile.id to fetch user step progress, which confirms
      // the profile structure is correct and the component can access profile properties
      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Verify component successfully uses profile.id by checking supabase query was called
      // This demonstrates the component behavior rather than testing mock state
      const { supabase } = jest.requireMock('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
    });

    it('handles missing display_name gracefully', async () => {
      // Set profile without display_name
      mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: null,
        sobriety_date: '2024-01-01',
        notification_preferences: {
          tasks: true,
          messages: true,
          milestones: true,
          daily: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<StepsScreen />);

      // Verify component still renders successfully
      await waitFor(() => {
        expect(screen.getByText('The 12 Steps')).toBeTruthy();
      });

      // Verify component can still fetch and display steps
      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Verify component successfully uses profile.id even when display_name is null
      // This demonstrates the component handles missing display_name gracefully
      const { supabase } = jest.requireMock('@/lib/supabase');
      expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
    });

    it('handles undefined display_name gracefully', async () => {
      // Set profile with undefined display_name (simulating old schema)
      mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: undefined,
        sobriety_date: '2024-01-01',
        notification_preferences: {
          tasks: true,
          messages: true,
          milestones: true,
          daily: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      render(<StepsScreen />);

      // Verify component still renders successfully
      await waitFor(() => {
        expect(screen.getByText('The 12 Steps')).toBeTruthy();
      });

      // Verify component can still fetch and display steps
      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Verify navigation still works when display_name is undefined
      fireEvent.press(screen.getByText('We admitted we were powerless'));
      expect(mockPush).toHaveBeenCalledWith('/steps/step-1');
    });
  });

  describe('error handling', () => {
    it('logs error when progress fetch fails', async () => {
      const { logger } = jest.requireMock('@/lib/logger');

      // Reset the mock to return an error for progress
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'steps_content') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockSteps, error: null }),
            }),
          };
        }
        if (table === 'user_step_progress') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest
                .fn()
                .mockResolvedValue({ data: null, error: new Error('Progress fetch failed') }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      });

      render(<StepsScreen />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Step progress fetch failed',
          expect.any(Error),
          expect.objectContaining({ category: 'database' })
        );
      });
    });

    it('handles exception in progress fetch', async () => {
      const { logger } = jest.requireMock('@/lib/logger');

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'steps_content') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockSteps, error: null }),
            }),
          };
        }
        if (table === 'user_step_progress') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockRejectedValue(new Error('Network error')),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      });

      render(<StepsScreen />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Step progress fetch exception',
          expect.any(Error),
          expect.objectContaining({ category: 'database' })
        );
      });
    });

    it('handles exception in steps fetch', async () => {
      const { logger } = jest.requireMock('@/lib/logger');

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'steps_content') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockRejectedValue(new Error('Steps fetch exception')),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
        expect(logger.error).toHaveBeenCalledWith(
          'Steps content fetch exception',
          expect.any(Error),
          expect.objectContaining({ category: 'database' })
        );
      });
    });
  });
});
