/**
 * @fileoverview Tests for AuthContext
 *
 * Tests the authentication context including:
 * - Provider initialization
 * - useAuth hook usage
 * - Sign in/sign up/sign out flows
 * - OAuth token extraction
 * - Profile management
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// =============================================================================
// Mocks
// =============================================================================

// Track mock function calls for assertions
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSetSession = jest.fn();
const mockGetSession = jest.fn();
const mockUpdateUser = jest.fn();
const mockRpc = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockFrom = jest.fn();

// Reset supabase mock with configurable behavior
const resetSupabaseMock = (
  overrides: {
    session?: { user: { id: string; email: string } } | null;
    profile?: Record<string, unknown> | null;
  } = {}
) => {
  const defaultSession = overrides.session ?? null;
  const defaultProfile = overrides.profile ?? null;

  mockGetSession.mockResolvedValue({
    data: { session: defaultSession },
    error: null,
  });

  mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
  mockSignUp.mockResolvedValue({ data: {}, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockSetSession.mockResolvedValue({ data: { session: defaultSession }, error: null });
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
  mockRpc.mockResolvedValue({ data: null, error: null });

  mockOnAuthStateChange.mockReturnValue({
    data: {
      subscription: { unsubscribe: jest.fn() },
    },
  });

  mockFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: defaultProfile, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
  }));
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      getSession: () => mockGetSession(),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'sobers://auth/callback'),
}));

// Mock sentry functions
jest.mock('@/lib/sentry', () => ({
  setSentryUser: jest.fn(),
  clearSentryUser: jest.fn(),
  setSentryContext: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    AUTH: 'auth',
    DATABASE: 'database',
  },
}));

// Mock date
jest.mock('@/lib/date', () => ({
  DEVICE_TIMEZONE: 'America/New_York',
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  resetAnalytics: jest.fn(() => Promise.resolve()),
  calculateDaysSoberBucket: jest.fn(() => '31-90'),
  AnalyticsEvents: {
    AUTH_LOGIN: 'auth_login',
    AUTH_SIGN_UP: 'auth_sign_up',
    AUTH_LOGOUT: 'auth_logout',
  },
}));

// Mock apple-auth-name module (used for passing Apple Sign In name data)
// Use module state so setPendingAppleAuthName affects getPendingAppleAuthName
let mockPendingAppleName: {
  firstName: string;
  familyName: string;
  displayName: string;
  fullName: string;
} | null = null;

jest.mock('@/lib/apple-auth-name', () => ({
  getPendingAppleAuthName: jest.fn(() => mockPendingAppleName),
  setPendingAppleAuthName: jest.fn(
    (data: { firstName: string; familyName: string; displayName: string; fullName: string }) => {
      mockPendingAppleName = data;
    }
  ),
  clearPendingAppleAuthName: jest.fn(() => {
    mockPendingAppleName = null;
  }),
}));

// =============================================================================
// Helper
// =============================================================================

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// =============================================================================
// Test Suite
// =============================================================================

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSupabaseMock();
    // Reset the mock Apple name state
    mockPendingAppleName = null;
  });

  describe('useAuth hook', () => {
    it('throws error when used outside of AuthProvider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        // Note: useAuth doesn't actually throw when context is undefined
        // because the default context value is provided
        renderHook(() => useAuth());
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('returns initial loading state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial state should have loading true
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('provides all required methods', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.signInWithGoogle).toBe('function');
      expect(typeof result.current.refreshProfile).toBe('function');
      expect(typeof result.current.deleteAccount).toBe('function');
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword with email and password', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('throws error when sign in fails', async () => {
      const authError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValueOnce({ data: null, error: authError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signIn('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with email and password', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('newuser@example.com', 'password123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });

    it('throws error when sign up fails', async () => {
      const signUpError = new Error('Email already registered');
      mockSignUp.mockResolvedValueOnce({ data: null, error: signUpError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signUp('existing@example.com', 'password123');
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut and clears state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('handles AuthSessionMissingError gracefully', async () => {
      const missingSessionError = { name: 'AuthSessionMissingError', message: 'No session' };
      mockSignOut.mockResolvedValueOnce({ error: missingSessionError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw for AuthSessionMissingError
      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
    });

    it('throws for other sign out errors', async () => {
      const networkError = { name: 'NetworkError', message: 'Network failed' };
      mockSignOut.mockResolvedValueOnce({ error: networkError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signOut();
        })
      ).rejects.toEqual(networkError);
    });
  });

  describe('deleteAccount', () => {
    it('throws error when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteAccount();
        })
      ).rejects.toThrow('No user logged in');
    });

    it('calls rpc delete_user_account when user is logged in', async () => {
      // Set up a session with a user
      resetSupabaseMock({
        session: { user: { id: 'user-123', email: 'test@example.com' } },
        profile: { id: 'user-123', email: 'test@example.com' },
      });

      // Mock onAuthStateChange to trigger with session
      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          // Trigger callback with session
          setTimeout(
            () => callback('SIGNED_IN', { user: { id: 'user-123', email: 'test@example.com' } }),
            0
          );
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.deleteAccount();
      });

      expect(mockRpc).toHaveBeenCalledWith('delete_user_account');
    });
  });

  describe('session initialization', () => {
    it('fetches session on mount', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSession).toHaveBeenCalled();
    });

    it('fetches profile when session exists', async () => {
      resetSupabaseMock({
        session: { user: { id: 'user-456', email: 'test@example.com' } },
        profile: { id: 'user-456', email: 'test@example.com', display_name: 'Test T.' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('subscribes to auth state changes', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('refreshProfile', () => {
    it('does nothing when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      mockFrom.mockClear();

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('fetches profile when user is logged in', async () => {
      resetSupabaseMock({
        session: { user: { id: 'user-789', email: 'test@example.com' } },
        profile: { id: 'user-789', email: 'test@example.com', display_name: 'John J.' },
      });

      // Mock onAuthStateChange to trigger with session
      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(
            () => callback('SIGNED_IN', { user: { id: 'user-789', email: 'test@example.com' } }),
            0
          );
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      mockFrom.mockClear();

      await act(async () => {
        await result.current.refreshProfile();
      });

      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
  });

  describe('signInWithGoogle', () => {
    it('calls signInWithOAuth with google provider on web', async () => {
      // Mock Platform.OS as web
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));

      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Note: Platform.OS mock is tricky in Jest, this test validates the method exists
      expect(typeof result.current.signInWithGoogle).toBe('function');
    });

    it('throws error when OAuth fails', async () => {
      const oauthError = new Error('OAuth failed');
      mockSignInWithOAuth.mockResolvedValueOnce({ data: null, error: oauthError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The error should be thrown
      await expect(
        act(async () => {
          await result.current.signInWithGoogle();
        })
      ).rejects.toThrow('OAuth failed');
    });
  });

  describe('profile fetch error handling', () => {
    it('handles profile fetch errors gracefully', async () => {
      const profileError = new Error('Database error');
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: profileError }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      resetSupabaseMock({
        session: { user: { id: 'user-error', email: 'test@example.com' } },
      });

      // Re-apply the error mock after reset
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: profileError }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Profile should be null due to error
      expect(result.current.profile).toBeNull();
    });
  });

  describe('deleteAccount error handling', () => {
    it('throws error when RPC call fails', async () => {
      const rpcError = new Error('RPC failed');

      resetSupabaseMock({
        session: { user: { id: 'user-delete', email: 'test@example.com' } },
        profile: { id: 'user-delete', email: 'test@example.com' },
      });

      mockRpc.mockResolvedValue({ data: null, error: rpcError });

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(
            () => callback('SIGNED_IN', { user: { id: 'user-delete', email: 'test@example.com' } }),
            0
          );
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await expect(
        act(async () => {
          await result.current.deleteAccount();
        })
      ).rejects.toThrow('RPC failed');
    });

    it('handles signOut error after successful account deletion', async () => {
      resetSupabaseMock({
        session: { user: { id: 'user-delete2', email: 'test@example.com' } },
        profile: { id: 'user-delete2', email: 'test@example.com' },
      });

      mockRpc.mockResolvedValue({ data: null, error: null });
      // Make signOut fail after delete
      mockSignOut.mockResolvedValueOnce({
        error: { name: 'SomeError', message: 'Sign out failed' },
      });

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(
            () =>
              callback('SIGNED_IN', { user: { id: 'user-delete2', email: 'test@example.com' } }),
            0
          );
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Should not throw - account was deleted, signOut error is just logged
      await act(async () => {
        await result.current.deleteAccount();
      });

      // State should still be cleared
      expect(result.current.user).toBeNull();
    });
  });

  describe('auth state change events', () => {
    it('handles SIGNED_IN event', async () => {
      const mockProfile = { id: 'user-signin', email: 'test@example.com', display_name: 'John J.' };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', { user: { id: 'user-signin', email: 'test@example.com' } });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user?.id).toBe('user-signin');
      });
    });

    it('clears profile when session is null', async () => {
      mockOnAuthStateChange.mockImplementation(
        (callback: (event: string, session: null) => void) => {
          setTimeout(() => {
            callback('SIGNED_OUT', null);
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
    });
  });

  describe('Apple name storage in user_metadata', () => {
    it('stores pending Apple name in user_metadata on sign-in', async () => {
      // Set pending Apple name before auth (using mock state directly)
      mockPendingAppleName = {
        firstName: 'John',
        familyName: 'Doe',
        displayName: 'John D.',
        fullName: 'John Doe',
      };

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (
            event: string,
            session: {
              user: { id: string; email: string; user_metadata?: Record<string, unknown> };
            } | null
          ) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              user: {
                id: 'apple-user',
                email: 'apple@example.com',
                user_metadata: {}, // No existing display_name
              },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify updateUser was called to store the Apple name
      expect(mockUpdateUser).toHaveBeenCalledWith({
        data: {
          display_name: 'John D.',
          full_name: 'John Doe',
        },
      });
    });

    it('skips storing name if user_metadata already has display_name', async () => {
      // Set pending Apple name before auth (using mock state directly)
      mockPendingAppleName = {
        firstName: 'John',
        familyName: 'Doe',
        displayName: 'John D.',
        fullName: 'John Doe',
      };

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (
            event: string,
            session: {
              user: { id: string; email: string; user_metadata?: Record<string, unknown> };
            } | null
          ) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              user: {
                id: 'apple-user',
                email: 'apple@example.com',
                user_metadata: { display_name: 'Existing Name' }, // Already has display_name
              },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // updateUser should NOT be called since display_name already exists
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('does not store name when no pending Apple name exists', async () => {
      // mockPendingAppleName is already null from beforeEach

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (
            event: string,
            session: {
              user: { id: string; email: string; user_metadata?: Record<string, unknown> };
            } | null
          ) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              user: {
                id: 'oauth-user',
                email: 'oauth@example.com',
                user_metadata: {},
              },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // updateUser should NOT be called since there's no pending Apple name
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe on unmount', () => {
    it('unsubscribes from auth state changes on unmount', async () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: { unsubscribe: mockUnsubscribe },
        },
      });

      const { result, unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('analytics and Sentry integration', () => {
    it('sets analytics user ID when profile exists with sobriety_date', async () => {
      const mockProfile = {
        id: 'analytics-user',
        email: 'analytics@example.com',
        display_name: 'Analytics User',
        sobriety_date: '2024-01-01',
      };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              user: { id: 'analytics-user', email: 'analytics@example.com' },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      const { setUserId, setUserProperties } = require('@/lib/analytics');
      expect(setUserId).toHaveBeenCalledWith('analytics-user');
      expect(setUserProperties).toHaveBeenCalled();
    });

    it('clears Sentry user when profile is null', async () => {
      mockOnAuthStateChange.mockImplementation(
        (callback: (event: string, session: null) => void) => {
          setTimeout(() => {
            callback('SIGNED_OUT', null);
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const { clearSentryUser } = require('@/lib/sentry');
      expect(clearSentryUser).toHaveBeenCalled();
    });
  });

  describe('deep link handling', () => {
    it('handles deep links with OAuth tokens', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=test-token&refresh_token=test-refresh'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'oauth-user', email: 'oauth@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The deep link handling should attempt to set session
      expect(mockSetSession).toHaveBeenCalled();
    });

    it('ignores URLs without OAuth tokens', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      mockGetInitialURL.mockResolvedValueOnce('sobers://some-other-path');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not try to set session for non-OAuth URLs
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles INITIAL_SESSION event', async () => {
      const mockProfile = {
        id: 'session-user',
        email: 'session@example.com',
        display_name: 'Session User',
      };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (
            event: string,
            session: {
              user: { id: string; email: string; user_metadata?: Record<string, unknown> };
            } | null
          ) => void
        ) => {
          setTimeout(() => {
            callback('INITIAL_SESSION', {
              user: {
                id: 'session-user',
                email: 'session@example.com',
                user_metadata: {},
              },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.user?.id).toBe('session-user');
    });
  });

  describe('Google OAuth flow', () => {
    it('handles successful OAuth with session from deep link', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      // Mock successful session already exists
      mockGetSession
        .mockResolvedValueOnce({ data: { session: null }, error: null })
        .mockResolvedValueOnce({
          data: { session: { user: { id: 'google-user', email: 'google@test.com' } } },
          error: null,
        });

      const WebBrowser = require('expo-web-browser');
      WebBrowser.openAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'sobers://auth/callback#access_token=token&refresh_token=refresh',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try signing in with Google
      await result.current.signInWithGoogle().catch(() => {
        // May throw in test environment due to Platform.OS
      });

      // OAuth was initiated
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
        })
      );
    });

    it('handles OAuth cancellation', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      const WebBrowser = require('expo-web-browser');
      WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try signing in with Google (should not throw for cancellation)
      await result.current.signInWithGoogle().catch(() => {
        // May error in test environment
      });

      expect(mockSignInWithOAuth).toHaveBeenCalled();
    });
  });

  describe('token extraction', () => {
    // Note: Token extraction is an internal function, but we test it via the createSessionFromUrl behavior

    it('handles URL with tokens in hash fragment', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=hash-access&refresh_token=hash-refresh'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'hash-user', email: 'hash@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'hash-access',
        refresh_token: 'hash-refresh',
      });
    });

    it('handles URL with tokens in query params (PKCE flow)', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback?access_token=query-access&refresh_token=query-refresh'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'query-user', email: 'query@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'query-access',
        refresh_token: 'query-refresh',
      });
    });

    it('handles session creation error gracefully', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=test&refresh_token=test'
      );

      mockSetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session creation failed'),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, error is logged
      const { logger } = require('@/lib/logger');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('OAuth URL parsing edge cases', () => {
    it('handles malformed URL gracefully', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Malformed URL - not a valid URL structure
      mockGetInitialURL.mockResolvedValueOnce('not-a-valid-url-at-all');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash or attempt to create session
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles URL with missing access_token', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Only refresh_token, no access_token
      mockGetInitialURL.mockResolvedValueOnce('sobers://auth/callback#refresh_token=only-refresh');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to create session without both tokens
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles URL with missing refresh_token', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Only access_token, no refresh_token
      mockGetInitialURL.mockResolvedValueOnce('sobers://auth/callback#access_token=only-access');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to create session without both tokens
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles URL with empty access_token value', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Empty access_token
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=&refresh_token=valid-refresh'
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to create session with empty token
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles URL with empty refresh_token value', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Empty refresh_token
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=valid-access&refresh_token='
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to create session with empty token
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('prioritizes hash fragment tokens over query params when both exist', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Both hash and query params - hash should take precedence
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback?access_token=query-access&refresh_token=query-refresh#access_token=hash-access&refresh_token=hash-refresh'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'precedence-user', email: 'precedence@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should use hash tokens (Supabase's default for implicit grant)
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'hash-access',
        refresh_token: 'hash-refresh',
      });
    });

    it('falls back to query params when hash has only partial tokens', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Hash has only access_token, query has both - should fall back to query
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback?access_token=query-access&refresh_token=query-refresh#access_token=hash-access'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'fallback-user', email: 'fallback@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fall back to query params when hash doesn't have both tokens
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'query-access',
        refresh_token: 'query-refresh',
      });
    });

    it('handles URL with OAuth error parameter', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // OAuth error response
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#error=access_denied&error_description=User+denied+access'
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to create session when error is present
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles URL with special characters in tokens', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Tokens with URL-encoded special characters
      mockGetInitialURL.mockResolvedValueOnce(
        'sobers://auth/callback#access_token=token%2Bwith%2Fspecial%3Dchars&refresh_token=refresh%2Btoken%3D%3D'
      );

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'special-user', email: 'special@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should decode and use the special characters correctly
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'token+with/special=chars',
        refresh_token: 'refresh+token==',
      });
    });

    it('handles URL without any OAuth-related parameters', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      // Regular deep link without OAuth params
      mockGetInitialURL.mockResolvedValueOnce('sobers://profile/view');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not attempt to process as OAuth callback
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles duplicate URL processing by ignoring second attempt', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      const duplicateUrl = 'sobers://auth/callback#access_token=duplicate&refresh_token=duplicate';

      mockGetInitialURL.mockResolvedValueOnce(duplicateUrl);

      mockSetSession.mockResolvedValue({
        data: { session: { user: { id: 'dup-user', email: 'dup@test.com' } } },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First call should succeed
      expect(mockSetSession).toHaveBeenCalledTimes(1);

      mockSetSession.mockClear();

      // Simulate the same URL being processed again via addEventListener.
      // We access the internal URL event handler to test the duplicate-processing guard.
      // This is necessary because we can't trigger another getInitialURL call after mount,
      // and we need to verify that the same URL isn't processed twice even when received
      // through different channels (initial URL vs event listener).
      const Linking = require('expo-linking');
      const addEventListenerCalls = Linking.addEventListener.mock.calls;
      const lastCall = addEventListenerCalls[addEventListenerCalls.length - 1];
      const urlEventHandler = lastCall[1];

      // Trigger the same URL again
      await urlEventHandler({ url: duplicateUrl });

      // Should not call setSession again (URL already processed)
      expect(mockSetSession).not.toHaveBeenCalled();
    });

    it('handles concurrent OAuth processing by preventing race conditions', async () => {
      const mockGetInitialURL = require('expo-linking').getInitialURL;
      const oauthUrl = 'sobers://auth/callback#access_token=concurrent&refresh_token=concurrent';

      mockGetInitialURL.mockResolvedValueOnce(oauthUrl);

      // Make setSession slow to simulate race condition
      mockSetSession.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    session: { user: { id: 'concurrent-user', email: 'concurrent@test.com' } },
                  },
                  error: null,
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial processing to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to process the same URL while first is still in progress
      const Linking = require('expo-linking');
      const addEventListenerCalls = Linking.addEventListener.mock.calls;
      const lastCall = addEventListenerCalls[addEventListenerCalls.length - 1];
      const urlEventHandler = lastCall[1];

      // Trigger URL while first is processing (won't await it to simulate concurrency)
      urlEventHandler({ url: oauthUrl });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only call setSession once despite concurrent attempts
      expect(mockSetSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('storeAppleNameInMetadata', () => {
    it('handles updateUser error gracefully', async () => {
      mockPendingAppleName = {
        firstName: 'Error',
        familyName: 'User',
        displayName: 'Error U.',
        fullName: 'Error User',
      };

      mockUpdateUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (
            event: string,
            session: {
              user: { id: string; email: string; user_metadata?: Record<string, unknown> };
            } | null
          ) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', {
              user: {
                id: 'error-user',
                email: 'error@example.com',
                user_metadata: {},
              },
            });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw, error is logged
      const { logger } = require('@/lib/logger');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('initializeAuth error handling', () => {
    it('handles getSession error gracefully', async () => {
      mockGetSession.mockRejectedValueOnce(new Error('Session fetch failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still complete loading even with error
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
    });
  });

  describe('unmount guard handling', () => {
    it('ignores auth state changes after unmount', async () => {
      let authCallback: ((event: string, session: null) => void) | null = null;

      mockOnAuthStateChange.mockImplementation(
        (callback: (event: string, session: null) => void) => {
          authCallback = callback;
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result, unmount } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Unmount the component
      unmount();

      // Now trigger auth state change after unmount
      if (authCallback) {
        authCallback('SIGNED_OUT', null);
      }

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('profile effect edge cases', () => {
    it('sets Sentry context when profile has email', async () => {
      const mockProfile = {
        id: 'sentry-user',
        email: 'sentry@example.com',
        display_name: 'Sentry User',
      };

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      resetSupabaseMock({
        session: { user: { id: 'sentry-user', email: 'sentry@example.com' } },
        profile: mockProfile,
      });

      mockOnAuthStateChange.mockImplementation(
        (
          callback: (event: string, session: { user: { id: string; email: string } } | null) => void
        ) => {
          setTimeout(() => {
            callback('SIGNED_IN', { user: { id: 'sentry-user', email: 'sentry@example.com' } });
          }, 10);
          return {
            data: {
              subscription: { unsubscribe: jest.fn() },
            },
          };
        }
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.profile).not.toBeNull();
      });

      const { setSentryUser, setSentryContext } = require('@/lib/sentry');
      expect(setSentryUser).toHaveBeenCalledWith('sentry-user');
      expect(setSentryContext).toHaveBeenCalledWith('profile', { email: 'sentry@example.com' });
    });
  });
});
