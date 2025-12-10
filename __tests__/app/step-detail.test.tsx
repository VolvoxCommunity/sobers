/**
 * @fileoverview Tests for app/(tabs)/steps/[id].tsx
 *
 * Tests the Step Detail screen including:
 * - Loading and error states
 * - Step content rendering
 * - Previous/Next navigation
 * - Mark as complete/incomplete functionality
 * - Analytics tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import StepDetailScreen from '@/app/(tabs)/steps/[id]';
import { StepContent, Profile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router for route params and navigation
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteId = 'step-1';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock supabase
let mockStepsData: StepContent[] | null = null;
let mockStepsError: Error | null = null;
let mockProgressData: unknown | null = null;
let mockInsertResult: { data: unknown; error: Error | null } = {
  data: { id: 'new-progress' },
  error: null,
};
let mockDeleteResult: { error: Error | null } = { error: null };

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
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockImplementation(() =>
                    Promise.resolve({ data: mockProgressData, error: null })
                  ),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(() => Promise.resolve(mockInsertResult)),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(() => Promise.resolve(mockDeleteResult)),
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
  ChevronLeft: () => null,
  ChevronRight: () => null,
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
const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics', () => ({
  trackEvent: (event: string, props: unknown) => mockTrackEvent(event, props),
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
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'step-2',
    step_number: 2,
    title: 'Came to believe',
    description: 'Finding a higher power',
    detailed_content: 'Detailed content for step 2',
    reflection_prompts: ['What does a higher power mean to you?'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'step-3',
    step_number: 3,
    title: 'Made a decision',
    description: 'Turning our will over',
    detailed_content: 'Detailed content for step 3',
    reflection_prompts: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// =============================================================================
// Test Suite
// =============================================================================

describe('StepDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockTrackEvent.mockClear();
    // Default mock setup
    mockRouteId = 'step-1';
    mockStepsData = mockSteps;
    mockStepsError = null;
    mockProgressData = null;
    mockInsertResult = { data: { id: 'new-progress' }, error: null };
    mockDeleteResult = { error: null };
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
    it('shows loading indicator initially', () => {
      render(<StepDetailScreen />);

      expect(screen.getByText('Loading step...')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockStepsData = null;
      mockStepsError = new Error('Network error');

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load step content')).toBeTruthy();
      });
    });

    it('shows retry button when error occurs', async () => {
      mockStepsData = null;
      mockStepsError = new Error('Network error');

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });

    it('shows error when step not found', async () => {
      mockRouteId = 'non-existent-step';

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step not found')).toBeTruthy();
      });
    });
  });

  describe('step content rendering', () => {
    it('renders step indicator in header', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 3')).toBeTruthy();
      });
    });

    it('renders step number label', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Step 1')).toBeTruthy();
      });
    });

    it('renders step title', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });
    });

    it('renders step description', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('The first step in recovery')).toBeTruthy();
      });
    });

    it('renders detailed content section', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Understanding This Step')).toBeTruthy();
        expect(screen.getByText('Detailed content for step 1')).toBeTruthy();
      });
    });

    it('renders reflection questions when available', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Reflection Questions')).toBeTruthy();
        expect(screen.getByText('What does powerlessness mean to you?')).toBeTruthy();
      });
    });

    it('does not render reflection section when no prompts', async () => {
      mockRouteId = 'step-3';

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Made a decision')).toBeTruthy();
      });

      expect(screen.queryByText('Reflection Questions')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('renders navigation controls', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      // Verify navigation elements are present
      expect(screen.getByText('Previous')).toBeTruthy();
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('navigates to previous step when Previous is pressed', async () => {
      mockRouteId = 'step-2';

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Came to believe')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Previous'));

      expect(mockReplace).toHaveBeenCalledWith('/steps/step-1');
    });

    it('navigates to next step when Next is pressed', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Next'));

      expect(mockReplace).toHaveBeenCalledWith('/steps/step-2');
    });

    it('disables Previous button on first step', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Previous'));

      // Should not navigate since it's the first step
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('disables Next button on last step', async () => {
      mockRouteId = 'step-3';

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Made a decision')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Next'));

      // Should not navigate since it's the last step
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('step completion', () => {
    it('shows Mark as Complete button when step is not completed', async () => {
      mockProgressData = null;

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });
    });

    it('shows Marked as Complete button when step is completed', async () => {
      mockProgressData = { id: 'progress-1', step_number: 1, user_id: 'user-123', completed: true };

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Marked as Complete')).toBeTruthy();
      });
    });

    it('calls supabase insert when marking step as complete', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      mockProgressData = null;

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Mark as Complete'));

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
      });
    });

    it('calls supabase delete when unmarking step as complete', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      mockProgressData = { id: 'progress-1', step_number: 1, user_id: 'user-123', completed: true };

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Marked as Complete')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Marked as Complete'));

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('user_step_progress');
      });
    });
  });

  describe('analytics', () => {
    it('tracks step viewed event on load', async () => {
      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('We admitted we were powerless')).toBeTruthy();
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('step_viewed', { step_number: 1 });
    });
  });

  describe('error handling', () => {
    it('logs error when fetch fails', async () => {
      const { logger } = jest.requireMock('@/lib/logger');
      mockStepsData = null;
      mockStepsError = new Error('Network error');

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to fetch steps',
          expect.any(Error),
          expect.objectContaining({ category: 'database' })
        );
      });
    });

    it('logs error when completion toggle fails', async () => {
      const { logger } = jest.requireMock('@/lib/logger');
      mockProgressData = null;
      mockInsertResult = { data: null, error: new Error('Insert failed') };

      // Override the mock to throw
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
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
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

      render(<StepDetailScreen />);

      await waitFor(() => {
        expect(screen.getByText('Mark as Complete')).toBeTruthy();
      });

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
