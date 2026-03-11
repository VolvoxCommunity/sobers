import {
  AESEncryptionKey,
  AESSealedData,
  aesEncryptAsync,
  aesDecryptAsync,
  AESKeySize,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { logger, LogCategory } from '@/lib/logger';
import { captureSentryException } from '@/lib/sentry';

// =============================================================================
// Types & Interfaces
// =============================================================================

/** Result of a key rotation operation */
interface KeyRotationResult {
  /** Whether the rotation completed successfully */
  success: boolean;
  /** Previous key exported as base64 (for re-encrypting existing data) */
  previousKeyBase64: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** SecureStore key for the primary AES encryption key */
const ENCRYPTION_KEY_STORE_KEY = 'sobers_aes_encryption_key';

/** SecureStore key for the previous key (retained during rotation) */
const PREVIOUS_KEY_STORE_KEY = 'sobers_aes_previous_key';

// =============================================================================
// Module State
// =============================================================================

/** Cached AES key to avoid repeated SecureStore reads */
let cachedKey: AESEncryptionKey | null = null;

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Convert a UTF-8 string to a base64 string for encryption input.
 *
 * @param text - The plaintext string to encode
 * @returns Base64-encoded representation of the UTF-8 string
 */
function textToBase64(text: string): string {
  // TextEncoder produces UTF-8 bytes, then we convert to base64
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  return uint8ArrayToBase64(bytes);
}

/**
 * Convert a Uint8Array to a base64 string.
 *
 * @param bytes - The byte array to encode
 * @returns Base64-encoded string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string back to a UTF-8 string.
 *
 * @param base64 - The base64-encoded string
 * @returns Decoded UTF-8 string
 */
function base64ToText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Load the encryption key from SecureStore and cache it.
 *
 * @returns The AES encryption key, or null if none exists
 */
async function loadKeyFromStore(): Promise<AESEncryptionKey | null> {
  try {
    const storedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORE_KEY);
    if (!storedKey) {
      return null;
    }

    const key = await AESEncryptionKey.import(storedKey, 'base64');
    cachedKey = key;
    return key;
  } catch (error) {
    logger.error('Failed to load encryption key from SecureStore', error as Error, {
      category: LogCategory.STORAGE,
    });
    captureSentryException(error as Error, { context: 'crypto:loadKeyFromStore' });
    return null;
  }
}

/**
 * Get the current encryption key, loading from cache or SecureStore.
 *
 * @returns The AES encryption key
 * @throws Error if no key exists (call ensureEncryptionKey first)
 */
async function getKey(): Promise<AESEncryptionKey> {
  if (cachedKey) {
    return cachedKey;
  }

  const key = await loadKeyFromStore();
  if (!key) {
    throw new Error(
      'No encryption key found. Call ensureEncryptionKey() before encrypting or decrypting.'
    );
  }

  return key;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Ensure an encryption key exists, generating one if needed.
 * Call this on app startup or after user login.
 *
 * @returns true if a key is ready for use
 *
 * @example
 * ```typescript
 * // In app initialization
 * await ensureEncryptionKey();
 * ```
 */
export async function ensureEncryptionKey(): Promise<boolean> {
  try {
    // Check cache first
    if (cachedKey) {
      return true;
    }

    // Try loading from SecureStore
    const existingKey = await loadKeyFromStore();
    if (existingKey) {
      logger.debug('Encryption key loaded from SecureStore', {
        category: LogCategory.STORAGE,
      });
      return true;
    }

    // Generate a new key
    const newKey = await AESEncryptionKey.generate(AESKeySize.AES256);
    const keyBase64 = await newKey.encoded('base64');
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE_KEY, keyBase64);
    cachedKey = newKey;

    logger.info('New encryption key generated and stored', {
      category: LogCategory.STORAGE,
    });
    return true;
  } catch (error) {
    logger.error('Failed to ensure encryption key', error as Error, {
      category: LogCategory.STORAGE,
    });
    captureSentryException(error as Error, { context: 'crypto:ensureEncryptionKey' });
    return false;
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded combined blob (IV + ciphertext + authentication tag).
 *
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded combined sealed data
 * @throws Error if no encryption key exists or encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = await encryptText('My private journal entry');
 * // Store `encrypted` in the database
 * ```
 */
export async function encryptText(plaintext: string): Promise<string> {
  const key = await getKey();

  // Convert plaintext to base64 for the encryption API
  const plaintextBase64 = textToBase64(plaintext);

  const sealed = await aesEncryptAsync(plaintextBase64, key, {
    nonce: { length: 12 },
    tagLength: 16,
  });

  // Return combined format: IV + ciphertext + tag as a single base64 string
  const combined = await sealed.combined('base64');
  return combined;
}

/**
 * Decrypt a base64-encoded combined blob back to a plaintext string.
 *
 * @param encryptedCombined - Base64-encoded combined sealed data (from encryptText)
 * @returns The decrypted plaintext string
 * @throws Error if no encryption key exists or decryption fails
 *
 * @example
 * ```typescript
 * const plaintext = await decryptText(storedEncryptedData);
 * ```
 */
export async function decryptText(encryptedCombined: string): Promise<string> {
  const key = await getKey();

  // Reconstruct sealed data from the combined base64 blob
  const sealed = AESSealedData.fromCombined(encryptedCombined);

  // Decrypt to base64 (the plaintext was encoded as base64 before encryption)
  const decryptedBase64 = await aesDecryptAsync(sealed, key, { output: 'base64' });

  // Convert base64 back to UTF-8 string
  return base64ToText(decryptedBase64);
}

/**
 * Decrypt using a specific key (useful during key rotation to re-encrypt data).
 *
 * @param encryptedCombined - Base64-encoded combined sealed data
 * @param keyBase64 - Base64-encoded AES key to decrypt with
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails
 */
export async function decryptTextWithKey(
  encryptedCombined: string,
  keyBase64: string
): Promise<string> {
  const key = await AESEncryptionKey.import(keyBase64, 'base64');
  const sealed = AESSealedData.fromCombined(encryptedCombined);
  const decryptedBase64 = await aesDecryptAsync(sealed, key, { output: 'base64' });
  return base64ToText(decryptedBase64);
}

/**
 * Rotate the encryption key. Generates a new key and stores the previous one
 * so existing data can be re-encrypted.
 *
 * After rotation:
 * 1. New encryptions use the new key
 * 2. Use `getPreviousKeyBase64()` to get the old key for re-encrypting existing data
 * 3. Call `clearPreviousKey()` once all data has been re-encrypted
 *
 * @returns Result indicating success and the previous key
 *
 * @example
 * ```typescript
 * const result = await rotateEncryptionKey();
 * if (result.success && result.previousKeyBase64) {
 *   // Re-encrypt all stored data
 *   for (const entry of entries) {
 *     const plaintext = await decryptTextWithKey(entry.data, result.previousKeyBase64);
 *     entry.data = await encryptText(plaintext);
 *   }
 *   await clearPreviousKey();
 * }
 * ```
 */
export async function rotateEncryptionKey(): Promise<KeyRotationResult> {
  try {
    // Export current key before rotation
    let previousKeyBase64: string | null = null;
    const currentKey = await loadKeyFromStore();
    if (currentKey) {
      previousKeyBase64 = await currentKey.encoded('base64');
      await SecureStore.setItemAsync(PREVIOUS_KEY_STORE_KEY, previousKeyBase64);
    }

    // Generate and store new key
    const newKey = await AESEncryptionKey.generate(AESKeySize.AES256);
    const newKeyBase64 = await newKey.encoded('base64');
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORE_KEY, newKeyBase64);
    cachedKey = newKey;

    logger.info('Encryption key rotated successfully', {
      category: LogCategory.STORAGE,
      hadPreviousKey: previousKeyBase64 !== null,
    });

    return { success: true, previousKeyBase64 };
  } catch (error) {
    logger.error('Failed to rotate encryption key', error as Error, {
      category: LogCategory.STORAGE,
    });
    captureSentryException(error as Error, { context: 'crypto:rotateEncryptionKey' });
    return { success: false, previousKeyBase64: null };
  }
}

/**
 * Get the previous encryption key (retained after rotation).
 *
 * @returns Base64-encoded previous key, or null if none exists
 */
export async function getPreviousKeyBase64(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PREVIOUS_KEY_STORE_KEY);
  } catch (error) {
    logger.error('Failed to retrieve previous encryption key', error as Error, {
      category: LogCategory.STORAGE,
    });
    return null;
  }
}

/**
 * Clear the previous encryption key after all data has been re-encrypted.
 * Call this once key rotation is complete.
 */
export async function clearPreviousKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PREVIOUS_KEY_STORE_KEY);
    logger.debug('Previous encryption key cleared', {
      category: LogCategory.STORAGE,
    });
  } catch (error) {
    logger.error('Failed to clear previous encryption key', error as Error, {
      category: LogCategory.STORAGE,
    });
    captureSentryException(error as Error, { context: 'crypto:clearPreviousKey' });
  }
}

/**
 * Delete the encryption key entirely.
 * WARNING: This will make all previously encrypted data unrecoverable.
 * Only use for account deletion or data reset scenarios.
 */
export async function deleteEncryptionKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORE_KEY);
    await SecureStore.deleteItemAsync(PREVIOUS_KEY_STORE_KEY);
    cachedKey = null;

    logger.info('Encryption key deleted', {
      category: LogCategory.STORAGE,
    });
  } catch (error) {
    logger.error('Failed to delete encryption key', error as Error, {
      category: LogCategory.STORAGE,
    });
    captureSentryException(error as Error, { context: 'crypto:deleteEncryptionKey' });
  }
}

/**
 * Clear the cached key from memory.
 * Useful on logout to ensure the key is re-loaded from SecureStore on next use.
 */
export function clearCachedKey(): void {
  cachedKey = null;
}
