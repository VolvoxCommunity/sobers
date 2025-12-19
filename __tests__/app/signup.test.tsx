/**
 * @fileoverview Tests for app/signup.tsx
 *
 * Tests the signup screen including:
 * - Form rendering and input fields
 * - Form validation (empty fields, password match, password length)
 * - Sign up submission
 * - Social sign-in buttons
 * - Navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SignupScreen from '@/app/signup';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

// =============================================================================
// Mocks
// =============================================================================

// lucide-react-native is mocked via moduleNameMapper in jest.config.js

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: jest.fn(),
  }),
}));

// Mock AuthContext
const mockSignUp = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
  }),
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

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  ArrowLeft: () => null,
}));

// Mock SocialLogos
jest.mock('@/components/auth/SocialLogos', () => ({
  GoogleLogo: () => null,
}));

// Mock AppleSignInButton
jest.mock('@/components/auth/AppleSignInButton', () => ({
  AppleSignInButton: () => null,
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
    AUTH: 'auth',
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('SignupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  describe('Header', () => {
    it('renders signup header', () => {
      render(<SignupScreen />);

      // "Create Account" appears as both header and button
      expect(screen.getAllByText('Create Account').length).toBeGreaterThanOrEqual(1);
    });

    it('renders subtitle', () => {
      render(<SignupScreen />);

      expect(screen.getByText('Begin your recovery journey')).toBeTruthy();
    });
  });

  describe('Form Fields', () => {
    it('renders email input', () => {
      render(<SignupScreen />);

      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
    });

    it('renders password input', () => {
      render(<SignupScreen />);

      expect(screen.getByText('Password')).toBeTruthy();
    });

    it('renders confirm password input', () => {
      render(<SignupScreen />);

      expect(screen.getByText('Confirm Password')).toBeTruthy();
    });

    it('renders create account button', () => {
      render(<SignupScreen />);

      // Button is one of the "Create Account" text elements
      const buttons = screen.getAllByText('Create Account');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Social Sign In', () => {
    it('renders Google sign in button', () => {
      render(<SignupScreen />);

      expect(screen.getByText('Continue with Google')).toBeTruthy();
    });

    it('renders or divider', () => {
      render(<SignupScreen />);

      expect(screen.getByText('or')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('renders login link', () => {
      render(<SignupScreen />);

      expect(screen.getByText(/Already have an account\?/)).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('navigates back when login link is pressed', () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByText(/Already have an account\?/));

      expect(mockBack).toHaveBeenCalled();
    });

    it('navigates back when back button is pressed', () => {
      render(<SignupScreen />);

      // The back button is a TouchableOpacity with an ArrowLeft icon
      // Find it by its role or structure - it's the first TouchableOpacity
      const backButton = screen.getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('accepts valid input in fields', () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');

      fireEvent.changeText(emailInput, 'test@example.com');

      expect(emailInput.props.value).toBe('test@example.com');
    });
  });

  describe('Sign Up Submission', () => {
    it('calls signUp with email and password on valid form submission', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      // Get all "Create Account" elements and press the button (second one)
      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123!');
      });
    });

    it('navigates to onboarding after successful signup', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('shows loading state during submission', async () => {
      mockSignUp.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(screen.getByLabelText('Creating account')).toBeTruthy();
      });
    });
  });

  describe('Google Sign In', () => {
    it('calls signInWithGoogle when Google button is pressed', async () => {
      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('shows loading state during Google sign in', async () => {
      mockSignInWithGoogle.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in with Google')).toBeTruthy();
      });
    });

    it('shows error toast when Google sign in fails', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(new Error('Google auth failed'));

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Google auth failed' })
        );
      });
    });

    it('handles non-Error objects in Google sign in catch', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce('string error');

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to sign in with Google' })
        );
      });
    });
  });

  describe('Form Validation Errors', () => {
    it('shows toast when email is empty', async () => {
      render(<SignupScreen />);

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Please fill in all fields' })
        );
      });
    });

    it('shows toast when password is empty', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Please fill in all fields' })
        );
      });
    });

    it('shows toast when confirm password is empty', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Please fill in all fields' })
        );
      });
    });

    it('shows toast when passwords do not match', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'differentpassword');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Passwords do not match' })
        );
      });
    });

    it('shows toast when password is too short', async () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], '123');
      fireEvent.changeText(passwordInputs[1], '123');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Password must be at least 8 characters',
          })
        );
      });
    });
  });

  describe('Sign Up Error Handling', () => {
    it('shows error toast when sign up fails', async () => {
      mockSignUp.mockRejectedValueOnce(new Error('Email already registered'));

      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Email already registered' })
        );
      });
    });

    it('handles non-Error objects in sign up catch', async () => {
      mockSignUp.mockRejectedValueOnce('string error');

      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to create account' })
        );
      });
    });
  });

  describe('Input Behavior', () => {
    it('allows typing in email field', () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      fireEvent.changeText(emailInput, 'newuser@test.com');

      expect(emailInput.props.value).toBe('newuser@test.com');
    });

    it('allows typing in password fields', () => {
      render(<SignupScreen />);

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      fireEvent.changeText(passwordInputs[0], 'secretpass');
      fireEvent.changeText(passwordInputs[1], 'secretpass');

      expect(passwordInputs[0].props.value).toBe('secretpass');
      expect(passwordInputs[1].props.value).toBe('secretpass');
    });
  });

  describe('Web Platform', () => {
    let originalPlatform: typeof Platform.OS;

    beforeAll(() => {
      originalPlatform = Platform.OS;
    });

    beforeEach(() => {
      Platform.OS = 'web';
      (Toast.show as jest.Mock).mockClear();
    });

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('shows toast for validation errors on web', () => {
      render(<SignupScreen />);

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Please fill in all fields' })
      );
    });

    it('shows toast for password mismatch on web', () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'mismatch');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Passwords do not match' })
      );
    });

    it('shows toast for short password on web', () => {
      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], '123');
      fireEvent.changeText(passwordInputs[1], '123');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Password must be at least 8 characters' })
      );
    });

    it('shows toast for sign up error on web', async () => {
      mockSignUp.mockRejectedValueOnce(new Error('Web error'));

      render(<SignupScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInputs[0], 'Password123!');
      fireEvent.changeText(passwordInputs[1], 'Password123!');

      const buttons = screen.getAllByText('Create Account');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Web error' })
        );
      });
    });

    it('shows toast for Google sign in error on web', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(new Error('Web Google error'));

      render(<SignupScreen />);

      fireEvent.press(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Web Google error' })
        );
      });
    });
  });
});
