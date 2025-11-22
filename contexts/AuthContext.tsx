import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { setSentryUser, clearSentryUser, setSentryContext } from '@/lib/sentry';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastInitial: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  /**
   * Creates a profile for a new OAuth user if one doesn't exist
   * Extracts first name and last initial from user metadata
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
      });

      if (profileError) throw profileError;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Set loading to true when session exists to prevent routing with incomplete data
      if (session?.user) {
        setLoading(true);
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await createOAuthProfileIfNeeded(session.user);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update Sentry context when profile changes
  useEffect(() => {
    if (profile) {
      setSentryUser(profile.id, profile.role);
      setSentryContext('profile', {
        role: profile.role,
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
        scheme: 'twelvesteptracker',
        path: 'auth/callback',
      });

      console.log('[Google Auth] Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log('[Google Auth] Opening browser with URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        console.log('[Google Auth] Browser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('[Google Auth] Full redirect URL:', result.url);

          const url = new URL(result.url);

          // Log what's in query params
          console.log(
            '[Google Auth] Query params access_token:',
            url.searchParams.get('access_token')
          );
          console.log(
            '[Google Auth] Query params refresh_token:',
            url.searchParams.get('refresh_token')
          );

          // Log what's in the hash/fragment
          console.log('[Google Auth] URL hash:', url.hash);

          // Try extracting from hash
          const hashParams = new URLSearchParams(url.hash.substring(1)); // Remove leading #
          console.log('[Google Auth] Hash access_token:', hashParams.get('access_token'));
          console.log('[Google Auth] Hash refresh_token:', hashParams.get('refresh_token'));

          const access_token = url.searchParams.get('access_token');
          const refresh_token = url.searchParams.get('refresh_token');

          if (access_token && refresh_token) {
            console.log('[Google Auth] Tokens found in query params, setting session');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error('[Google Auth] setSession error:', sessionError);
              throw sessionError;
            }

            console.log('[Google Auth] Session created successfully');

            if (sessionData.user) {
              await createOAuthProfileIfNeeded(sessionData.user);
            }
          } else {
            console.warn('[Google Auth] No tokens found in query params');
          }
        }
      }
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastInitial: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        first_name: firstName,
        last_initial: lastInitial.toUpperCase(),
      });
      if (profileError) {
        // Profile creation failed - the user account exists but is incomplete
        // Could attempt to delete the user, but auth.admin.deleteUser requires service role
        console.error('Profile creation failed for user', data.user.id, profileError);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
