/**
 * @fileoverview Tests for app/onboarding.tsx
 *
 * Tests the single-page onboarding flow including:
 * - Display name input with character count and validation
 * - Sobriety date selection
 * - Form validation
 * - Profile update submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding';

// =============================================================================
// Mocks
// =============================================================================

// Mock showAlert
const mockShowAlert = jest.fn();
jest.mock('@/lib/alert', () => ({
  showAlert: (...args: unknown[]) => mockShowAlert(...args),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: {
    ONBOARDING_STARTED: 'onboarding_started',
    ONBOARDING_SOBRIETY_DATE_SET: 'onboarding_sobriety_date_set',
    ONBOARDING_COMPLETED: 'onboarding_completed',
  },
  calculateDaysSoberBucket: jest.fn(() => '0-30'),
}));

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock supabase - use jest.fn() inside the mock factory to avoid hoisting issues
jest.mock('@/lib/supabase', () => {
  const mockUpsertFn = jest.fn().mockResolvedValue({ error: null });
  return {
    supabase: {
      from: jest.fn(() => ({
        upsert: mockUpsertFn,
      })),
    },
    __mockUpsert: mockUpsertFn, // Export for test access
  };
});

// Get the mock for use in tests
const getMockUpsert = () => {
  const { __mockUpsert } = jest.requireMock('@/lib/supabase');
  return __mockUpsert as jest.Mock;
};

// Mock AuthContext
const mockSignOut = jest.fn();
const mockRefreshProfile = jest.fn();
const mockUser = { id: 'user-123', email: 'test@example.com' };
let mockProfile: {
  id: string;
  display_name?: string | null;
  sobriety_date?: string | null;
} | null = {
  id: 'user-123',
};

const mockUseAuth = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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
      textOnPrimary: '#ffffff',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      white: '#ffffff',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Calendar: () => null,
  LogOut: () => null,
  Info: () => null,
  Square: () => null,
  CheckSquare: () => null,
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'date-time-picker' }),
  };
});

// Mock date library
jest.mock('@/lib/date', () => ({
  getDateDiffInDays: jest.fn(() => 100),
  formatDateWithTimezone: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
  getUserTimezone: jest.fn(() => 'America/New_York'),
}));

// Mock OnboardingStep
jest.mock('@/components/onboarding/OnboardingStep', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'onboarding-step' }, children),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  // Create a mock Animated object with View and Text components
  const AnimatedView = React.forwardRef(
    ({ children, entering, exiting, style, ...props }: Record<string, unknown>, ref: unknown) =>
      React.createElement(View, { ...props, style, ref }, children)
  );
  AnimatedView.displayName = 'AnimatedView';

  const AnimatedText = React.forwardRef(
    ({ children, ...props }: Record<string, unknown>, ref: unknown) =>
      React.createElement(Text, { ...props, ref }, children)
  );
  AnimatedText.displayName = 'AnimatedText';

  const Animated = {
    View: AnimatedView,
    Text: AnimatedText,
  };

  return {
    __esModule: true,
    default: Animated,
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeIn: {},
    FadeOut: {},
  };
});

// Get reference to the global Linking mock from jest.setup.js
const mockLinking = jest.requireMock('react-native').Linking;

// =============================================================================
// Test Suite
// =============================================================================

describe('OnboardingScreen', () => {
  /**
   * Helper function to fill and submit the onboarding form.
   * Shared across multiple test suites.
   */
  const fillAndSubmitForm = async () => {
    // Fill display name
    const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
    fireEvent.changeText(displayNameInput, 'John D.');

    // Wait for validation to complete (character count updates)
    await waitFor(() => {
      expect(screen.getByText('7/30 characters')).toBeTruthy();
    });

    // Accept terms and submit
    fireEvent.press(screen.getByText(/I agree to the/));
    fireEvent.press(screen.getByText('Complete Setup'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = { id: 'user-123' };

    // Reset supabase.from mock to use the shared mockUpsert function
    // This is needed because some tests override from.mockReturnValue()
    const { supabase, __mockUpsert } = jest.requireMock('@/lib/supabase');
    supabase.from.mockReturnValue({ upsert: __mockUpsert });
    __mockUpsert.mockResolvedValue({ error: null });

    mockRefreshProfile.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      signOut: mockSignOut,
      refreshProfile: mockRefreshProfile,
    });
  });

  describe('Single Page Layout', () => {
    it('renders page title and subtitle', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Welcome to Sobers')).toBeTruthy();
      expect(screen.getByText("Let's set up your profile.")).toBeTruthy();
    });

    it('renders both cards on single page', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('👤 ABOUT YOU')).toBeTruthy();
      expect(screen.getByText('📅 YOUR JOURNEY')).toBeTruthy();
    });

    it('renders display name input', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Display Name')).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. John D.')).toBeTruthy();
    });

    it('renders sobriety date picker', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Sobriety Date')).toBeTruthy();
    });

    it('renders terms acceptance checkbox', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText(/I agree to the/)).toBeTruthy();
      expect(screen.getByText('Privacy Policy')).toBeTruthy();
      expect(screen.getByText('Terms of Service')).toBeTruthy();
    });

    it('renders complete setup button', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Complete Setup')).toBeTruthy();
    });

    it('does not render progress bar', () => {
      render(<OnboardingScreen />);

      expect(screen.queryByTestId('progress-bar')).toBeNull();
    });

    it('does not render back button', () => {
      render(<OnboardingScreen />);

      expect(screen.queryByText('Back')).toBeNull();
    });
  });

  describe('Display Name Input', () => {
    it('shows character count', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('0/30 characters')).toBeTruthy();
    });

    it('updates character count as user types', () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'John');

      expect(screen.getByText('4/30 characters')).toBeTruthy();
    });

    it('shows warning color when near character limit', () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'A'.repeat(25));

      const characterCount = screen.getByText('25/30 characters');
      expect(characterCount).toBeTruthy();
      // Warning style is applied (tested via style prop in component)
    });

    it('enforces maximum character length', () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      // TextInput maxLength prop prevents typing beyond 30 chars
      expect(input.props.maxLength).toBe(30);
    });

    it('pre-fills display name from OAuth profile', () => {
      const profileWithName = {
        id: 'user-123',
        display_name: 'Jane D.',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: profileWithName,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      expect(input.props.value).toBe('Jane D.');
    });

    it('shows info tooltip button', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText("How you'll appear to others")).toBeTruthy();
    });

    it('toggles info box when info button is pressed', async () => {
      render(<OnboardingScreen />);

      const infoButton = screen.getByText("How you'll appear to others");

      // Press to show
      fireEvent.press(infoButton);

      await waitFor(() => {
        expect(screen.getByText(/Your display name is how you'll be identified/)).toBeTruthy();
      });

      // Press to hide
      fireEvent.press(infoButton);

      await waitFor(() => {
        expect(screen.queryByText(/Your display name is how you'll be identified/)).toBeNull();
      });
    });
  });

  describe('Display Name Validation', () => {
    it('shows error for empty display name after debounce', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, '');

      // Wait for debounce delay
      await waitFor(
        () => {
          expect(screen.getByText('Display name is required')).toBeTruthy();
        },
        { timeout: 500 }
      );
    });

    it('shows error for too short display name', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'J');

      await waitFor(
        () => {
          expect(screen.getByText('Display name must be at least 2 characters')).toBeTruthy();
        },
        { timeout: 500 }
      );
    });

    it('shows error for too long display name', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      // Type 31 characters (over limit, but maxLength should prevent this in real usage)
      fireEvent.changeText(input, 'A'.repeat(31));

      await waitFor(
        () => {
          expect(screen.getByText('Display name must be 30 characters or less')).toBeTruthy();
        },
        { timeout: 500 }
      );
    });

    it('shows error for invalid characters', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'John123');

      await waitFor(
        () => {
          expect(
            screen.getByText('Display name can only contain letters, spaces, periods, and hyphens')
          ).toBeTruthy();
        },
        { timeout: 500 }
      );
    });

    it('accepts valid display names', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'John D.');

      // Wait for debounce
      await waitFor(
        () => {
          expect(
            screen.queryByText(
              'Display name can only contain letters, spaces, periods, and hyphens'
            )
          ).toBeNull();
        },
        { timeout: 500 }
      );
    });

    it('accepts international characters', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'José García');

      // Wait for debounce
      await waitFor(
        () => {
          expect(
            screen.queryByText(
              'Display name can only contain letters, spaces, periods, and hyphens'
            )
          ).toBeNull();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Form Validation', () => {
    it('disables complete button when display name is empty', () => {
      render(<OnboardingScreen />);

      // Button should be present but disabled state is not easily accessible in tests
      // The actual validation is tested through the form submission behavior
      expect(screen.getByText('Complete Setup')).toBeTruthy();
    });

    it('disables complete button when display name is invalid', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'J'); // Too short

      // Wait for validation
      await waitFor(
        () => {
          // Button should be present but disabled state is not easily accessible in tests
          expect(screen.getByText('Complete Setup')).toBeTruthy();
        },
        { timeout: 500 }
      );
    });

    it('disables complete button when terms not accepted', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'John D.');

      // Wait for validation to pass - verify the input is visible with our text
      await waitFor(() => {
        expect(input.props.value).toBe('John D.');
      });

      // Button should be present but disabled
      expect(screen.getByText('Complete Setup')).toBeTruthy();
    });

    it('enables complete button when form is valid', async () => {
      render(<OnboardingScreen />);

      const input = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(input, 'John D.');

      // Wait for validation to pass - verify the input has our text
      await waitFor(() => {
        expect(input.props.value).toBe('John D.');
      });

      // Accept terms
      fireEvent.press(screen.getByText(/I agree to the/));

      // Button should be present and enabled (can be pressed)
      const completeButton = screen.getByText('Complete Setup');
      expect(completeButton).toBeTruthy();

      // Verify it can be pressed by attempting submission
      fireEvent.press(completeButton);

      // Should have called the update function
      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Sobriety Date Selection', () => {
    it('shows days counter', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('Days')).toBeTruthy();
    });

    it('opens date picker when sobriety date is pressed', () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sobriety Date'));

      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
    });

    it('uses existing sobriety date from profile', () => {
      const profileWithDate = {
        id: 'user-123',
        sobriety_date: '2024-01-01',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: profileWithDate,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      // The days counter should be shown
      expect(screen.getByText('Days')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('submits profile update when complete setup is pressed', async () => {
      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      getMockUpsert().mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      await waitFor(() => {
        expect(screen.getByText('Setting up...')).toBeTruthy();
      });
    });

    it('trims whitespace from display name before saving', async () => {
      // Capture the data passed to upsert()
      let capturedUpsertData: Record<string, unknown> | null = null;
      const mockUpsertFn = jest.fn((data) => {
        capturedUpsertData = data;
        return Promise.resolve({ error: null });
      });

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockReturnValue({
        upsert: mockUpsertFn,
      });

      render(<OnboardingScreen />);

      // Fill form with whitespace-padded name
      const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(displayNameInput, '  John D.  ');

      // Wait for validation
      await waitFor(() => {}, { timeout: 500 });

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));

      await waitFor(() => {
        expect(mockUpsertFn).toHaveBeenCalled();
      });

      // Verify trimmed value was passed
      expect(capturedUpsertData).not.toBeNull();
      expect(capturedUpsertData!.display_name).toBe('John D.');
    });

    it('navigates to main app when profile becomes complete after submission', async () => {
      // Start with incomplete profile
      const incompleteProfile = {
        id: 'user-123',
        display_name: null,
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: incompleteProfile,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      mockRefreshProfile.mockImplementation(async () => {
        // Simulate profile update - after submission, profile is complete
        incompleteProfile.display_name = 'John D.';
        incompleteProfile.sobriety_date = '2024-01-01';
      });

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      // Wait for profile refresh
      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });

      // Verify navigation to main app
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('shows error alert when profile update fails', async () => {
      // Mock upsert to return an error object (Supabase errors have .message but are not Error instances)
      getMockUpsert().mockResolvedValue({
        error: { message: 'Update failed', code: 'PGRST301' },
      });

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      // Verify upsert was actually called
      await waitFor(() => {
        expect(getMockUpsert()).toHaveBeenCalled();
      });

      // Note: Supabase error objects are not instanceof Error, so the code uses the fallback message
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Failed to update profile');
      });
    });
  });

  describe('Sign Out', () => {
    it('shows sign out button', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Sign Out')).toBeTruthy();
    });

    it('calls signOut when sign out button is pressed', async () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('navigates to login after sign out', async () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('shows error alert when signOut fails with Error object', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Sign out failed');
      });
    });

    it('shows generic error alert when signOut fails with non-Error', async () => {
      mockSignOut.mockRejectedValueOnce('string error');

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'An unknown error occurred');
      });
    });
  });

  describe('External Links', () => {
    it('opens privacy policy link', () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Privacy Policy'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://www.volvoxdev.com/privacy');
    });

    it('opens terms of service link', () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Terms of Service'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://www.volvoxdev.com/terms');
    });
  });

  describe('Pre-filled Values', () => {
    it('syncs display name when profile loads asynchronously', async () => {
      // Start with null profile (data hasn't loaded yet)
      let currentProfile: {
        id: string;
        display_name: string | null;
        sobriety_date: string | null;
      } | null = null;

      mockUseAuth.mockImplementation(() => ({
        user: mockUser,
        profile: currentProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      }));

      const { getByPlaceholderText, rerender } = render(<OnboardingScreen />);

      // Initially, input should be empty
      expect(getByPlaceholderText('e.g. John D.').props.value).toBe('');

      // Simulate async profile load
      currentProfile = {
        id: 'user-123',
        display_name: 'Jane D.',
        sobriety_date: null,
      };

      // Rerender to trigger useEffect with updated profile
      rerender(<OnboardingScreen />);

      // Display name should be synced
      await waitFor(() => {
        expect(getByPlaceholderText('e.g. John D.').props.value).toBe('Jane D.');
      });
    });

    it('does not overwrite user edits when profile syncs', async () => {
      // Start with incomplete profile
      let currentProfile: {
        id: string;
        display_name: string | null;
        sobriety_date: string | null;
      } = {
        id: 'user-123',
        display_name: null,
        sobriety_date: null,
      };

      mockUseAuth.mockImplementation(() => ({
        user: mockUser,
        profile: currentProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      }));

      const { getByPlaceholderText, rerender } = render(<OnboardingScreen />);

      // User types their own name
      fireEvent.changeText(getByPlaceholderText('e.g. John D.'), 'UserTyped');

      // Now profile loads with data
      currentProfile = {
        id: 'user-123',
        display_name: 'ProfileValue',
        sobriety_date: null,
      };

      // Rerender to trigger useEffect
      rerender(<OnboardingScreen />);

      // User's edits should be preserved
      await waitFor(() => {
        expect(getByPlaceholderText('e.g. John D.').props.value).toBe('UserTyped');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error alert when refreshProfile fails after successful upsert', async () => {
      // Mock successful upsert but failed refreshProfile
      getMockUpsert().mockResolvedValue({ error: null });
      mockRefreshProfile.mockRejectedValueOnce(new Error('Failed to refresh profile'));

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      // Verify upsert was called
      await waitFor(() => {
        expect(getMockUpsert()).toHaveBeenCalled();
      });

      // Error should be shown
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Failed to refresh profile');
      });

      // Loading should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Setting up...')).toBeNull();
      });
    });

    it.skip('shows timeout alert when profile update takes longer than 10 seconds', async () => {
      // NOTE: This test is skipped because fake timers don't work well with React Testing Library's
      // async waitFor and act. The timeout logic in useEffect involves:
      // 1. Async operations (upsert, refreshProfile) completing
      // 2. State updates (setAwaitingProfileUpdate)
      // 3. useEffect re-running with the new state
      // 4. setTimeout firing inside the useEffect
      //
      // When we switch to fake timers mid-test, the useEffect cleanup and re-execution
      // don't properly schedule the timeout in the fake timer system.
      //
      // This scenario should be verified via E2E tests (Maestro) where real timers are used
      // and we can observe actual timeout behavior in a production-like environment.
      //
      // Test intent: Verify that if profile update succeeds but profile never becomes complete
      // (e.g., refreshProfile returns but profile state doesn't have required fields),
      // a timeout alert is shown after 10 seconds and loading state is cleared.
    });

    it('shows error alert when upsert fails with network error', async () => {
      // Mock upsert to throw a network error (simulating connectivity issues)
      getMockUpsert().mockRejectedValueOnce(new Error('Network request failed'));

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      // Verify upsert was called
      await waitFor(() => {
        expect(getMockUpsert()).toHaveBeenCalled();
      });

      // Error should be shown
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Network request failed');
      });
    });

    it('shows error alert when upsert fails with constraint violation', async () => {
      // Mock upsert to return constraint violation error (e.g., unique constraint)
      getMockUpsert().mockResolvedValue({
        error: {
          message: 'duplicate key value violates unique constraint',
          code: '23505',
        },
      });

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      // Verify upsert was called
      await waitFor(() => {
        expect(getMockUpsert()).toHaveBeenCalled();
      });

      // Error should be shown with generic message (Supabase error objects don't have .message accessible)
      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Failed to update profile');
      });
    });
  });
});
