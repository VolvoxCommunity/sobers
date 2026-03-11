/**
 * @fileoverview Tests for lib/crypto.ts
 *
 * Tests the AES-GCM encryption utility including:
 * - Key generation and management (ensureEncryptionKey)
 * - Text encryption (encryptText)
 * - Text decryption (decryptText)
 * - Key rotation (rotateEncryptionKey)
 * - Key deletion and cleanup
 * - Error handling and edge cases
 */

// =============================================================================
// Mocks
// =============================================================================

const mockGenerate = jest.fn();
const mockImport = jest.fn();
const mockEncoded = jest.fn();
const mockAesEncryptAsync = jest.fn();
const mockAesDecryptAsync = jest.fn();
const mockCombined = jest.fn();
const mockFromCombined = jest.fn();

jest.mock('expo-crypto', () => ({
  AESKeySize: { AES256: 256 },
  AESEncryptionKey: {
    generate: (...args: unknown[]) => mockGenerate(...args),
    import: (...args: unknown[]) => mockImport(...args),
  },
  AESSealedData: {
    fromCombined: (...args: unknown[]) => mockFromCombined(...args),
  },
  aesEncryptAsync: (...args: unknown[]) => mockAesEncryptAsync(...args),
  aesDecryptAsync: (...args: unknown[]) => mockAesDecryptAsync(...args),
}));

const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();
const mockDeleteItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...args),
}));

const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    warn: jest.fn(),
  },
  LogCategory: {
    STORAGE: 'storage',
  },
}));

const mockCaptureSentryException = jest.fn();

jest.mock('@/lib/sentry', () => ({
  captureSentryException: (...args: unknown[]) => mockCaptureSentryException(...args),
}));

// =============================================================================
// Helpers
// =============================================================================

/** Create a mock AESEncryptionKey object */
function createMockKey(base64Value = 'mock-key-base64') {
  return {
    encoded: jest.fn().mockResolvedValue(base64Value),
    bytes: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
}

/** Create a mock AESSealedData object */
function createMockSealedData(combinedValue = 'mock-combined-base64') {
  return {
    combined: jest.fn().mockResolvedValue(combinedValue),
    iv: jest.fn().mockResolvedValue('mock-iv'),
    ciphertext: jest.fn().mockResolvedValue('mock-ciphertext'),
    tag: jest.fn().mockResolvedValue('mock-tag'),
  };
}

/**
 * Convert a UTF-8 string to base64 (mirrors the implementation in crypto.ts).
 * Used to generate expected values in tests.
 */
function textToBase64(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Crypto Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Default mock implementations
    mockGetItemAsync.mockResolvedValue(null);
    mockSetItemAsync.mockResolvedValue(undefined);
    mockDeleteItemAsync.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------------------
  // ensureEncryptionKey
  // ---------------------------------------------------------------------------

  describe('ensureEncryptionKey', () => {
    it('generates a new key when none exists in SecureStore', async () => {
      const mockKey = createMockKey('new-key-base64');
      mockGenerate.mockResolvedValue(mockKey);
      mockGetItemAsync.mockResolvedValue(null);

      const { ensureEncryptionKey } = require('@/lib/crypto');
      const result = await ensureEncryptionKey();

      expect(result).toBe(true);
      expect(mockGenerate).toHaveBeenCalledWith(256);
      expect(mockSetItemAsync).toHaveBeenCalledWith('sobers_aes_encryption_key', 'new-key-base64');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'New encryption key generated and stored',
        expect.objectContaining({ category: 'storage' })
      );
    });

    it('loads existing key from SecureStore without generating a new one', async () => {
      const mockKey = createMockKey('existing-key-base64');
      mockGetItemAsync.mockResolvedValue('existing-key-base64');
      mockImport.mockResolvedValue(mockKey);

      const { ensureEncryptionKey } = require('@/lib/crypto');
      const result = await ensureEncryptionKey();

      expect(result).toBe(true);
      expect(mockImport).toHaveBeenCalledWith('existing-key-base64', 'base64');
      expect(mockGenerate).not.toHaveBeenCalled();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Encryption key loaded from SecureStore',
        expect.objectContaining({ category: 'storage' })
      );
    });

    it('returns true immediately if key is already cached', async () => {
      // First call: generate and cache
      const mockKey = createMockKey('cached-key-base64');
      mockGenerate.mockResolvedValue(mockKey);
      mockGetItemAsync.mockResolvedValue(null);

      const { ensureEncryptionKey } = require('@/lib/crypto');
      await ensureEncryptionKey();

      // Reset mocks to verify no store access on second call
      jest.clearAllMocks();

      const result = await ensureEncryptionKey();

      expect(result).toBe(true);
      expect(mockGetItemAsync).not.toHaveBeenCalled();
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('returns false and logs error when key generation fails', async () => {
      const genError = new Error('Key generation failed');
      mockGetItemAsync.mockResolvedValue(null);
      mockGenerate.mockRejectedValue(genError);

      const { ensureEncryptionKey } = require('@/lib/crypto');
      const result = await ensureEncryptionKey();

      expect(result).toBe(false);
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to ensure encryption key',
        genError,
        expect.objectContaining({ category: 'storage' })
      );
      expect(mockCaptureSentryException).toHaveBeenCalledWith(genError, {
        context: 'crypto:ensureEncryptionKey',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // encryptText
  // ---------------------------------------------------------------------------

  describe('encryptText', () => {
    it('encrypts plaintext and returns combined base64 blob', async () => {
      // Set up key
      const mockKey = createMockKey('test-key');
      mockGetItemAsync.mockResolvedValue('test-key');
      mockImport.mockResolvedValue(mockKey);

      // Set up encryption result
      const mockSealed = createMockSealedData('encrypted-combined-base64');
      mockAesEncryptAsync.mockResolvedValue(mockSealed);

      const { ensureEncryptionKey, encryptText } = require('@/lib/crypto');
      await ensureEncryptionKey();

      const result = await encryptText('Hello, recovery journal!');

      expect(result).toBe('encrypted-combined-base64');
      expect(mockAesEncryptAsync).toHaveBeenCalledWith(
        textToBase64('Hello, recovery journal!'),
        mockKey,
        { nonce: { length: 12 }, tagLength: 16 }
      );
      expect(mockSealed.combined).toHaveBeenCalledWith('base64');
    });

    it('throws when no encryption key exists', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const { encryptText } = require('@/lib/crypto');

      await expect(encryptText('test')).rejects.toThrow(
        'No encryption key found. Call ensureEncryptionKey() before encrypting or decrypting.'
      );
    });

    it('handles empty string encryption', async () => {
      const mockKey = createMockKey('test-key');
      mockGetItemAsync.mockResolvedValue('test-key');
      mockImport.mockResolvedValue(mockKey);

      const mockSealed = createMockSealedData('encrypted-empty');
      mockAesEncryptAsync.mockResolvedValue(mockSealed);

      const { ensureEncryptionKey, encryptText } = require('@/lib/crypto');
      await ensureEncryptionKey();

      const result = await encryptText('');

      expect(result).toBe('encrypted-empty');
      expect(mockAesEncryptAsync).toHaveBeenCalledWith(
        textToBase64(''),
        mockKey,
        expect.any(Object)
      );
    });

    it('handles unicode text encryption', async () => {
      const mockKey = createMockKey('test-key');
      mockGetItemAsync.mockResolvedValue('test-key');
      mockImport.mockResolvedValue(mockKey);

      const mockSealed = createMockSealedData('encrypted-unicode');
      mockAesEncryptAsync.mockResolvedValue(mockSealed);

      const { ensureEncryptionKey, encryptText } = require('@/lib/crypto');
      await ensureEncryptionKey();

      const unicodeText = 'Recovery is possible! \u2764\uFE0F \u{1F64F} \u00E9\u00E8\u00EA';
      const result = await encryptText(unicodeText);

      expect(result).toBe('encrypted-unicode');
      expect(mockAesEncryptAsync).toHaveBeenCalledWith(
        textToBase64(unicodeText),
        mockKey,
        expect.any(Object)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // decryptText
  // ---------------------------------------------------------------------------

  describe('decryptText', () => {
    it('decrypts combined base64 blob back to plaintext', async () => {
      const mockKey = createMockKey('test-key');
      mockGetItemAsync.mockResolvedValue('test-key');
      mockImport.mockResolvedValue(mockKey);

      const originalText = 'My private journal entry';
      const mockRestoredSealed = { id: 'restored-sealed' };
      mockFromCombined.mockReturnValue(mockRestoredSealed);
      mockAesDecryptAsync.mockResolvedValue(textToBase64(originalText));

      const { ensureEncryptionKey, decryptText } = require('@/lib/crypto');
      await ensureEncryptionKey();

      const result = await decryptText('encrypted-combined-base64');

      expect(result).toBe(originalText);
      expect(mockFromCombined).toHaveBeenCalledWith('encrypted-combined-base64');
      expect(mockAesDecryptAsync).toHaveBeenCalledWith(mockRestoredSealed, mockKey, {
        output: 'base64',
      });
    });

    it('throws when no encryption key exists', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const { decryptText } = require('@/lib/crypto');

      await expect(decryptText('some-encrypted-data')).rejects.toThrow(
        'No encryption key found. Call ensureEncryptionKey() before encrypting or decrypting.'
      );
    });

    it('decrypts unicode text correctly', async () => {
      const mockKey = createMockKey('test-key');
      mockGetItemAsync.mockResolvedValue('test-key');
      mockImport.mockResolvedValue(mockKey);

      const unicodeText = 'Grateful for sobriety \u2764\uFE0F';
      const mockRestoredSealed = { id: 'sealed' };
      mockFromCombined.mockReturnValue(mockRestoredSealed);
      mockAesDecryptAsync.mockResolvedValue(textToBase64(unicodeText));

      const { ensureEncryptionKey, decryptText } = require('@/lib/crypto');
      await ensureEncryptionKey();

      const result = await decryptText('encrypted-data');

      expect(result).toBe(unicodeText);
    });
  });

  // ---------------------------------------------------------------------------
  // decryptTextWithKey
  // ---------------------------------------------------------------------------

  describe('decryptTextWithKey', () => {
    it('decrypts using a specific base64 key', async () => {
      const mockKey = createMockKey('specific-key');
      mockImport.mockResolvedValue(mockKey);

      const originalText = 'Data from old key';
      const mockRestoredSealed = { id: 'sealed' };
      mockFromCombined.mockReturnValue(mockRestoredSealed);
      mockAesDecryptAsync.mockResolvedValue(textToBase64(originalText));

      const { decryptTextWithKey } = require('@/lib/crypto');
      const result = await decryptTextWithKey('encrypted-data', 'old-key-base64');

      expect(result).toBe(originalText);
      expect(mockImport).toHaveBeenCalledWith('old-key-base64', 'base64');
      expect(mockAesDecryptAsync).toHaveBeenCalledWith(mockRestoredSealed, mockKey, {
        output: 'base64',
      });
    });

    it('propagates decryption errors', async () => {
      const mockKey = createMockKey('bad-key');
      mockImport.mockResolvedValue(mockKey);

      mockFromCombined.mockReturnValue({ id: 'sealed' });
      mockAesDecryptAsync.mockRejectedValue(new Error('Authentication failed'));

      const { decryptTextWithKey } = require('@/lib/crypto');

      await expect(decryptTextWithKey('bad-data', 'wrong-key')).rejects.toThrow(
        'Authentication failed'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // rotateEncryptionKey
  // ---------------------------------------------------------------------------

  describe('rotateEncryptionKey', () => {
    it('rotates key and preserves previous key', async () => {
      // Current key in store
      const oldKey = createMockKey('old-key-base64');
      mockGetItemAsync.mockResolvedValue('old-key-base64');
      mockImport.mockResolvedValue(oldKey);

      // New key
      const newKey = createMockKey('new-key-base64');
      mockGenerate.mockResolvedValue(newKey);

      const { rotateEncryptionKey } = require('@/lib/crypto');
      const result = await rotateEncryptionKey();

      expect(result).toEqual({
        success: true,
        previousKeyBase64: 'old-key-base64',
      });

      // Previous key should be stored
      expect(mockSetItemAsync).toHaveBeenCalledWith('sobers_aes_previous_key', 'old-key-base64');

      // New key should be stored
      expect(mockSetItemAsync).toHaveBeenCalledWith('sobers_aes_encryption_key', 'new-key-base64');

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Encryption key rotated successfully',
        expect.objectContaining({
          category: 'storage',
          hadPreviousKey: true,
        })
      );
    });

    it('handles rotation when no previous key exists', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const newKey = createMockKey('first-key-base64');
      mockGenerate.mockResolvedValue(newKey);

      const { rotateEncryptionKey } = require('@/lib/crypto');
      const result = await rotateEncryptionKey();

      expect(result).toEqual({
        success: true,
        previousKeyBase64: null,
      });

      // Should NOT store previous key (there was none)
      expect(mockSetItemAsync).not.toHaveBeenCalledWith(
        'sobers_aes_previous_key',
        expect.any(String)
      );
    });

    it('returns failure and logs error on rotation error', async () => {
      const rotationError = new Error('SecureStore write failed');
      mockGetItemAsync.mockResolvedValue(null);
      mockGenerate.mockRejectedValue(rotationError);

      const { rotateEncryptionKey } = require('@/lib/crypto');
      const result = await rotateEncryptionKey();

      expect(result).toEqual({
        success: false,
        previousKeyBase64: null,
      });
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to rotate encryption key',
        rotationError,
        expect.objectContaining({ category: 'storage' })
      );
      expect(mockCaptureSentryException).toHaveBeenCalledWith(rotationError, {
        context: 'crypto:rotateEncryptionKey',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getPreviousKeyBase64
  // ---------------------------------------------------------------------------

  describe('getPreviousKeyBase64', () => {
    it('returns the previous key from SecureStore', async () => {
      mockGetItemAsync.mockImplementation((key: string) => {
        if (key === 'sobers_aes_previous_key') {
          return Promise.resolve('previous-key-base64');
        }
        return Promise.resolve(null);
      });

      const { getPreviousKeyBase64 } = require('@/lib/crypto');
      const result = await getPreviousKeyBase64();

      expect(result).toBe('previous-key-base64');
      expect(mockGetItemAsync).toHaveBeenCalledWith('sobers_aes_previous_key');
    });

    it('returns null when no previous key exists', async () => {
      mockGetItemAsync.mockResolvedValue(null);

      const { getPreviousKeyBase64 } = require('@/lib/crypto');
      const result = await getPreviousKeyBase64();

      expect(result).toBeNull();
    });

    it('returns null and logs error on SecureStore failure', async () => {
      const storeError = new Error('SecureStore read failed');
      mockGetItemAsync.mockRejectedValue(storeError);

      const { getPreviousKeyBase64 } = require('@/lib/crypto');
      const result = await getPreviousKeyBase64();

      expect(result).toBeNull();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to retrieve previous encryption key',
        storeError,
        expect.objectContaining({ category: 'storage' })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // clearPreviousKey
  // ---------------------------------------------------------------------------

  describe('clearPreviousKey', () => {
    it('deletes the previous key from SecureStore', async () => {
      const { clearPreviousKey } = require('@/lib/crypto');
      await clearPreviousKey();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('sobers_aes_previous_key');
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Previous encryption key cleared',
        expect.objectContaining({ category: 'storage' })
      );
    });

    it('logs error and reports to Sentry on failure', async () => {
      const deleteError = new Error('Delete failed');
      mockDeleteItemAsync.mockRejectedValue(deleteError);

      const { clearPreviousKey } = require('@/lib/crypto');
      await clearPreviousKey();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to clear previous encryption key',
        deleteError,
        expect.objectContaining({ category: 'storage' })
      );
      expect(mockCaptureSentryException).toHaveBeenCalledWith(deleteError, {
        context: 'crypto:clearPreviousKey',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteEncryptionKey
  // ---------------------------------------------------------------------------

  describe('deleteEncryptionKey', () => {
    it('deletes both current and previous keys from SecureStore', async () => {
      const { deleteEncryptionKey } = require('@/lib/crypto');
      await deleteEncryptionKey();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('sobers_aes_encryption_key');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('sobers_aes_previous_key');
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Encryption key deleted',
        expect.objectContaining({ category: 'storage' })
      );
    });

    it('clears the cached key', async () => {
      // First, ensure a key is cached
      const mockKey = createMockKey('cached-key');
      mockGenerate.mockResolvedValue(mockKey);
      mockGetItemAsync.mockResolvedValue(null);

      const { ensureEncryptionKey, deleteEncryptionKey, encryptText } = require('@/lib/crypto');

      await ensureEncryptionKey();

      // Delete the key
      await deleteEncryptionKey();

      // Now encryptText should fail because cached key was cleared
      mockGetItemAsync.mockResolvedValue(null);

      await expect(encryptText('test')).rejects.toThrow('No encryption key found');
    });

    it('logs error and reports to Sentry on failure', async () => {
      const deleteError = new Error('SecureStore delete failed');
      mockDeleteItemAsync.mockRejectedValue(deleteError);

      const { deleteEncryptionKey } = require('@/lib/crypto');
      await deleteEncryptionKey();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to delete encryption key',
        deleteError,
        expect.objectContaining({ category: 'storage' })
      );
      expect(mockCaptureSentryException).toHaveBeenCalledWith(deleteError, {
        context: 'crypto:deleteEncryptionKey',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // clearCachedKey
  // ---------------------------------------------------------------------------

  describe('clearCachedKey', () => {
    it('clears the in-memory cached key', async () => {
      // Cache a key first
      const mockKey = createMockKey('cached-key');
      mockGenerate.mockResolvedValue(mockKey);
      mockGetItemAsync.mockResolvedValue(null);

      const { ensureEncryptionKey, clearCachedKey } = require('@/lib/crypto');
      await ensureEncryptionKey();

      // Clear mock to track subsequent calls
      jest.clearAllMocks();

      clearCachedKey();

      // Next ensureEncryptionKey should try loading from store
      mockGetItemAsync.mockResolvedValue(null);
      mockGenerate.mockResolvedValue(createMockKey('new-key'));

      await ensureEncryptionKey();

      // Should have accessed SecureStore again since cache was cleared
      expect(mockGetItemAsync).toHaveBeenCalledWith('sobers_aes_encryption_key');
    });
  });

  // ---------------------------------------------------------------------------
  // Round-trip (encrypt + decrypt)
  // ---------------------------------------------------------------------------

  describe('round-trip encryption', () => {
    it('encrypt then decrypt returns original text', async () => {
      const originalText = 'Step 4: Made a searching and fearless moral inventory.';

      // Set up key
      const mockKey = createMockKey('round-trip-key');
      mockGetItemAsync.mockResolvedValue('round-trip-key');
      mockImport.mockResolvedValue(mockKey);

      // Encrypt returns a combined blob
      const mockSealed = createMockSealedData('encrypted-blob');
      mockAesEncryptAsync.mockResolvedValue(mockSealed);

      // Decrypt reconstructs sealed data and returns the original base64
      const mockRestoredSealed = { id: 'restored' };
      mockFromCombined.mockReturnValue(mockRestoredSealed);
      mockAesDecryptAsync.mockResolvedValue(textToBase64(originalText));

      const { ensureEncryptionKey, encryptText, decryptText } = require('@/lib/crypto');

      await ensureEncryptionKey();
      const encrypted = await encryptText(originalText);
      const decrypted = await decryptText(encrypted);

      expect(decrypted).toBe(originalText);
    });
  });
});
