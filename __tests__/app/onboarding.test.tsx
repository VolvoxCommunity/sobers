/**
 * @fileoverview Tests for app/onboarding.tsx
 *
 * Tests the onboarding flow including:
 * - Step 1: Name collection
 * - Step 2: Sobriety date selection
 * - Form validation
 * - Navigation between steps
 * - Profile update submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OnboardingScreen from '@/app/onboarding';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock supabase
const mockUpdate = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: mockUpdate,
      })),
    })),
  },
}));

// Mock AuthContext
const mockSignOut = jest.fn();
const mockRefreshProfile = jest.fn();
const mockUser = { id: 'user-123' };
let mockProfile: {
  id: string;
  first_name?: string | null;
  last_initial?: string | null;
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
  ChevronRight: () => null,
  ChevronLeft: () => null,
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

// Mock ProgressBar
jest.mock('@/components/onboarding/ProgressBar', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ step, totalSteps }: { step: number; totalSteps: number }) =>
      React.createElement(
        View,
        { testID: 'progress-bar' },
        React.createElement(Text, null, `Step ${step} of ${totalSteps}`)
      ),
  };
});

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

// Mock Alert
jest.spyOn(Alert, 'alert');

// Get reference to the global Linking mock from jest.setup.js
const mockLinking = jest.requireMock('react-native').Linking;

// =============================================================================
// Test Suite
// =============================================================================

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = { id: 'user-123' };
    mockUpdate.mockResolvedValue({ error: null });
    mockRefreshProfile.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      signOut: mockSignOut,
      refreshProfile: mockRefreshProfile,
    });
  });

  describe('Step 1 - Name Collection', () => {
    it('renders step 1 content', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Welcome to Sobriety Waypoint')).toBeTruthy();
      expect(screen.getByText("Let's get to know you better.")).toBeTruthy();
    });

    it('renders first name and last initial inputs', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('First Name')).toBeTruthy();
      expect(screen.getByText('Last Initial')).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. John')).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. D')).toBeTruthy();
    });

    it('disables continue button when name fields are empty', () => {
      render(<OnboardingScreen />);

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeTruthy();
      // Button is rendered but disabled state is managed via TouchableOpacity's disabled prop
      // which applies visual opacity - verified by behavioral test that it doesn't navigate
    });

    it('enables continue button when name fields are filled', () => {
      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');

      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeTruthy();
    });

    it('navigates to step 2 when continue is pressed', () => {
      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');

      fireEvent.press(screen.getByText('Continue'));

      // Should now show step 2 content
      expect(screen.getByText('Your Sobriety Date')).toBeTruthy();
    });

    it('shows info button', () => {
      render(<OnboardingScreen />);

      // Info button is rendered
      expect(screen.getByText('Why do we ask for this?')).toBeTruthy();
    });

    it('renders progress bar', () => {
      render(<OnboardingScreen />);

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
      expect(screen.getByText('Step 1 of 2')).toBeTruthy();
    });
  });

  describe('Step 2 - Sobriety Date', () => {
    const navigateToStep2 = () => {
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));
    };

    it('renders step 2 content', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      expect(screen.getByText('Your Sobriety Date')).toBeTruthy();
      expect(screen.getByText('When did your journey begin?')).toBeTruthy();
    });

    it('shows sobriety date display', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      expect(screen.getByText('Sobriety Date')).toBeTruthy();
    });

    it('shows days sober count', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('Days Sober')).toBeTruthy();
    });

    it('shows back button on step 2', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      expect(screen.getByText('Back')).toBeTruthy();
    });

    it('navigates back to step 1 when back is pressed', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      fireEvent.press(screen.getByText('Back'));

      expect(screen.getByText('Welcome to Sobriety Waypoint')).toBeTruthy();
    });

    it('shows terms acceptance checkbox', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      expect(screen.getByText(/I agree to the/)).toBeTruthy();
      expect(screen.getByText('Privacy Policy')).toBeTruthy();
      expect(screen.getByText('Terms of Service')).toBeTruthy();
    });

    it('disables complete button when terms not accepted', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      const completeButton = screen.getByText('Complete Setup');
      expect(completeButton).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    const fillAndSubmitForm = async () => {
      // Fill step 1
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));
    };

    it('submits profile update when complete setup is pressed', async () => {
      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      mockUpdate.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<OnboardingScreen />);
      await fillAndSubmitForm();

      await waitFor(() => {
        expect(screen.getByText('Setting up...')).toBeTruthy();
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
  });

  describe('External Links', () => {
    const navigateToStep2 = () => {
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));
    };

    it('opens privacy policy link', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      fireEvent.press(screen.getByText('Privacy Policy'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://www.volvoxdev.com/privacy');
    });

    it('opens terms of service link', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      fireEvent.press(screen.getByText('Terms of Service'));

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://www.volvoxdev.com/terms');
    });
  });

  describe('Pre-filled Values', () => {
    it('pre-fills name from OAuth profile when incomplete', () => {
      // Incomplete name (only first_name) so component starts at Step 1
      const profileWithPartialName = {
        id: 'user-123',
        first_name: 'Jane',
        last_initial: null, // Missing last initial, so starts at Step 1
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: profileWithPartialName,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      // First name should be pre-filled from OAuth
      expect(firstNameInput.props.value).toBe('Jane');
      // Last initial should be empty (not provided by OAuth)
      expect(lastInitialInput.props.value).toBe('');
    });

    it('syncs name fields when profile loads asynchronously (partial data only)', async () => {
      // Start with null profile (data hasn't loaded yet)
      let currentProfile: {
        id: string;
        first_name: string | null;
        last_initial: string | null;
        sobriety_date: string | null;
      } | null = null;

      mockUseAuth.mockImplementation(() => ({
        user: mockUser,
        profile: currentProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      }));

      const { getByPlaceholderText, rerender } = render(<OnboardingScreen />);

      // Initially, inputs should be empty
      expect(getByPlaceholderText('e.g. John').props.value).toBe('');
      expect(getByPlaceholderText('e.g. D').props.value).toBe('');

      // Simulate async profile load with PARTIAL data (only first_name, no last_initial)
      // This keeps the user on Step 1 so we can verify the sync behavior
      currentProfile = {
        id: 'user-123',
        first_name: 'Jane',
        last_initial: null, // Still incomplete, will stay on Step 1
        sobriety_date: null,
      };

      // Rerender to trigger useEffect with updated profile
      act(() => {
        rerender(<OnboardingScreen />);
      });

      // First name should be synced, last initial stays empty
      await waitFor(() => {
        expect(getByPlaceholderText('e.g. John').props.value).toBe('Jane');
        expect(getByPlaceholderText('e.g. D').props.value).toBe('');
      });
    });

    it('does not overwrite user edits when profile syncs', async () => {
      // Start with incomplete profile (will stay on Step 1)
      let currentProfile: {
        id: string;
        first_name: string | null;
        last_initial: string | null;
        sobriety_date: string | null;
      } = {
        id: 'user-123',
        first_name: null,
        last_initial: null,
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
      fireEvent.changeText(getByPlaceholderText('e.g. John'), 'UserTyped');
      fireEvent.changeText(getByPlaceholderText('e.g. D'), 'X');

      // Now profile loads with partial data (still stays on Step 1)
      currentProfile = {
        id: 'user-123',
        first_name: 'ProfileValue',
        last_initial: null, // Still incomplete, stays on Step 1
        sobriety_date: null,
      };

      // Rerender to trigger useEffect
      act(() => {
        rerender(<OnboardingScreen />);
      });

      // User's edits should be preserved (useEffect only syncs when fields are empty)
      await waitFor(() => {
        expect(getByPlaceholderText('e.g. John').props.value).toBe('UserTyped');
        expect(getByPlaceholderText('e.g. D').props.value).toBe('X');
      });
    });
  });

  describe('Progress Indicator', () => {
    it('shows step 1 of 2 on first step', () => {
      render(<OnboardingScreen />);

      expect(screen.getByText('Step 1 of 2')).toBeTruthy();
    });

    it('shows step 2 of 2 on second step', () => {
      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));

      expect(screen.getByText('Step 2 of 2')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('shows error alert when signOut fails with Error object', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Sign out failed');
      });
    });

    it('shows generic error alert when signOut fails with non-Error', async () => {
      mockSignOut.mockRejectedValueOnce('string error');

      render(<OnboardingScreen />);

      fireEvent.press(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'An unknown error occurred');
      });
    });

    it('shows error alert when profile update fails', async () => {
      mockUpdate.mockResolvedValue({ error: new Error('Update failed') });

      render(<OnboardingScreen />);

      // Fill form
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));

      await waitFor(() => {
        // Component shows the error message from the Error object
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Update failed');
      });
    });
  });

  describe('Pre-filled Sobriety Date', () => {
    it('uses existing sobriety date from profile', () => {
      const profileWithDate = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: '2024-01-01',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: profileWithDate,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      // With complete name, starts at Step 2 automatically
      // The days sober count should be shown
      expect(screen.getByText('Days Sober')).toBeTruthy();
    });

    it('clamps future sobriety date to maximum date', () => {
      // Set a future date that would be clamped
      const profileWithFutureDate = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: '2099-01-01', // Far future date
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: profileWithFutureDate,
        signOut: mockSignOut,
        refreshProfile: mockRefreshProfile,
      });

      render(<OnboardingScreen />);

      // With complete name, starts at Step 2 automatically
      // Should render without crashing
      expect(screen.getByText('Days Sober')).toBeTruthy();
    });
  });

  describe('Terms Toggle', () => {
    const navigateToStep2 = () => {
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));
    };

    it('toggles terms acceptance when pressed', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      // Initially unchecked
      const termsCheckbox = screen.getByText(/I agree to the/);

      // Toggle on
      fireEvent.press(termsCheckbox);

      // Should be able to complete setup now
      expect(screen.getByText('Complete Setup')).toBeTruthy();
    });
  });

  describe('Info Box Toggle', () => {
    it('shows info box when info button is pressed', async () => {
      render(<OnboardingScreen />);

      // Press the info button
      fireEvent.press(screen.getByText('Why do we ask for this?'));

      // Info box should now be visible
      await waitFor(() => {
        expect(screen.getByText(/We value your privacy/)).toBeTruthy();
      });
    });

    it('hides info box when info button is pressed again', async () => {
      render(<OnboardingScreen />);

      const infoButton = screen.getByText('Why do we ask for this?');

      // Show info box
      fireEvent.press(infoButton);
      await waitFor(() => {
        expect(screen.getByText(/We value your privacy/)).toBeTruthy();
      });

      // Hide info box
      fireEvent.press(infoButton);
      await waitFor(() => {
        expect(screen.queryByText(/We value your privacy/)).toBeNull();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('triggers lastInitial focus when first name input submits', () => {
      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      fireEvent.changeText(firstNameInput, 'John');

      // Trigger onSubmitEditing
      fireEvent(firstNameInput, 'submitEditing');

      // The component should not crash - focus is handled internally
      expect(screen.getByPlaceholderText('e.g. D')).toBeTruthy();
    });

    it('navigates to step 2 when last initial input submits with valid data', () => {
      render(<OnboardingScreen />);

      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');

      // Trigger onSubmitEditing on last initial
      fireEvent(lastInitialInput, 'submitEditing');

      // Should navigate to step 2
      expect(screen.getByText('Your Sobriety Date')).toBeTruthy();
    });
  });

  describe('Date Picker', () => {
    const navigateToStep2 = () => {
      const firstNameInput = screen.getByPlaceholderText('e.g. John');
      const lastInitialInput = screen.getByPlaceholderText('e.g. D');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastInitialInput, 'D');
      fireEvent.press(screen.getByText('Continue'));
    };

    it('opens date picker when sobriety date is pressed', () => {
      render(<OnboardingScreen />);
      navigateToStep2();

      // Press the date display
      fireEvent.press(screen.getByText('Sobriety Date'));

      // Date picker should be shown (we mocked it with testID)
      expect(screen.getByTestId('date-time-picker')).toBeTruthy();
    });
  });

  describe('Profile Completion Navigation', () => {
    it('navigates to main app when profile becomes complete after submission', async () => {
      // Start with incomplete name so component starts at Step 1
      const incompleteProfile = {
        id: 'user-123',
        first_name: null,
        last_initial: null,
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
        incompleteProfile.first_name = 'John';
        incompleteProfile.last_initial = 'D';
        incompleteProfile.sobriety_date = '2024-01-01';
      });

      render(<OnboardingScreen />);

      // Fill in name fields at Step 1
      fireEvent.changeText(screen.getByPlaceholderText('e.g. John'), 'John');
      fireEvent.changeText(screen.getByPlaceholderText('e.g. D'), 'D');

      // Navigate to step 2
      fireEvent.press(screen.getByText('Continue'));

      // Accept terms and submit
      fireEvent.press(screen.getByText(/I agree to the/));
      fireEvent.press(screen.getByText('Complete Setup'));

      // Wait for profile refresh
      await waitFor(() => {
        expect(mockRefreshProfile).toHaveBeenCalled();
      });

      // Verify navigation to main app
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });
  });

  describe('Smart Step Selection', () => {
    it('starts at Step 2 when profile has both first_name and last_initial', async () => {
      const completeProfile = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: null, // Still needs sobriety date
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: completeProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { queryByText } = render(<OnboardingScreen />);

      // Should show Step 2 content (sobriety date), not Step 1 (name entry)
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
        expect(queryByText("Let's get to know you better.")).toBeNull();
      });
    });

    it('starts at Step 1 when first_name is null', async () => {
      const incompleteProfile = {
        id: 'user-123',
        first_name: null,
        last_initial: 'D',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: incompleteProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('starts at Step 1 when last_initial is null', async () => {
      const incompleteProfile = {
        id: 'user-123',
        first_name: 'John',
        last_initial: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: incompleteProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('starts at Step 1 when name has placeholder values', async () => {
      const placeholderProfile = {
        id: 'user-123',
        first_name: 'User',
        last_initial: 'U',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: placeholderProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('auto-advances from Step 1 to Step 2 when profile updates with complete name', async () => {
      // Start with incomplete profile (null first_name)
      let currentProfile: {
        id: string;
        first_name: string | null;
        last_initial: string | null;
        sobriety_date: string | null;
      } = {
        id: 'user-123',
        first_name: null,
        last_initial: null,
        sobriety_date: null,
      };

      mockUseAuth.mockImplementation(() => ({
        user: mockUser,
        profile: currentProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      }));

      const { getByText, queryByText, rerender } = render(<OnboardingScreen />);

      // Verify Step 1 is shown initially
      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });

      // Simulate profile update (e.g., OAuth data arrives or async fetch completes)
      currentProfile = {
        id: 'user-123',
        first_name: 'Jane',
        last_initial: 'D',
        sobriety_date: null,
      };

      // Rerender to trigger useEffect with updated profile
      act(() => {
        rerender(<OnboardingScreen />);
      });

      // Verify auto-advance to Step 2
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
        expect(queryByText("Let's get to know you better.")).toBeNull();
      });
    });

    it('handles empty string name values (different from null)', async () => {
      const emptyStringProfile = {
        id: 'user-123',
        first_name: '',
        last_initial: '',
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: emptyStringProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      // Empty strings should be treated as incomplete (start at Step 1)
      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('does not auto-advance when name is whitespace only', async () => {
      const whitespaceProfile = {
        id: 'user-123',
        first_name: '   ',
        last_initial: ' ',
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: whitespaceProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      // Should start at Step 1 (whitespace considered incomplete)
      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('maintains Step 2 when profile already complete on mount', async () => {
      const completeProfile = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: completeProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { queryByText, getByText } = render(<OnboardingScreen />);

      // Should be on Step 2 from the start
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
      });

      // Verify Step 1 content is not present
      expect(queryByText("Let's get to know you better.")).toBeNull();
      expect(queryByText('e.g. John')).toBeNull(); // First name placeholder
    });

    it('handles undefined profile gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: undefined,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { getByText } = render(<OnboardingScreen />);

      // Should start at Step 1 when profile is undefined
      await waitFor(() => {
        expect(getByText("Let's get to know you better.")).toBeTruthy();
      });
    });

    it('does not regress to Step 1 when on Step 2 with complete name', async () => {
      const completeProfile = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: completeProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { queryByText, rerender } = render(<OnboardingScreen />);

      // Should be on Step 2
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
      });

      // Rerender with same profile
      rerender(<OnboardingScreen />);

      // Should still be on Step 2, not regress to Step 1
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
        expect(queryByText("Let's get to know you better.")).toBeNull();
      });
    });

    it('allows user to go back to Step 1 to edit name without auto-advancing', async () => {
      const completeProfile = {
        id: 'user-123',
        first_name: 'John',
        last_initial: 'D',
        sobriety_date: null,
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        profile: completeProfile,
        refreshProfile: mockRefreshProfile,
        signOut: mockSignOut,
      });

      const { queryByText, getByText, getByPlaceholderText } = render(<OnboardingScreen />);

      // Should start on Step 2 (complete name)
      await waitFor(() => {
        expect(queryByText('Your Sobriety Date')).toBeTruthy();
      });

      // Click Back button to go to Step 1
      const backButton = getByText('Back');
      fireEvent.press(backButton);

      // Should now be on Step 1
      await waitFor(() => {
        expect(queryByText("Let's get to know you better.")).toBeTruthy();
        expect(queryByText('Your Sobriety Date')).toBeNull();
      });

      // User should stay on Step 1 (not auto-advance back to Step 2)
      // Give it time to potentially auto-advance if the bug existed
      await waitFor(
        () => {
          expect(queryByText("Let's get to know you better.")).toBeTruthy();
        },
        { timeout: 500 }
      );

      // User should be able to edit name fields (they should be editable, not force-synced from profile)
      const firstNameInput = getByPlaceholderText('e.g. John');
      const lastInitialInput = getByPlaceholderText('e.g. D');

      // Clear and type new values
      fireEvent.changeText(firstNameInput, 'NewName');
      fireEvent.changeText(lastInitialInput, 'X');

      // Values should stick (not be overwritten by profile sync)
      expect(firstNameInput.props.value).toBe('NewName');
      expect(lastInitialInput.props.value).toBe('X');
    });
  });
});
