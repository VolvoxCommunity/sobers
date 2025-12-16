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

// Mock AuthContext
const mockRefreshProfile = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    refreshProfile: mockRefreshProfile,
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
  mockRefreshProfile.mockResolvedValue(undefined);
  mockTrackEvent.mockReturnValue(undefined);
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

    it('updates profile with display name in "FirstName L." format', async () => {
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
          display_name: 'Jane S.',
        });
      });
    });

    it('uses only first name when no family name provided', async () => {
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
          display_name: 'Madonna',
        });
      });
    });

    it('handles only family name provided with initial (no leading space)', async () => {
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
          display_name: 'S.',
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

    it('logs success after completing Apple Sign In', async () => {
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
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
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

  // ---------------------------------------------------------------------------
  // Display Name Edge Cases
  // ---------------------------------------------------------------------------

  describe('Display name edge cases', () => {
    it('handles empty given name with valid family name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: '',
          familyName: 'Johnson',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        // Empty givenName is trimmed to '', so display_name is just 'J.' (no leading space)
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'J.',
        });
      });
    });

    it('handles empty family name with valid given name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Prince',
          familyName: '',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'Prince',
        });
      });
    });

    it('handles whitespace-only given name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: '   ',
          familyName: 'Smith',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        // Whitespace-only givenName is treated as empty string after trimming
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: {
            full_name: 'Smith',
            given_name: null, // Empty string after trim becomes null
            family_name: 'Smith',
          },
        });
      });
    });

    it('capitalizes family name initial', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'doe',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'John D.',
        });
      });
    });

    it('handles single-character family name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'X',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'John X.',
        });
      });
    });

    it('handles international characters in given name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'José',
          familyName: 'García',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'José G.',
        });
      });
    });

    it('handles international characters in family name initial', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: 'Øvergård',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'John Ø.',
        });
      });
    });

    it('handles very long given name', async () => {
      const longName = 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff';
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: longName,
          familyName: 'Sr.',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: `${longName} S.`,
        });
      });
    });

    it('handles numeric characters in family name', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'John',
          familyName: '3rd',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdate).toHaveBeenCalledWith({
          display_name: 'John 3.',
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Race Condition and Timing Tests
  // ---------------------------------------------------------------------------

  describe('Race conditions and timing', () => {
    it('handles concurrent button presses gracefully', async () => {
      mockSignInAsync.mockResolvedValue({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValue({ error: null });

      render(<AppleSignInButton />);

      const button = screen.getByTestId('apple-sign-in-button');

      // Rapidly press button multiple times
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalled();
      });

      // Each press should trigger signInAsync
      expect(mockSignInAsync).toHaveBeenCalledTimes(3);
    });

    it('handles slow Apple authentication response', async () => {
      // Simulate slow Apple response with delay
      mockSignInAsync.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                identityToken: 'mock-identity-token',
              });
            }, 100);
          })
      );
      mockSignInWithIdToken.mockResolvedValue({ error: null });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(
        () => {
          expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
            category: 'auth',
          });
        },
        { timeout: 200 }
      );
    });

    it('handles slow Supabase token exchange', async () => {
      mockSignInAsync.mockResolvedValue({
        identityToken: 'mock-identity-token',
      });
      // Simulate slow Supabase response
      mockSignInWithIdToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ error: null });
            }, 100);
          })
      );

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(
        () => {
          expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
            category: 'auth',
          });
        },
        { timeout: 200 }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Component Lifecycle Tests
  // ---------------------------------------------------------------------------

  describe('Component lifecycle', () => {
    it('handles unmount during authentication', async () => {
      let resolveSignIn: (value: unknown) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignInAsync.mockReturnValue(signInPromise);

      const { unmount } = render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Unmount before authentication completes
      unmount();

      // Resolve the promise after unmount
      resolveSignIn!({
        identityToken: 'mock-identity-token',
      });

      // Should not throw or cause issues
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it('handles re-render during authentication', async () => {
      mockSignInAsync.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                identityToken: 'mock-identity-token',
              });
            }, 50);
          })
      );
      mockSignInWithIdToken.mockResolvedValue({ error: null });

      const { rerender } = render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Re-render with different props during authentication
      rerender(<AppleSignInButton onSuccess={jest.fn()} />);

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Error Message Format Tests
  // ---------------------------------------------------------------------------

  describe('Error message formats', () => {
    it('handles Error objects with custom properties', async () => {
      const onError = jest.fn();
      const customError = new Error('Custom error');
      (customError as any).code = 'CUSTOM_CODE';
      (customError as any).details = { foo: 'bar' };
      mockSignInAsync.mockRejectedValueOnce(customError);

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(customError);
      });
    });

    it('handles null error from Supabase', async () => {
      const onError = jest.fn();
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      // Supabase returns error: null (success case incorrectly detected as error)
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton onError={onError} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerInfo).toHaveBeenCalledWith('Apple Sign In successful', {
          category: 'auth',
        });
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('handles error object without message property', async () => {
      const onError = jest.fn();
      const errorWithoutMessage = { code: 'UNKNOWN' };
      mockSignInAsync.mockRejectedValueOnce(errorWithoutMessage);

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
  // Analytics Edge Cases
  // ---------------------------------------------------------------------------

  describe('Analytics tracking edge cases', () => {
    it('tracks analytics before calling onSuccess', async () => {
      const callOrder: string[] = [];
      const onSuccess = jest.fn(() => callOrder.push('onSuccess'));

      mockTrackEvent.mockImplementation(() => callOrder.push('trackEvent'));
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton onSuccess={onSuccess} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });

      // Analytics should be tracked before onSuccess
      expect(callOrder).toEqual(['trackEvent', 'onSuccess']);
    });

    it('still calls onSuccess even if analytics tracking fails', async () => {
      const onSuccess = jest.fn();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics failed');
      });
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });

      render(<AppleSignInButton onSuccess={onSuccess} />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      // Should still call onSuccess despite analytics failure
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Profile Update Edge Cases
  // ---------------------------------------------------------------------------

  describe('Profile update edge cases', () => {
    it('queries the profile using correct user ID', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Test',
          familyName: 'User',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'specific-user-id-123' } },
      });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockProfileUpdateEq).toHaveBeenCalledWith('id', 'specific-user-id-123');
      });
    });

    it('does not update profile if display name is empty after formatting', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: '',
          familyName: '',
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

      // Should not update metadata or profile when both names are empty
      expect(mockUpdateUser).not.toHaveBeenCalled();
      expect(mockProfileUpdate).not.toHaveBeenCalled();
    });

    it('updates both user metadata and profile atomically', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Atomic',
          familyName: 'Test',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      // mockGetUser and mockProfileUpdateEq are already set up in resetMocks()

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        expect(mockProfileUpdate).toHaveBeenCalled();
      });

      // Both should have been called
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockProfileUpdate).toHaveBeenCalledTimes(1);
    });

    it('calls refreshProfile after successfully updating profile with name', async () => {
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
        expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call refreshProfile when profile update fails', async () => {
      mockSignInAsync.mockResolvedValueOnce({
        identityToken: 'mock-identity-token',
        fullName: {
          givenName: 'Test',
          familyName: 'User',
        },
      });
      mockSignInWithIdToken.mockResolvedValueOnce({ error: null });
      mockProfileUpdateEq.mockResolvedValueOnce({ error: { message: 'Profile update failed' } });

      render(<AppleSignInButton />);

      fireEvent.press(screen.getByTestId('apple-sign-in-button'));

      await waitFor(() => {
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Failed to update profile with Apple name data',
          expect.objectContaining({ category: 'auth' })
        );
      });

      expect(mockRefreshProfile).not.toHaveBeenCalled();
    });
  });
});
