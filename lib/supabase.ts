import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logger, LogCategory } from '@/lib/logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are configured in your environment.'
  );
}

// Check if we're in a browser/client environment (not SSR/Node.js)
const isClient = typeof window !== 'undefined';

// Define the storage interface expected by Supabase Auth
interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export const SupabaseStorageAdapter: AuthStorage = {
  getItem: async (key: string) => {
    if (!isClient) {
      // During SSR, return null (no session)
      return null;
    }
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    // Try SecureStore first (new secure storage)
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) {
      return secureValue;
    }

    // Fallback to AsyncStorage for migration (legacy insecure storage)
    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue) {
      // Migrate to SecureStore
      try {
        await SecureStore.setItemAsync(key, asyncValue);
        // Only remove from AsyncStorage after successful SecureStore write
        await AsyncStorage.removeItem(key);
      } catch (error) {
        // Log error but continue with the value we found
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          'Session migration to secure storage failed - session will remain functional but may use less secure storage until next login',
          err,
          {
            category: LogCategory.AUTH,
          }
        );
      }
      return asyncValue;
    }

    return null;
  },
  setItem: async (key: string, value: string) => {
    if (!isClient) {
      // During SSR, no-op
      return;
    }
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      // Log error but don't throw - session will be lost on restart but app continues
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to save session to SecureStore', err, {
        category: LogCategory.AUTH,
      });
    }
  },
  removeItem: async (key: string) => {
    if (!isClient) {
      // During SSR, no-op
      return;
    }
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    // Remove from both storages independently to ensure cleanup even if one fails
    const results = await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
    // Log any failures but don't throw - logout should still proceed
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const store = index === 0 ? 'SecureStore' : 'AsyncStorage';
        const err =
          result.reason instanceof Error ? result.reason : new Error(String(result.reason));
        logger.error(`Failed to remove item from ${store}`, err, {
          category: LogCategory.AUTH,
        });
      }
    });
  },
};

// Singleton pattern for lazy initialization on client-side only
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: SupabaseStorageAdapter,
        autoRefreshToken: isClient,
        persistSession: isClient,
        detectSessionInUrl: isClient && Platform.OS === 'web',
      },
    });
  }
  return supabaseInstance;
}

// Export a Proxy to allow lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
