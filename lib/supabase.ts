import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logger, LogCategory } from '@/lib/logger';
import { CHUNK_SIZE, CHUNK_COUNT_SUFFIX } from '@/lib/supabase-constants';

// Re-export constants for backward compatibility
export { CHUNK_SIZE, CHUNK_COUNT_SUFFIX } from '@/lib/supabase-constants';

// Environment variables for the Supabase client.
// NOTE:
// - These are intentionally read at module load *without* immediate validation.
// - Validation happens lazily when the Supabase client is first created/used.
// This pattern is required so tools like Playwright can discover/list E2E tests
// without needing these environment variables to be set at test-discovery time.
// - During test discovery, it is acceptable for these variables to be undefined
//   because no Supabase client is created.
// - During test execution, missing variables will be validated and will cause an
//   error when the Supabase client is first created/used (e.g. in getSupabaseClient()).
// If you change this behavior (e.g. by validating eagerly at import time),
// ensure you do not break E2E test discovery.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Check if we're in a browser/client environment (not SSR/Node.js)
const isClient = typeof window !== 'undefined';

// Define the storage interface expected by Supabase Auth
interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// =============================================================================
// Chunked SecureStore Utilities
// =============================================================================

/**
 * Generates the key for a specific chunk index.
 *
 * @param baseKey - The original storage key
 * @param index - The chunk index (0-based)
 * @returns The chunk key in format `{baseKey}_chunk_{index}`
 */
function getChunkKey(baseKey: string, index: number): string {
  return `${baseKey}_chunk_${index}`;
}

/**
 * Reads a potentially chunked value from SecureStore.
 * Handles both legacy non-chunked values and new chunked format.
 *
 * @param key - The storage key
 * @returns The reassembled value, or null if not found
 */
async function getChunkedSecureStoreValue(key: string): Promise<string | null> {
  // First, check if this is a chunked value by looking for the chunk count
  const chunkCountStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);

  if (chunkCountStr) {
    // This is a chunked value - reassemble from chunks
    const chunkCount = parseInt(chunkCountStr, 10);
    if (isNaN(chunkCount) || chunkCount <= 0) {
      logger.warn('Invalid chunk count in SecureStore', {
        category: LogCategory.STORAGE,
        key,
        chunkCountStr,
      });
      return null;
    }

    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(getChunkKey(key, i));
      if (chunk === null) {
        logger.warn('Missing chunk in SecureStore', {
          category: LogCategory.STORAGE,
          key,
          chunkIndex: i,
          totalChunks: chunkCount,
        });
        return null;
      }
      chunks.push(chunk);
    }

    return chunks.join('');
  }

  // Not chunked - try to read as a single value (legacy format)
  return SecureStore.getItemAsync(key);
}

/**
 * Stores a value in SecureStore, chunking if necessary.
 * Values <= CHUNK_SIZE are stored directly; larger values are split into chunks.
 *
 * @param key - The storage key
 * @param value - The value to store
 */
async function setChunkedSecureStoreValue(key: string, value: string): Promise<void> {
  // First, clean up any existing chunks to prevent orphaned data
  await removeChunkedSecureStoreValue(key);

  if (value.length <= CHUNK_SIZE) {
    // Small enough to store directly
    await SecureStore.setItemAsync(key, value);
    return;
  }

  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  // Store the chunk count first
  await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, chunks.length.toString());

  // Store each chunk
  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(getChunkKey(key, index), chunk))
  );
}

/**
 * Removes a value from SecureStore, including all chunks if chunked.
 *
 * @param key - The storage key
 */
async function removeChunkedSecureStoreValue(key: string): Promise<void> {
  // Check if this is a chunked value
  const chunkCountStr = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`);

  if (chunkCountStr) {
    const chunkCount = parseInt(chunkCountStr, 10);
    if (!isNaN(chunkCount) && chunkCount > 0) {
      // Remove all chunks
      const deletePromises = [];
      for (let i = 0; i < chunkCount; i++) {
        deletePromises.push(SecureStore.deleteItemAsync(getChunkKey(key, i)));
      }
      deletePromises.push(SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`));
      await Promise.allSettled(deletePromises);
    }
  }

  // Also try to delete the key itself (handles legacy non-chunked values)
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore - key may not exist
  }
}

// =============================================================================
// Supabase Storage Adapter
// =============================================================================

export const SupabaseStorageAdapter: AuthStorage = {
  getItem: async (key: string) => {
    if (!isClient) {
      // During SSR, return null (no session)
      return null;
    }
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    // Try SecureStore first (with chunking support)
    try {
      const secureValue = await getChunkedSecureStoreValue(key);
      if (secureValue) {
        return secureValue;
      }
    } catch (error) {
      // Log error but continue to check AsyncStorage - preserves session if SecureStore has issues
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to read session from SecureStore - checking legacy storage', err, {
        category: LogCategory.AUTH,
      });
    }

    // Fallback to AsyncStorage for migration (legacy insecure storage)
    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue) {
      // Migrate to SecureStore (with chunking support)
      try {
        await setChunkedSecureStoreValue(key, asyncValue);
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
      await setChunkedSecureStoreValue(key, value);
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
      removeChunkedSecureStoreValue(key),
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
    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error(
        'Missing Supabase environment variables during client initialization. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are configured in your environment.'
      );
    }
    supabaseInstance = createClient(supabaseUrl, supabasePublishableKey, {
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
