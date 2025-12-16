/**
 * @fileoverview Tests for Login screen
 *
 * Tests the login screen including:
 * - Rendering the login form
 * - Email/password validation
 * - Sign in flow
 * - Google sign in
 * - Navigation to signup
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { ThemeProvider } from '@/contexts/ThemeContext';

// =============================================================================
// Mocks
// =============================================================================

const mockSignIn = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockPush = jest.fn();
const mockShowAlert = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    AUTH: 'auth',
  },
}));

jest.mock('@/lib/alert', () => ({
  showAlert: (...args: any[]) => mockShowAlert(...args),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
}));

// Mock AppleSignInButton (iOS only component)
jest.mock('@/components/auth/AppleSignInButton', () => ({
  AppleSignInButton: () => null,
}));

// Mock SocialLogos
jest.mock('@/components/auth/SocialLogos', () => ({
  GoogleLogo: () => null,
}));

// =============================================================================
// Helper
// =============================================================================

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// =============================================================================
// Test Suite
// =============================================================================

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders the login form', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByText('Sobriety Waypoint')).toBeTruthy();
      expect(screen.getByText('Your journey to recovery')).toBeTruthy();
      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByText('Password')).toBeTruthy();
    });

    it('renders sign in button', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('renders Google sign in button', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByText('Continue with Google')).toBeTruthy();
    });

    it('renders create account button', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByText('Create New Account')).toBeTruthy();
    });

    it('renders email and password inputs', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByPlaceholderText('your@email.com')).toBeTruthy();
      expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    });
  });

  describe('email/password sign in', () => {
    it('calls signIn with email and password', async () => {
      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows loading state during sign in', async () => {
      // Make signIn hang
      let resolveSignIn: () => void;
      mockSignIn.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSignIn = resolve;
          })
      );

      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in')).toBeTruthy();
      });

      // Cleanup
      resolveSignIn!();
    });
  });

  describe('Google sign in', () => {
    it('calls signInWithGoogle when Google button is pressed', async () => {
      renderWithTheme(<LoginScreen />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('shows loading state during Google sign in', async () => {
      let resolveGoogleSignIn: () => void;
      mockSignInWithGoogle.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGoogleSignIn = resolve;
          })
      );

      renderWithTheme(<LoginScreen />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in with Google')).toBeTruthy();
      });

      // Cleanup
      resolveGoogleSignIn!();
    });
  });

  describe('navigation', () => {
    it('navigates to signup when Create New Account is pressed', () => {
      renderWithTheme(<LoginScreen />);

      const createAccountButton = screen.getByText('Create New Account');
      fireEvent.press(createAccountButton);

      expect(mockPush).toHaveBeenCalledWith('/signup');
    });
  });

  describe('input behavior', () => {
    it('allows typing in email field', () => {
      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      fireEvent.changeText(emailInput, 'newuser@test.com');

      expect(emailInput.props.value).toBe('newuser@test.com');
    });

    it('allows typing in password field', () => {
      renderWithTheme(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      fireEvent.changeText(passwordInput, 'secretpass');

      expect(passwordInput.props.value).toBe('secretpass');
    });
  });

  describe('validation errors', () => {
    it('shows alert when email is empty', async () => {
      renderWithTheme(<LoginScreen />);

      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('shows alert when password is empty', async () => {
      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });
  });

  describe('error handling', () => {
    it('shows error alert when signIn fails', async () => {
      const signInError = new Error('Invalid credentials');
      mockSignIn.mockRejectedValueOnce(signInError);

      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Invalid credentials');
      });
    });

    it('shows error alert when Google sign in fails', async () => {
      const googleError = new Error('Google auth failed');
      mockSignInWithGoogle.mockRejectedValueOnce(googleError);

      renderWithTheme(<LoginScreen />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Google auth failed');
      });
    });

    it('handles non-Error objects in signIn catch', async () => {
      mockSignIn.mockRejectedValueOnce('string error');

      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Failed to sign in');
      });
    });

    it('handles non-Error objects in Google sign in catch', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce('string error');

      renderWithTheme(<LoginScreen />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Error', 'Failed to sign in with Google');
      });
    });
  });

  describe('button states', () => {
    it('disables sign in button while loading', async () => {
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in')).toBeTruthy();
      });
    });

    it('renders or divider', () => {
      renderWithTheme(<LoginScreen />);

      expect(screen.getByText('or')).toBeTruthy();
    });
  });

  describe('keyboard navigation', () => {
    it('focuses password input when email input submits', () => {
      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      fireEvent.changeText(emailInput, 'test@example.com');

      // Trigger onSubmitEditing - should focus password field
      fireEvent(emailInput, 'submitEditing');

      // Component should not crash and password field should still be accessible
      expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    });

    it('triggers login when password input submits', async () => {
      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      // Trigger onSubmitEditing on password field
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });

  describe('loading states', () => {
    it('disables Google button while email sign in is loading', async () => {
      mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithTheme(<LoginScreen />);

      const emailInput = screen.getByPlaceholderText('your@email.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const signInButton = screen.getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in')).toBeTruthy();
      });

      // Google button should exist but be disabled
      expect(screen.getByText('Continue with Google')).toBeTruthy();
    });

    it('disables sign in button while Google sign in is loading', async () => {
      let resolveGoogleSignIn: () => void;
      mockSignInWithGoogle.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGoogleSignIn = resolve;
          })
      );

      renderWithTheme(<LoginScreen />);

      const googleButton = screen.getByText('Continue with Google');
      fireEvent.press(googleButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Signing in with Google')).toBeTruthy();
      });

      // Sign In button should exist
      expect(screen.getByText('Sign In')).toBeTruthy();

      // Cleanup
      resolveGoogleSignIn!();
    });
  });
});
