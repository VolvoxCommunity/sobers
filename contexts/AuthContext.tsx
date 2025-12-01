import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import * as WebBrowser from 'expo-web-browser';
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
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      const nameParts = user.user_metadata?.full_name?.split(' ') || ['User', 'U'];
      const firstName = nameParts[0] || 'User';
      const lastInitial = nameParts[nameParts.length - 1]?.[0] || 'U';

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || '',
        first_name: firstName,
        last_initial: lastInitial.toUpperCase(),
        timezone: DEVICE_TIMEZONE,
      });

      if (profileError) throw profileError;
    }
  };

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
     * Only processes changes after initial load is complete to avoid race conditions.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only set loading for state changes after initial load
        if (initialLoadComplete) {
          setLoading(true);
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

      logger.debug('Google Auth redirect URL configured', {
        category: LogCategory.AUTH,
        redirectUrl,
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
        logger.debug('Opening Google Auth browser session', {
          category: LogCategory.AUTH,
          // Note: Not logging data.url to avoid exposing OAuth state parameters
        });
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        logger.debug('Google Auth browser result received', {
          category: LogCategory.AUTH,
          resultType: result.type,
        });

        if (result.type === 'success' && result.url) {
          logger.debug('Google Auth redirect received', {
            category: LogCategory.AUTH,
            // Note: Not logging result.url to avoid exposing OAuth tokens
          });

          const url = new URL(result.url);

          // Try extracting from hash
          const hashParams = new URLSearchParams(url.hash.substring(1)); // Remove leading #

          logger.debug('Google Auth parsing redirect tokens', {
            category: LogCategory.AUTH,
            hasQueryAccessToken: !!url.searchParams.get('access_token'),
            hasQueryRefreshToken: !!url.searchParams.get('refresh_token'),
            hasHashAccessToken: !!hashParams.get('access_token'),
            hasHashRefreshToken: !!hashParams.get('refresh_token'),
            // Note: Not logging url.hash to avoid exposing OAuth tokens
          });

          let access_token = url.searchParams.get('access_token');
          let refresh_token = url.searchParams.get('refresh_token');

          if (!access_token || !refresh_token) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
          }

          if (access_token && refresh_token) {
            logger.debug('Google Auth tokens extracted, creating session', {
              category: LogCategory.AUTH,
            });
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

            logger.info('Google Auth session created successfully', {
              category: LogCategory.AUTH,
            });

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

      // Create new profile with email and timezone (name collected during onboarding)
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
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
