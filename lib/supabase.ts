import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// Check if we're running on-device (native) or in a real browser (web).
// React Native does not have SSR, so native is always "client".
// Web can run in SSR/Node.js, where `window` is undefined.
const isClient =
  Platform.OS !== 'web' ||
  (typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined');

/**
 * Access localStorage safely without relying on global identifiers (SSR-safe).
 *
 * @returns localStorage if available; otherwise null.
 */
function getWebLocalStorage(): Storage | null {
  try {
    const storage = (globalThis as any)?.localStorage as Storage | undefined;
    return storage ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// SecureStore Chunking (iOS 2048-byte value limit)
// =============================================================================

/**
 * iOS SecureStore has a strict per-value size limit (commonly 2048 bytes).
 * Supabase sessions can exceed this limit (JWTs + user metadata), causing writes
 * to throw and auth persistence to break.
 *
 * We mitigate this by chunking large values across multiple SecureStore keys and
 * storing a small "meta" marker at the original key.
 */
const SECURE_STORE_IOS_VALUE_LIMIT_BYTES = 2048;

/**
 * Conservative chunk size (in characters) to stay well under iOS SecureStore's
 * 2048-byte limit even with minor overhead.
 *
 * Note: Supabase session JSON is ASCII-heavy, so char slicing is sufficiently safe.
 */
const SECURE_STORE_CHUNK_SIZE_CHARS = 1024;

/**
 * Prefix stored at the original key when a value is chunked.
 *
 * Format: `${CHUNK_META_PREFIX}${chunkCount}`
 */
const CHUNK_META_PREFIX = '__secure_store_chunked_v1__:';

/**
 * Computes a best-effort UTF-8 byte length for a string.
 *
 * @param value - The string to measure.
 * @returns Byte length (UTF-8) if available, otherwise a conservative fallback.
 */
function getUtf8ByteLength(value: string): number {
  try {
    // TextEncoder is available in modern JS runtimes (including Node 18+ and RN Hermes/JSC in Expo).
    return new TextEncoder().encode(value).length;
  } catch {
    // Fallback: character length (safe for ASCII-heavy JSON, conservative in practice here).
    return value.length;
  }
}

/**
 * Builds the SecureStore key used for a specific chunk index.
 *
 * @param key - The base key requested by Supabase.
 * @param index - Chunk index (0-based).
 * @returns Derived key for the chunk.
 */
function getChunkKey(key: string, index: number): string {
  return `${key}::chunk:${index}`;
}

/**
 * Splits a string into fixed-size character chunks.
 *
 * @param value - The string to chunk.
 * @param chunkSizeChars - Chunk size in characters.
 * @returns Array of chunk strings.
 */
function splitIntoChunks(value: string, chunkSizeChars: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += chunkSizeChars) {
    chunks.push(value.slice(i, i + chunkSizeChars));
  }
  return chunks;
}

/**
 * Parses a chunk meta marker value into a chunk count.
 *
 * @param value - Stored value at the base key.
 * @returns Chunk count if this is a chunk meta marker; otherwise null.
 */
function parseChunkMeta(value: string): number | null {
  if (!value.startsWith(CHUNK_META_PREFIX)) return null;
  const raw = value.slice(CHUNK_META_PREFIX.length);
  const count = Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : null;
}

/**
 * Best-effort cleanup of chunk keys for a chunked value.
 *
 * @param key - Base key.
 * @param chunkCount - Number of chunks to delete.
 */
async function deleteChunkKeys(key: string, chunkCount: number): Promise<void> {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      SecureStore.deleteItemAsync(getChunkKey(key, i)).catch(() => undefined)
    )
  );
}

// Define the storage interface expected by Supabase Auth
interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const SupabaseStorageAdapter: AuthStorage = {
  getItem: async (key: string) => {
    if (!isClient) {
      // During SSR, return null (no session)
      return null;
    }
    if (Platform.OS === 'web') {
      return getWebLocalStorage()?.getItem(key) ?? null;
    }

    try {
      const stored = await SecureStore.getItemAsync(key);
      if (!stored) return null;

      const chunkCount = parseChunkMeta(stored);
      if (!chunkCount) return stored;

      const chunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(getChunkKey(key, i)))
      );

      // If any chunk is missing, treat as no session to avoid returning corrupt JSON.
      if (chunks.some((c) => c == null)) {
        logger.warn('SecureStore chunk missing; returning null session', {
          category: LogCategory.STORAGE,
          key,
          chunkCount,
        });
        return null;
      }

      return chunks.join('');
    } catch (error) {
      logger.error('Failed to read from SecureStore', error as Error, {
        category: LogCategory.STORAGE,
        key,
      });
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (!isClient) {
      // During SSR, no-op
      return;
    }
    if (Platform.OS === 'web') {
      getWebLocalStorage()?.setItem(key, value);
      return;
    }

    try {
      // If there's an existing chunked value, clean it up first (best-effort).
      const existing = await SecureStore.getItemAsync(key);
      const existingChunkCount = existing ? parseChunkMeta(existing) : null;
      if (existingChunkCount) {
        await deleteChunkKeys(key, existingChunkCount);
      }

      // iOS SecureStore has a per-value limit; chunk values that exceed it.
      const valueBytes = getUtf8ByteLength(value);
      const shouldChunk = Platform.OS === 'ios' && valueBytes > SECURE_STORE_IOS_VALUE_LIMIT_BYTES;

      if (!shouldChunk) {
        await SecureStore.setItemAsync(key, value);
        return;
      }

      const chunks = splitIntoChunks(value, SECURE_STORE_CHUNK_SIZE_CHARS);

      // Write chunks first, then atomically "commit" by writing the meta marker to the base key.
      await Promise.all(
        chunks.map((chunk, index) => SecureStore.setItemAsync(getChunkKey(key, index), chunk))
      );
      await SecureStore.setItemAsync(key, `${CHUNK_META_PREFIX}${chunks.length}`);
    } catch (error) {
      // Never throw from the storage adapter: Supabase Auth may treat it as a fatal persistence error.
      logger.error('Failed to persist auth session to SecureStore', error as Error, {
        category: LogCategory.STORAGE,
        key,
        platform: Platform.OS,
      });
    }
  },
  removeItem: async (key: string) => {
    if (!isClient) {
      // During SSR, no-op
      return;
    }
    if (Platform.OS === 'web') {
      getWebLocalStorage()?.removeItem(key);
      return;
    }

    try {
      const existing = await SecureStore.getItemAsync(key);
      const existingChunkCount = existing ? parseChunkMeta(existing) : null;
      if (existingChunkCount) {
        await deleteChunkKeys(key, existingChunkCount);
      }
    } catch (error) {
      logger.warn('Failed to inspect SecureStore value for chunk cleanup', {
        category: LogCategory.STORAGE,
        key,
        platform: Platform.OS,
        error: (error as Error)?.message,
      });
    } finally {
      await SecureStore.deleteItemAsync(key);
    }
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
