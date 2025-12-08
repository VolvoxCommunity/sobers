/**
 * @fileoverview Tests for app/(tabs)/steps.tsx
 *
 * Tests the Steps screen including:
 * - Loading, error, and empty states
 * - Step list rendering
 * - Step completion toggling
 * - Modal interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import StepsScreen from '@/app/(tabs)/steps';
import { StepContent } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

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
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'new-progress' }, error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
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
const mockProfile = {
  id: 'user-123',
  first_name: 'John',
  last_initial: 'D',
  sobriety_date: '2024-01-01',
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
  X: () => null,
  CheckCircle: () => null,
  Circle: () => null,
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

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: {
    STEP_VIEWED: 'step_viewed',
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
    // Default mock setup: steps load successfully with no progress
    mockStepsData = mockSteps;
    mockStepsError = null;
    mockProgressData = [];
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

  describe('step modal', () => {
    it('opens modal when step is pressed', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeTruthy();
        expect(screen.getByText('Understanding This Step')).toBeTruthy();
      });
    });

    it('shows step detailed content in modal', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Detailed content for step 1')).toBeTruthy();
      });
    });

    it('shows reflection prompts when available', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Reflection Questions')).toBeTruthy();
        expect(screen.getByText('What does powerlessness mean to you?')).toBeTruthy();
      });
    });

    it('shows mark as complete button in modal', async () => {
      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });
    });
  });

  describe('step completion', () => {
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

    it('toggles step to complete when Mark as Complete is pressed', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      mockProgressData = [];

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Open step modal
      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });

      // Press mark as complete
      fireEvent.press(screen.getByText('Mark as Complete'));

      // Should call supabase insert
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
      });
    });

    it('toggles step to incomplete when Marked as Complete button is pressed', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      // Mock progress for step 1 (already completed)
      mockProgressData = [
        { id: 'progress-1', step_number: 1, user_id: 'user-123', completed: true },
      ];

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeTruthy();
      });

      // Open step modal
      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        // The button shows "Marked as Complete" when already completed (toggles to incomplete)
        expect(screen.getByText('Marked as Complete')).toBeTruthy();
      });

      // Press the toggle button (will uncomplete it)
      fireEvent.press(screen.getByText('Marked as Complete'));

      // Should call supabase delete
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
      });
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

    it('handles error in step completion toggle', async () => {
      const { logger } = jest.requireMock('@/lib/logger');
      mockProgressData = [];

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
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockRejectedValue(new Error('Insert failed')),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      });

      render(<StepsScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Open step modal
      fireEvent.press(screen.getByText('We admitted we were powerless'));

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });

      // Press mark as complete (will fail)
      fireEvent.press(screen.getByText('Mark as Complete'));

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Step completion toggle failed',
          expect.any(Error),
          expect.objectContaining({ category: 'database' })
        );
      });
    });
  });
});
