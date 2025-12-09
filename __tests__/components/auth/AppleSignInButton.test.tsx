// =============================================================================
// AppleSignInButton Component Tests
// =============================================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';

// =============================================================================
// Mocks
// =============================================================================

// Store original Platform.OS to restore after tests
const originalPlatformOS = Platform.OS;

// Mock expo-apple-authentication
const mockSignInAsync = jest.fn();
const mockAppleAuthenticationButton = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockSignInAsync(...args),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
  AppleAuthenticationButtonType: {
    SIGN_IN: 0,
    CONTINUE: 1,
    SIGN_UP: 2,
  },
  AppleAuthenticationButtonStyle: {
    WHITE: 0,
    WHITE_OUTLINE: 1,
    BLACK: 2,
  },
  AppleAuthenticationButton: (props: {
    onPress: () => void;
    buttonStyle: number;
    buttonType: number;
    cornerRadius: number;
    style: object;
  }) => {
    mockAppleAuthenticationButton(props);
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      {
        testID: 'apple-sign-in-button',
        onPress: props.onPress,
        accessibilityLabel: 'Sign in with Apple',
      },
      React.createElement(Text, null, 'Sign in with Apple')
    );
  },
}));

// Mock supabase client
const mockSignInWithIdToken = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetUser = jest.fn();
const mockProfileUpdate = jest.fn();
const mockProfileUpdateEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: (...args: unknown[]) => mockSignInWithIdToken(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: () => ({
      update: (...args: unknown[]) => {
        mockProfileUpdate(...args);
        return {
          eq: (...eqArgs: unknown[]) => mockProfileUpdateEq(...eqArgs),
        };
      },
    }),
  },
}));

// Mock ThemeContext
const mockIsDark = jest.fn();
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: mockIsDark(),
    theme: {
      text: '#111827',
      background: '#ffffff',
    },
  }),
}));

// Mock logger
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
  LogCategory: {
    AUTH: 'auth',
  },
}));

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  AnalyticsEvents: {
    AUTH_LOGIN: 'auth_login',
  },
}));

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Helper to set Platform.OS for testing platform-specific behavior.
 */
function setPlatformOS(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

/**
 * Reset all mocks and Platform.OS before each test.
 */
function resetMocks() {
  jest.clearAllMocks();
  mockIsDark.mockReturnValue(false);
  setPlatformOS('ios');
  // Default mock implementations for new auth flows
  mockUpdateUser.mockResolvedValue({ error: null });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'mock-user-id' } } });
  mockProfileUpdateEq.mockResolvedValue({ error: null });
}

// =============================================================================
// Tests
// =============================================================================

describe('AppleSignInButton', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterAll(() => {
    // Restore original Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Platform Behavior Tests
  // ---------------------------------------------------------------------------

  describe('Platform behavior', () => {
    it('renders Apple button on iOS', () => {
      setPlatformOS('ios');

      render(<AppleSignInButton />);

      expect(screen.getByTestId('apple-sign-in-button')).toBeTruthy();
    });

    it('returns null on Android', () => {
      setPlatformOS('android');

      const { toJSON } = render(<AppleSignInButton />);

      expect(toJSON()).toBeNull();
    });

    it('returns null on web', () => {
      setPlatformOS('web');

      const { toJSON } = render(<AppleSignInButton />);

      expect(toJSON()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Theme Behavior Tests
  // ---------------------------------------------------------------------------

  describe('Theme behavior', () => {
    it('uses BLACK button style in light mode', () => {
      mockIsDark.mockReturnValue(false);

      render(<AppleSignInButton />);

      // AppleAuthenticationButtonStyle.BLACK = 2
      expect(mockAppleAuthenticationButton).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonStyle: 2,
        })
      );
    });

    it('uses WHITE button style in dark mode', () => {
      mockIsDark.mockReturnValue(true);

      render(<AppleSignInButton />);

      // AppleAuthenticationButtonStyle.WHITE = 0
      expect(mockAppleAuthenticationButton).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonStyle: 0,
        })
      );
    });

    it('uses SIGN_IN button type', () => {
      render(<AppleSignInButton />);

      // AppleAuthenticationButtonType.SIGN_IN = 0
      expect(mockAppleAuthenticationButton).toHaveBeenCalledWith(
        expect.objectContaining({
          buttonType: 0,
        })
      );
    });

    it('applies correct corner radius', () => {
      render(<AppleSignInButton />);

      expect(mockAppleAuthenticationButton).toHaveBeenCalledWith(
        expect.objectContaining({
          cornerRadius: 12,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication Success Tests
  // ---------------------------------------------------------------------------

  describe('Successful authentication', () => {
    it('calls onSuccess after successful sign in', async () => {
      const onSuccess = jest.fn();
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        user: 'mock-user-id',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton onSuccess={onSuccess} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('requests correct scopes from Apple', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockSignInAsync).toHaveBeenCalledWith({
          requestedScopes: [0, 1], // FULL_NAME, EMAIL
        });
      });
    });

    it('exchanges identity token with Supabase', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockSignInWithIdToken).toHaveBeenCalledWith({
          provider: 'apple',
          token: 'mock-identity-token',
        });
      });
    });

    it('logs successful authentication', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });
    });

    it('tracks AUTH_LOGIN event with apple method after successful sign in', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('auth_login', { method: 'apple' });
      });
    });

    it('does not track analytics event when authentication fails', async () => {
      const mockError = new Error('Apple auth failed');
      mockSignInAsync.mockRejectedValueOnce(mockError);

      render(<AppleSignInButton onError={jest.fn()} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track analytics event when Supabase returns an error', async () => {
      const supabaseError = new Error('Supabase auth error');
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: supabaseError });

      render(<AppleSignInButton onError={jest.fn()} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track analytics event when user cancels', async () => {
      const cancelError = { code: 'ERR_REQUEST_CANCELED' };
      mockSignInAsync.mockRejectedValueOnce(cancelError);

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In cancelled by user', {
          category: 'auth',
        });
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication Error Tests
  // ---------------------------------------------------------------------------

  describe('Authentication errors', () => {
    it('calls onError when Apple authentication fails', async () => {
      const onError = jest.fn();
      const mockError = new Error('Apple auth failed');
      mockSignInAsync.mockRejectedValueOnce(mockError);

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });

    it('calls onError when no identity token returned', async () => {
      const onError = jest.fn();
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: null, // No token
      });

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'No identity token returned from Apple',
          })
        );
      });
    });

    it('calls onError when Supabase returns an error', async () => {
      const onError = jest.fn();
      const supabaseError = new Error('Supabase auth error');
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: supabaseError });

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(supabaseError);
      });
    });

    it('logs authentication errors', async () => {
      const mockError = new Error('Auth failed');
      mockSignInAsync.mockRejectedValueOnce(mockError);

      render(<AppleSignInButton onError={jest.fn()} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith('Apple Sign In failed', mockError, {
          category: 'auth',
        });
      });
    });

    it('creates generic error for non-Error thrown values', async () => {
      const onError = jest.fn();
      mockSignInAsync.mockRejectedValueOnce('string error'); // Not an Error object

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Apple Sign In failed',
          })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // User Cancellation Tests
  // ---------------------------------------------------------------------------

  describe('User cancellation', () => {
    it('does not call onError when user cancels', async () => {
      const onError = jest.fn();
      const cancelError = { code: 'ERR_REQUEST_CANCELED' };
      mockSignInAsync.mockRejectedValueOnce(cancelError);

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Wait for cancellation to be logged (proves the async operation completed)
      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In cancelled by user', {
          category: 'auth',
        });
      });

      // Now verify onError was not called
      expect(onError).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when user cancels', async () => {
      const onSuccess = jest.fn();
      const cancelError = { code: 'ERR_REQUEST_CANCELED' };
      mockSignInAsync.mockRejectedValueOnce(cancelError);

      render(<AppleSignInButton onSuccess={onSuccess} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Wait for cancellation to be logged (proves the async operation completed)
      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In cancelled by user', {
          category: 'auth',
        });
      });

      // Now verify onSuccess was not called
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('logs cancellation as info, not error', async () => {
      const cancelError = { code: 'ERR_REQUEST_CANCELED' };
      mockSignInAsync.mockRejectedValueOnce(cancelError);

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In cancelled by user', {
          category: 'auth',
        });
      });

      expect(mockLoggerError).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Callback Optional Tests
  // ---------------------------------------------------------------------------

  describe('Optional callbacks', () => {
    it('works without onSuccess callback', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Should not throw
      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });
    });

    it('works without onError callback', async () => {
      const mockError = new Error('Auth failed');
      mockSignInAsync.mockRejectedValueOnce(mockError);

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Should not throw
      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Name Extraction Tests
  // ---------------------------------------------------------------------------

  describe('Name extraction from Apple credential', () => {
    it('updates user metadata with full name when Apple provides it', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: {
            full_name: 'John Doe',
            given_name: 'John',
            family_name: 'Doe',
          },
        });
      });
    });

    it('updates profile with first name and last initial', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Jane',
          familyName: 'Smith',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          first_name: 'Jane',
          last_initial: 'S',
        });
      });
    });

    it('uses first name initial when no family name provided', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Madonna',
          familyName: null,
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          first_name: 'Madonna',
          last_initial: 'M',
        });
      });
    });

    it('handles only family name provided', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: null,
          familyName: 'Smith',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          first_name: null,
          last_initial: 'S',
        });
      });
    });

    it('does not update name when fullName is not provided (subsequent sign-ins)', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: null, // Apple only provides name on first sign-in
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });

      // Should not attempt to update user metadata or profile
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('does not update name when fullName has no givenName or familyName', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: null,
          familyName: null,
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });

      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('logs success after updating profile with name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Test',
          familyName: 'User',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Profile updated with Apple name data', {
          category: 'auth',
          firstName: 'Test',
          lastInitial: 'U',
        });
      });
    });

    it('logs warning but continues when updateUser fails', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      mockUpdateUser.mockResolvedValueOnce({ error: { message: 'Update failed' } });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Failed to update Apple user metadata with name',
          expect.objectContaining({
            category: 'auth',
            error: 'Update failed',
          })
        );
      });

      // Should still call onSuccess
      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });
    });

    it('logs warning but continues when profile update fails', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      mockProfileUpdateEq.mockResolvedValueOnce({ error: { message: 'Profile update failed' } });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Failed to update profile with Apple name data',
          expect.objectContaining({
            category: 'auth',
            error: 'Profile update failed',
          })
        );
      });

      // Should still call onSuccess
      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });
    });

    it('logs warning and skips profile update when getUser returns null user', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'Doe',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      // Simulate getUser returning null user (edge case)
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        // Should log warning about missing user ID
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Cannot update profile: user ID not available after sign-in',
          { category: 'auth' }
        );
      });

      // Should NOT attempt to update the profile
      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('logs warning and skips profile update when getUser returns undefined user', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Jane',
          familyName: 'Smith',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      // Simulate getUser returning undefined user
      mockGetUser.mockResolvedValueOnce({ data: {} });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        // Should log warning about missing user ID
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Cannot update profile: user ID not available after sign-in',
          { category: 'auth' }
        );
      });

      // Should NOT attempt to update the profile
      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });
  });
});
