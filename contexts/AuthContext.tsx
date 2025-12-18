import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { setSentryUser, clearSentryUser, setSentryContext } from '@/lib/sentry';
import { logger, LogCategory } from '@/lib/logger';
import { DEVICE_TIMEZONE } from '@/lib/date';
import {
  trackEvent,
  setUserId,
  setUserProperties,
  resetAnalytics,
  calculateDaysSoberBucket,
  AnalyticsEvents,
} from '@/lib/analytics';
import { getPendingAppleAuthName } from '@/lib/apple-auth-name';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  deleteAccount: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to track component mount status across re-renders (avoids closure issues)
  const isMountedRef = useRef(true);

  // Track processed URLs to avoid duplicate session creation
  const processedUrlsRef = useRef<Set<string>>(new Set());

  // Track if OAuth is currently being processed to prevent race conditions
  const isProcessingOAuthRef = useRef(false);

  /**
   * Extracts OAuth tokens from a URL's hash fragment or query params.
   * Supabase sends tokens in the hash (e.g., #access_token=...&refresh_token=...).
   *
   * @param url - The OAuth callback URL
   * @returns Object containing access_token and refresh_token, or nulls if not found
   */
  const extractTokensFromUrl = (
    url: string
  ): { access_token: string | null; refresh_token: string | null } => {
    try {
      const parsedUrl = new URL(url);

      // First try hash fragment (Supabase's default for implicit grant)
      if (parsedUrl.hash) {
        const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        if (hashAccessToken && hashRefreshToken) {
          return { access_token: hashAccessToken, refresh_token: hashRefreshToken };
        }
      }

      // Fallback to query params (for PKCE flow)
      const queryAccessToken = parsedUrl.searchParams.get('access_token');
      const queryRefreshToken = parsedUrl.searchParams.get('refresh_token');
      if (queryAccessToken && queryRefreshToken) {
        return { access_token: queryAccessToken, refresh_token: queryRefreshToken };
      }

      return { access_token: null, refresh_token: null };
    } catch {
      return { access_token: null, refresh_token: null };
    }
  };

  /**
   * Extracts OAuth tokens from a deep link URL and creates a Supabase session.
   * This handles the case where iOS delivers the OAuth redirect via Linking
   * instead of through WebBrowser.openAuthSessionAsync.
   *
   * @param url - The deep link URL containing OAuth tokens in hash or query params
   * @returns The created session, or null if tokens weren't found
   */
  const createSessionFromUrl = async (url: string): Promise<Session | null> => {
    // Skip if we've already processed this URL
    if (processedUrlsRef.current.has(url)) {
      return null;
    }

    // Skip if another OAuth flow is already processing
    if (isProcessingOAuthRef.current) {
      return null;
    }

    try {
      isProcessingOAuthRef.current = true;

      const { access_token, refresh_token } = extractTokensFromUrl(url);

      if (!access_token || !refresh_token) {
        return null;
      }

      // Mark this URL as processed before creating session
      processedUrlsRef.current.add(url);

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        logger.error('Failed to create session from deep link', error, {
          category: LogCategory.AUTH,
        });
        // Remove from processed so it can be retried
        processedUrlsRef.current.delete(url);
        return null;
      }

      // Note: Profile creation is handled by onAuthStateChange listener
      return data.session;
    } catch (error) {
      logger.error('Error processing OAuth deep link', error as Error, {
        category: LogCategory.AUTH,
      });
      return null;
    } finally {
      isProcessingOAuthRef.current = false;
    }
  };

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      logger.error('Profile fetch failed', error as Error, {
        category: LogCategory.DATABASE,
        userId: userId,
      });
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  /**
   * Stores pending Apple Sign In name data in Supabase user_metadata.
   * This preserves the name across sessions so it can be used during onboarding
   * even if the user closes the app before completing onboarding.
   *
   * Profile creation is now handled by onboarding.tsx using upsert.
   *
   * @param user - The authenticated user object
   */
  const storeAppleNameInMetadata = async (user: User): Promise<void> => {
    // Get pending Apple auth name data (set by AppleSignInButton before signInWithIdToken)
    const pendingAppleName = getPendingAppleAuthName();

    if (!pendingAppleName?.displayName) {
      return;
    }

    // Check if user_metadata already has the display_name
    if (user.user_metadata?.display_name) {
      return;
    }

    // Store the pending Apple name in user_metadata so it persists across sessions
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: pendingAppleName.displayName,
        full_name: pendingAppleName.fullName,
      },
    });

    if (error) {
      logger.warn('Failed to store Apple name in user metadata', {
        category: LogCategory.AUTH,
        error: error.message,
      });
    }
  };

  /**
   * Handle OAuth deep links when the app receives them via Linking.
   * This is critical for iOS where the OAuth redirect may arrive via deep link
   * instead of through WebBrowser.openAuthSessionAsync return value.
   *
   * Uses addEventListener for more reliable real-time event handling.
   */
  useEffect(() => {
    /**
     * Handles incoming deep link URLs containing OAuth tokens.
     */
    const handleDeepLink = async (event: { url: string }) => {
      const incomingUrl = event.url;

      // Only process URLs that look like OAuth callbacks
      if (
        !incomingUrl.includes('access_token') &&
        !incomingUrl.includes('refresh_token') &&
        !incomingUrl.includes('error')
      ) {
        return;
      }

      await createSessionFromUrl(incomingUrl);
    };

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Also check for initial URL (cold start case)
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Reset mount status on effect run
    isMountedRef.current = true;
    let initialLoadComplete = false;

    /**
     * Fetches initial session and profile on mount.
     * Sets loading to false once complete.
     */
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        logger.error('Auth initialization failed', error as Error, {
          category: LogCategory.AUTH,
        });
      } finally {
        if (isMountedRef.current) {
          initialLoadComplete = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    /**
     * Listens for auth state changes (sign in, sign out, token refresh).
     *
     * IMPORTANT: This callback is called SYNCHRONOUSLY during `setSession()`.
     * Making async Supabase calls directly inside this callback causes a deadlock
     * because the Supabase client hasn't finished applying the session internally.
     *
     * Solution: Use setTimeout to defer async operations until after `setSession` completes.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) {
        return;
      }

      // Update React state synchronously - this is safe
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Set loading for state changes after initial load
        if (initialLoadComplete) {
          setLoading(true);
        }

        // CRITICAL: Defer all async Supabase operations using queueMicrotask.
        // This breaks the synchronous callback chain and allows setSession()
        // to fully complete before we make any RLS-protected database queries.
        // Without this, Supabase client operations deadlock on iOS during OAuth.
        //
        // We use queueMicrotask here (rather than setTimeout(..., 0)) because:
        // - Microtasks execute after current sync code but before the next macrotask
        // - More semantically correct for breaking sync callback chains
        // - Slightly faster and more predictable timing
        queueMicrotask(async () => {
          if (!isMountedRef.current) {
            return;
          }

          try {
            // Store Apple name in user_metadata on sign-in events.
            // Profile creation is handled by onboarding.tsx - we don't create profiles here
            // to avoid having null entries in the database for users who don't complete onboarding.
            // - SIGNED_IN: User just authenticated (email/password or OAuth)
            // - INITIAL_SESSION: App restart recovering a stored session
            // Note: USER_UPDATED and TOKEN_REFRESHED are excluded as they're not sign-in events.
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              await storeAppleNameInMetadata(session.user);
              // Check mount status after async operation to avoid state updates on unmounted component
              if (!isMountedRef.current) return;
            }

            // fetchProfile runs for ALL events (SIGNED_IN, INITIAL_SESSION, USER_UPDATED, TOKEN_REFRESHED)
            // This ensures profile stays in sync even after email/metadata updates (USER_UPDATED event)
            await fetchProfile(session.user.id);
          } catch (error) {
            // Check mount status before logging to ensure we don't update state after unmount
            if (!isMountedRef.current) return;

            logger.error('Auth state change handling failed', error as Error, {
              category: LogCategory.AUTH,
            });
          } finally {
            if (isMountedRef.current) {
              setLoading(false);
            }
          }
        });
      } else {
        setProfile(null);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Update Sentry context and analytics when profile changes
  useEffect(() => {
    if (profile) {
      setSentryUser(profile.id);
      setSentryContext('profile', {
        email: profile.email,
      });

      // Set analytics user ID
      setUserId(profile.id);

      // Calculate and set days sober bucket if sobriety date exists
      if (profile.sobriety_date) {
        const sobrietyDate = new Date(profile.sobriety_date);
        const today = new Date();
        const daysSober = Math.floor(
          (today.getTime() - sobrietyDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        setUserProperties({
          days_sober_bucket: calculateDaysSoberBucket(daysSober),
        });
      }
    } else {
      clearSentryUser();
      setUserId(null);
    }
  }, [profile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Track successful login
    trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'email' });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } else {
      const redirectUrl = makeRedirectUri({
        scheme: 'sobers',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
          // showInRecents keeps the browser session visible in recent apps on iOS,
          // which helps ensure the OAuth redirect is properly captured
          showInRecents: true,
        });

        // Check if the deep link handler already created a session
        // This can happen on iOS when the redirect arrives via Linking
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          return; // Session was created by deep link handler, we're done
        }

        if (result.type === 'success' && result.url) {
          // Use the helper function to extract tokens consistently
          const { access_token, refresh_token } = extractTokensFromUrl(result.url);

          if (access_token && refresh_token) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              logger.error('Google Auth session creation failed', sessionError, {
                category: LogCategory.AUTH,
              });
              throw sessionError;
            }

            // Track successful Google sign in
            trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'google' });

            // Profile creation is handled by onAuthStateChange listener (line 350).
            // Calling it here would cause a race condition and potential deadlock
            // since setSession() hasn't fully completed yet.
          } else {
            logger.warn('Google Auth tokens not found in redirect', {
              category: LogCategory.AUTH,
            });
          }
        }
      }
    }
  }, []);

  /**
   * Signs up a new user with email/password.
   * Profile creation is handled by onboarding.tsx when the user completes the onboarding flow.
   * This ensures we don't have null profile entries for users who don't complete onboarding.
   *
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if signup fails
   */
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    // Track successful sign up
    trackEvent(AnalyticsEvents.AUTH_SIGN_UP, { method: 'email' });

    // Profile creation is handled by onboarding.tsx when user completes onboarding.
    // User will be routed to onboarding since profile doesn't exist yet.
  }, []);

  /**
   * Signs out the current user and clears all local state.
   * Uses 'local' scope to only terminate the current session (not other devices).
   *
   * Handles AuthSessionMissingError gracefully - if there's no session,
   * the desired outcome (user signed out) is already achieved.
   *
   * @throws Error if sign out fails for reasons other than missing session
   */
  const signOut = useCallback(async () => {
    // Track logout before clearing session
    trackEvent(AnalyticsEvents.AUTH_LOGOUT);
    await resetAnalytics();

    clearSentryUser();

    const { error } = await supabase.auth.signOut({ scope: 'local' });

    // AuthSessionMissingError means no session exists - which is the desired outcome.
    // Only throw for unexpected errors, not "already signed out" state.
    if (error && error.name !== 'AuthSessionMissingError') {
      logger.error('Sign out failed', error, {
        category: LogCategory.AUTH,
      });
      throw error;
    }

    // Always clear local state to ensure consistent UI
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  /**
   * Permanently deletes the user's account from the database.
   * This calls a Supabase RPC function that deletes the user from auth.users,
   * which cascades to delete the profile and all related data.
   * After deletion, the user is signed out.
   *
   * @throws Error if the deletion fails
   */
  const deleteAccount = useCallback(async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    logger.info('Account deletion initiated', {
      category: LogCategory.AUTH,
      userId: user.id,
    });

    // Call the RPC function to delete the user account
    const { error } = await supabase.rpc('delete_user_account');

    if (error) {
      logger.error('Account deletion failed', error as Error, {
        category: LogCategory.AUTH,
        userId: user.id,
      });
      throw error;
    }

    logger.info('Account deleted successfully', {
      category: LogCategory.AUTH,
    });

    // Sign out to clear session data - ignore AuthSessionMissingError since
    // account deletion may have already invalidated the session
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError && signOutError.name !== 'AuthSessionMissingError') {
      logger.warn('Sign out after account deletion failed', {
        category: LogCategory.AUTH,
        error: signOutError.message,
      });
      // Don't throw - account is already deleted, just continue to clear local state
    }

    // Clear local state and Sentry user
    // Order matters: clear user/session first so routing logic sees !user → login
    clearSentryUser();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
