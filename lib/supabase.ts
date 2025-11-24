import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are configured in your environment.'
  );
}

// Check if we're in a browser/client environment (not SSR/Node.js)
const isClient = typeof window !== 'undefined';

const SupabaseStorageAdapter = {
  getItem: (key: string) => {
    if (!isClient) {
      // During SSR, return null (no session)
      return Promise.resolve(null);
    }
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!isClient) {
      // During SSR, no-op
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!isClient) {
      // During SSR, no-op
      return Promise.resolve();
    }
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};

// Singleton pattern for lazy initialization on client-side only
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: SupabaseStorageAdapter as any,
        autoRefreshToken: isClient,
        persistSession: isClient,
        detectSessionInUrl: isClient && Platform.OS === 'web',
      },
    });
  }
  return supabaseInstance;
}

// Export as a getter to ensure lazy initialization
export const supabase = getSupabaseClient();
