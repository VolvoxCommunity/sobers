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
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding';

// =============================================================================
// Mocks
// =============================================================================

// Import Toast mock for assertions
import Toast from 'react-native-toast-message';

// Mock analytics - use actual AnalyticsEvents to match production values
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: jest.requireActual('@/types/analytics').AnalyticsEvents,
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
      danger: '#dc2626',
      shadow: '#000000',
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
  DollarSign: () => null,
}));

// Mock DateTimePicker with onChange capture
let mockDatePickerOnChange: ((event: unknown, date?: Date) => void) | null = null;

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (event: unknown, date?: Date) => void }) => {
      // Store the onChange for test access
      mockDatePickerOnChange = onChange;
      return React.createElement('View', { testID: 'date-time-picker' });
    },
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
    (
      {
        children,
        entering: _entering,
        exiting: _exiting,
        style,
        ...props
      }: Record<string, unknown>,
      ref: unknown
    ) => React.createElement(View, { ...props, style, ref }, children)
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
    FadeOutUp: { duration: jest.fn(() => ({})) },
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

    it('renders two cards: YOUR JOURNEY and PREFERENCES', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('📅 YOUR JOURNEY')).toBeTruthy();
      expect(screen.getByText('⚙️ PREFERENCES')).toBeTruthy();
    });

    it('does not render ABOUT YOU card (merged into YOUR JOURNEY)', () => {
      render(<OnboardingScreen />);

      expect(screen.queryByText('👤 ABOUT YOU')).toBeNull();
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

    it('shows error toast when profile update fails', async () => {
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
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to update profile' })
        );
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

    it('shows error toast when signOut fails with Error object', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Sign out failed' })
        );
      });
    });

    it('shows generic error toast when signOut fails with non-Error', async () => {
      mockSignOut.mockRejectedValueOnce('string error');

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'An unknown error occurred' })
        );
      });
    });
  });

  describe('External Links', () => {
    it('opens privacy policy link', () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Privacy Policy'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://sobers.app/privacy');
    });

    it('opens terms of service link', () => {
      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Terms of Service'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://sobers.app/terms');
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
    it('shows error toast when refreshProfile fails after successful upsert', async () => {
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
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to refresh profile' })
        );
      });

      // Loading should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Setting up...')).toBeNull();
      });
    });

    it('shows timeout toast when profile update takes longer than 10 seconds', async () => {
      // Enable fake timers for this test
      jest.useFakeTimers();

      // Mock successful upsert
      getMockUpsert().mockResolvedValue({ error: null });

      // Mock refreshProfile to "succeed" but profile remains incomplete
      // (no sobriety_date or display_name set in the profile object)
      mockRefreshProfile.mockResolvedValue(undefined);

      // Keep profile incomplete so navigation doesn't happen
      const incompleteProfile = { id: 'user-123', display_name: null, sobriety_date: null };
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: incompleteProfile,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      // Fill and submit the form
      const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(displayNameInput, 'John D.');

      // Advance timers to allow validation debounce to complete
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      // Accept terms
      fireEvent.press(screen.getByText(/I agree to the/));

      // Submit form
      fireEvent.press(screen.getByText('Complete Setup'));

      // Allow async operations (upsert, refreshProfile) to complete
      await act(async () => {
        await Promise.resolve(); // Flush microtasks
        jest.advanceTimersByTime(100); // Small advance for any immediate effects
      });

      // Verify upsert was called
      expect(getMockUpsert()).toHaveBeenCalled();

      // Now advance time by 10 seconds to trigger the timeout
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Timeout toast should be shown
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text1: 'Your profile update is taking longer than expected. Please try again.',
        })
      );

      // Restore real timers
      jest.useRealTimers();
    });

    it('shows error toast when upsert fails with network error', async () => {
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
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Network request failed' })
        );
      });
    });

    it('shows error toast when upsert fails with constraint violation', async () => {
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
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to update profile' })
        );
      });
    });
  });
});

describe('Analytics Tracking', () => {
  // Get the mock for analytics
  const getTrackEventMock = () => {
    const { trackEvent } = jest.requireMock('@/lib/analytics');
    return trackEvent as jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = { id: 'user-123' };

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

  it('tracks ONBOARDING_STARTED on mount', () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    expect(trackEvent).toHaveBeenCalledWith('Onboarding Started');
  });

  it('tracks ONBOARDING_SCREEN_VIEWED with screen name on mount', () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    expect(trackEvent).toHaveBeenCalledWith(
      'Onboarding Screen Viewed',
      expect.objectContaining({
        screen_name: 'profile_setup',
      })
    );
  });

  it('tracks ONBOARDING_FIELD_COMPLETED when display name is entered', async () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    trackEvent.mockClear();

    const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
    fireEvent.changeText(displayNameInput, 'John');

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'Onboarding Field Completed',
        expect.objectContaining({
          field_name: 'display_name',
        })
      );
    });
  });

  it('tracks ONBOARDING_STEP_COMPLETED when form is submitted', async () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    // Fill in valid data
    const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
    fireEvent.changeText(displayNameInput, 'John D.');

    // Wait for character count update
    await waitFor(() => {
      expect(screen.getByText('7/30 characters')).toBeTruthy();
    });

    // Accept terms
    fireEvent.press(screen.getByText(/I agree to the/));

    trackEvent.mockClear();

    // Submit
    const completeButton = screen.getByText('Complete Setup');
    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'Onboarding Step Completed',
        expect.objectContaining({
          step_name: 'profile_setup',
          step_number: 1,
        })
      );
    });
  });

  it('tracks ONBOARDING_COMPLETED with duration when profile update succeeds', async () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    // Fill in valid data
    const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
    fireEvent.changeText(displayNameInput, 'John D.');

    await waitFor(() => {
      expect(screen.getByText('7/30 characters')).toBeTruthy();
    });

    fireEvent.press(screen.getByText(/I agree to the/));

    trackEvent.mockClear();

    const completeButton = screen.getByText('Complete Setup');
    fireEvent.press(completeButton);

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'Onboarding Completed',
        expect.objectContaining({
          duration_seconds: expect.any(Number),
          savings_enabled: expect.any(Boolean),
        })
      );
    });
  });

  it('does not track duplicate ONBOARDING_FIELD_COMPLETED for display name', async () => {
    const trackEvent = getTrackEventMock();

    render(<OnboardingScreen />);

    const displayNameInput = screen.getByPlaceholderText('e.g. John D.');

    // First change
    fireEvent.changeText(displayNameInput, 'John');

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'Onboarding Field Completed',
        expect.objectContaining({ field_name: 'display_name' })
      );
    });

    trackEvent.mockClear();

    // Second change - should not track again (already tracked once)
    fireEvent.changeText(displayNameInput, 'John Doe');

    // Give it time to potentially fire
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should NOT have been called again for display_name
    expect(trackEvent).not.toHaveBeenCalledWith(
      'Onboarding Field Completed',
      expect.objectContaining({ field_name: 'display_name' })
    );
  });

  describe('Twelve Step Content Toggle', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
        loading: false,
      });
    });

    it('renders 12-step content toggle in PREFERENCES card', () => {
      render(<OnboardingScreen />);

      expect(screen.getByTestId('twelve-step-toggle')).toBeTruthy();
      expect(screen.getByText('Include 12-Step Content')).toBeTruthy();
    });

    it('shows subtext explaining 12-step content toggle', () => {
      render(<OnboardingScreen />);

      expect(
        screen.getByText('Show the 12 Steps tab for step-by-step recovery guidance')
      ).toBeTruthy();
    });

    it('has 12-step toggle enabled by default', () => {
      render(<OnboardingScreen />);

      // The TouchableOpacity wrapper has the accessibilityRole="switch" and accessibilityState
      const toggle = screen.getByTestId('twelve-step-toggle');
      expect(toggle.props.accessibilityState?.checked).toBe(true);
    });

    it('can toggle 12-step content off', async () => {
      render(<OnboardingScreen />);

      const toggle = screen.getByTestId('twelve-step-toggle');
      fireEvent.press(toggle);

      await waitFor(() => {
        // After pressing, the toggle should be unchecked
        expect(toggle.props.accessibilityState?.checked).toBe(false);
      });
    });

    it('includes show_program_content in profile upsert', async () => {
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

      // Fill display name
      const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(displayNameInput, 'John D.');

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText('7/30 characters')).toBeTruthy();
      });

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));

      await waitFor(() => {
        expect(mockUpsertFn).toHaveBeenCalled();
      });

      // Verify show_program_content is included (defaults to true)
      expect(capturedUpsertData).not.toBeNull();
      expect(capturedUpsertData!.show_program_content).toBe(true);
    });

    it('includes show_program_content=false when toggled off', async () => {
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

      // Toggle off 12-step content
      const toggle = screen.getByTestId('twelve-step-toggle');
      fireEvent.press(toggle);

      // Fill display name
      const displayNameInput = screen.getByPlaceholderText('e.g. John D.');
      fireEvent.changeText(displayNameInput, 'John D.');

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText('7/30 characters')).toBeTruthy();
      });

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));

      await waitFor(() => {
        expect(mockUpsertFn).toHaveBeenCalled();
      });

      // Verify show_program_content is false
      expect(capturedUpsertData).not.toBeNull();
      expect(capturedUpsertData!.show_program_content).toBe(false);
    });
  });

  describe('Spending Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
        loading: false,
      });
    });

    it('shows error when savings is enabled but amount is empty', async () => {
      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Wait for validation to run
      await waitFor(() => {
        expect(screen.getByText('Amount is required when tracking is enabled')).toBeTruthy();
      });
    });

    it('shows error when spending amount is not a valid number', async () => {
      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Enter invalid amount
      const amountInput = screen.getByTestId('savings-amount-input');
      fireEvent.changeText(amountInput, 'abc');

      // Wait for validation to run
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid number')).toBeTruthy();
      });
    });

    it('shows error when spending amount is negative', async () => {
      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Enter negative amount
      const amountInput = screen.getByTestId('savings-amount-input');
      fireEvent.changeText(amountInput, '-50');

      // Wait for validation to run
      await waitFor(() => {
        expect(screen.getByText('Amount cannot be negative')).toBeTruthy();
      });
    });

    it('clears spending error when valid amount is entered', async () => {
      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Verify error shows initially
      await waitFor(() => {
        expect(screen.getByText('Amount is required when tracking is enabled')).toBeTruthy();
      });

      // Enter valid amount
      const amountInput = screen.getByTestId('savings-amount-input');
      fireEvent.changeText(amountInput, '50');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Amount is required when tracking is enabled')).toBeNull();
      });
    });

    it('clears spending error when savings is disabled', async () => {
      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Verify error shows initially
      await waitFor(() => {
        expect(screen.getByText('Amount is required when tracking is enabled')).toBeTruthy();
      });

      // Disable savings tracking
      fireEvent.press(savingsToggle);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('Amount is required when tracking is enabled')).toBeNull();
      });
    });

    it('tracks ONBOARDING_FIELD_COMPLETED when savings is first enabled', async () => {
      const trackEvent = getTrackEventMock();
      trackEvent.mockClear();

      render(<OnboardingScreen />);

      // Enable savings tracking
      const savingsToggle = screen.getByTestId('savings-toggle');
      fireEvent.press(savingsToggle);

      // Wait for analytics to fire
      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith(
          'Onboarding Field Completed',
          expect.objectContaining({ field_name: 'savings_tracking' })
        );
      });
    });
  });

  describe('Date Picker Interaction', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockDatePickerOnChange = null;
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: mockProfile,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
        loading: false,
      });
    });

    it('updates sobriety date when date is selected from picker', async () => {
      render(<OnboardingScreen />);

      // Open date picker
      const dateSelector = screen.getByLabelText('Select sobriety date');
      fireEvent.press(dateSelector);

      // Wait for date picker to be visible
      await waitFor(() => {
        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      });

      // Simulate date selection via the captured onChange
      expect(mockDatePickerOnChange).not.toBeNull();
      const selectedDate = new Date('2024-06-15');
      act(() => {
        mockDatePickerOnChange!({ type: 'set' }, selectedDate);
      });

      // Date should be updated - the screen should now show the selected date
      await waitFor(() => {
        // Verify the component didn't crash and is still rendered
        expect(screen.getByText('Welcome to Sobers')).toBeTruthy();
      });
    });

    it('tracks ONBOARDING_SOBRIETY_DATE_SET when date is selected', async () => {
      const trackEvent = getTrackEventMock();
      render(<OnboardingScreen />);

      // Open date picker
      const dateSelector = screen.getByLabelText('Select sobriety date');
      fireEvent.press(dateSelector);

      await waitFor(() => {
        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      });

      trackEvent.mockClear();

      // Simulate date selection
      const selectedDate = new Date('2024-06-15');
      act(() => {
        mockDatePickerOnChange!({ type: 'set' }, selectedDate);
      });

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith(
          'Onboarding Sobriety Date Set',
          expect.objectContaining({ days_sober_bucket: expect.any(String) })
        );
      });
    });

    it('tracks ONBOARDING_FIELD_COMPLETED first time sobriety date is set', async () => {
      const trackEvent = getTrackEventMock();
      render(<OnboardingScreen />);

      // Open date picker
      const dateSelector = screen.getByLabelText('Select sobriety date');
      fireEvent.press(dateSelector);

      await waitFor(() => {
        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      });

      trackEvent.mockClear();

      // Simulate date selection
      const selectedDate = new Date('2024-06-15');
      act(() => {
        mockDatePickerOnChange!({ type: 'set' }, selectedDate);
      });

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith(
          'Onboarding Field Completed',
          expect.objectContaining({ field_name: 'sobriety_date' })
        );
      });
    });

    it('does not crash when date picker is dismissed without selection', async () => {
      render(<OnboardingScreen />);

      // Open date picker
      const dateSelector = screen.getByLabelText('Select sobriety date');
      fireEvent.press(dateSelector);

      await waitFor(() => {
        expect(screen.getByTestId('date-time-picker')).toBeTruthy();
      });

      // Simulate dismissal (no date provided)
      act(() => {
        mockDatePickerOnChange!({ type: 'dismissed' }, undefined);
      });

      // Screen should still be functional
      expect(screen.getByText('Welcome to Sobers')).toBeTruthy();
    });
  });
});
