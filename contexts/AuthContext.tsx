import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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

  const fetchProfile = async (userId: string) => {
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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  /**
   * Creates a profile for a new OAuth user if one doesn't exist.
   * Extracts first name and last initial from user metadata and captures the device timezone.
   *
   * @param user - The authenticated user object from OAuth provider
   * @throws Error if profile creation fails
   */
  const createOAuthProfileIfNeeded = async (user: User): Promise<void> => {
    const { data: existingProfile, error: queryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (queryError) {
      logger.error('Failed to check for existing profile', queryError as Error, {
        category: LogCategory.DATABASE,
        userId: user.id,
      });
      // Don't throw - allow auth to continue even if profile check fails
      return;
    }

    if (!existingProfile) {
      // Extract name from OAuth metadata if available, otherwise leave null for onboarding
      const fullName = user.user_metadata?.full_name;
      const nameParts = fullName?.split(' ').filter(Boolean);
      const firstName = nameParts?.[0] || null;
      // Determine last initial:
      // - Multi-word names (e.g., "John Doe"): use first letter of last word → "D"
      // - Single-word names (e.g., "Madonna"): use first letter of first name → "M"
      // - No name: null (collected during onboarding)
      const lastName = nameParts && nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
      const lastInitial = lastName?.[0]?.toUpperCase() || firstName?.[0]?.toUpperCase() || null;

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || '',
        first_name: firstName,
        last_initial: lastInitial,
        timezone: DEVICE_TIMEZONE,
      });

      if (profileError) {
        logger.error('Failed to create OAuth profile', profileError as Error, {
          category: LogCategory.DATABASE,
          userId: user.id,
        });
        throw profileError;
      }
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

        // CRITICAL: Defer all async Supabase operations using setTimeout.
        // This breaks the synchronous callback chain and allows setSession()
        // to fully complete before we make any RLS-protected database queries.
        // Without this, Supabase client operations deadlock on iOS during OAuth.
        setTimeout(async () => {
          if (!isMountedRef.current) {
            return;
          }

          try {
            await createOAuthProfileIfNeeded(session.user);
            await fetchProfile(session.user.id);
          } catch (error) {
            logger.error('Auth state change handling failed', error as Error, {
              category: LogCategory.AUTH,
            });
          } finally {
            if (isMountedRef.current) {
              setLoading(false);
            }
          }
        }, 0);
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

  // Update Sentry context when profile changes
  useEffect(() => {
    if (profile) {
      setSentryUser(profile.id);
      setSentryContext('profile', {
        email: profile.email,
      });
    } else {
      clearSentryUser();
    }
  }, [profile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
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
        scheme: 'sobrietywaypoint',
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
          const url = new URL(result.url);

          let access_token = url.searchParams.get('access_token');
          let refresh_token = url.searchParams.get('refresh_token');

          // Fallback to hash fragment (Supabase's default for implicit grant)
          if (!access_token || !refresh_token) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
          }

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

            if (sessionData.user) {
              await createOAuthProfileIfNeeded(sessionData.user);
            }
          } else {
            logger.warn('Google Auth tokens not found in redirect', {
              category: LogCategory.AUTH,
            });
          }
        }
      }
    }
  };

  /**
   * Signs up a new user with email/password.
   * Creates a basic profile with email and timezone.
   * Name collection is handled during onboarding.
   * Checks if a profile already exists before attempting to create one.
   *
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if signup or profile creation fails
   */
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      // Check if profile already exists (could happen if user previously signed up)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (existingProfile) {
        // Profile already exists - this is OK, user might be re-signing up
        logger.info('Profile already exists for user', {
          category: LogCategory.AUTH,
          userId: data.user.id,
        });
        return;
      }

      // Create new profile with null name fields (collected during onboarding)
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        first_name: null,
        last_initial: null,
        timezone: DEVICE_TIMEZONE,
      });

      if (profileError) {
        // Profile creation failed - the user account exists but is incomplete
        // Could attempt to delete the user, but auth.admin.deleteUser requires service role
        logger.error('Profile creation failed during signup', profileError as Error, {
          category: LogCategory.DATABASE,
          userId: data.user.id,
        });
        throw new Error('Account created but profile setup failed. Please contact support.');
      }
    }
  };

  const signOut = async () => {
    clearSentryUser();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  /**
   * Permanently deletes the user's account from the database.
   * This calls a Supabase RPC function that deletes the user from auth.users,
   * which cascades to delete the profile and all related data.
   * After deletion, the user is signed out.
   *
   * @throws Error if the deletion fails
   */
  const deleteAccount = async () => {
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

    // Sign out first to clear session data and trigger auth state change
    await supabase.auth.signOut();

    // Clear local state and Sentry user
    // Order matters: clear user/session first so routing logic sees !user → login
    clearSentryUser();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

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
