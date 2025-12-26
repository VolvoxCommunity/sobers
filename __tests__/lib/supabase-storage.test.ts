/**
 * @jest-environment jsdom
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CHUNK_SIZE, CHUNK_COUNT_SUFFIX } from '@/lib/supabase-constants';

// Unmock lib/supabase so we get the real adapter logic
jest.unmock('@/lib/supabase');

// Set up environment variables for Supabase
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';

/**
 * Helper to generate chunk key (matches lib/supabase.ts)
 */
function getChunkKey(baseKey: string, index: number): string {
  return `${baseKey}_chunk_${index}`;
}

/**
 * Helper to create a string of specified length
 */
function createLargeValue(length: number): string {
  return 'x'.repeat(length);
}

describe('SupabaseStorageAdapter', () => {
  let SupabaseStorageAdapter: any;

  beforeAll(() => {
    // Require the module after mocking expo-constants
    const mod = require('@/lib/supabase');
    SupabaseStorageAdapter = mod.SupabaseStorageAdapter;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to default resolved values
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    // Default to iOS for these tests
    Platform.OS = 'ios';
  });

  describe('getItem', () => {
    it('uses localStorage on web', async () => {
      Platform.OS = 'web';
      const key = 'test-key';
      const value = 'test-value';

      const getItemSpy = jest
        .spyOn(window.localStorage.__proto__, 'getItem')
        .mockReturnValue(value);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      expect(getItemSpy).toHaveBeenCalledWith(key);

      getItemSpy.mockRestore();
    });

    it('returns value from SecureStore if present (native)', async () => {
      const key = 'test-key';
      const value = 'secure-value';

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
        if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return null; // Not chunked
        if (k === key) return value;
        return null;
      });

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('migrates from AsyncStorage if SecureStore is empty (native)', async () => {
      const key = 'test-key';
      const value = 'legacy-value';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(value);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);

      // Verification of migration - small value stored directly
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('returns value and logs error when migration to SecureStore fails (native)', async () => {
      const key = 'test-key';
      const value = 'legacy-value';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(value);
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore write failed')
      );

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
      // AsyncStorage.removeItem should NOT be called since SecureStore write failed
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('returns null if neither has value (native)', async () => {
      const key = 'test-key';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBeNull();
    });

    it('falls back to AsyncStorage when SecureStore read fails (native)', async () => {
      const key = 'test-key';
      const value = 'legacy-value';

      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore read failed')
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(value);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('returns null when both SecureStore read fails and AsyncStorage is empty (native)', async () => {
      const key = 'test-key';

      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore read failed')
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBeNull();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
    });
  });

  describe('setItem', () => {
    it('uses localStorage on web', async () => {
      Platform.OS = 'web';
      const key = 'test-key';
      const value = 'test-value';

      const setItemSpy = jest
        .spyOn(window.localStorage.__proto__, 'setItem')
        .mockImplementation(() => {});

      await SupabaseStorageAdapter.setItem(key, value);

      expect(setItemSpy).toHaveBeenCalledWith(key, value);
      setItemSpy.mockRestore();
    });

    it('uses SecureStore on native for small values', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await SupabaseStorageAdapter.setItem(key, value);

      // Small value stored directly (after cleanup check)
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
    });

    it('logs error but continues when SecureStore fails (native)', async () => {
      const key = 'test-key';
      const value = 'test-value';

      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore write failed')
      );

      // Should not throw
      await expect(SupabaseStorageAdapter.setItem(key, value)).resolves.toBeUndefined();
    });
  });

  describe('removeItem', () => {
    it('uses localStorage on web', async () => {
      Platform.OS = 'web';
      const key = 'test-key';

      const removeItemSpy = jest
        .spyOn(window.localStorage.__proto__, 'removeItem')
        .mockImplementation(() => {});

      await SupabaseStorageAdapter.removeItem(key);

      expect(removeItemSpy).toHaveBeenCalledWith(key);
      removeItemSpy.mockRestore();
    });

    it('removes from SecureStore AND AsyncStorage on native', async () => {
      const key = 'test-key';

      await SupabaseStorageAdapter.removeItem(key);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('continues to remove from AsyncStorage even if SecureStore fails (native)', async () => {
      const key = 'test-key';

      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore delete failed')
      );

      // Should not throw
      await expect(SupabaseStorageAdapter.removeItem(key)).resolves.toBeUndefined();

      // Both should still be called via Promise.allSettled
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('continues to remove from SecureStore even if AsyncStorage fails (native)', async () => {
      const key = 'test-key';

      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(
        new Error('AsyncStorage remove failed')
      );

      // Should not throw
      await expect(SupabaseStorageAdapter.removeItem(key)).resolves.toBeUndefined();

      // Both should still be called via Promise.allSettled
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });

  // =============================================================================
  // Chunked Storage Tests
  // =============================================================================

  describe('chunked storage (values > 2000 bytes)', () => {
    describe('setItem with large values', () => {
      it('chunks large values into multiple SecureStore entries', async () => {
        const key = 'large-key';
        // Create a value that requires 3 chunks (5500 bytes / 2000 = 2.75, rounds up to 3)
        const value = createLargeValue(5500);

        await SupabaseStorageAdapter.setItem(key, value);

        // Should store chunk count
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`, '3');

        // Should store 3 chunks
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 0),
          value.slice(0, CHUNK_SIZE)
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 1),
          value.slice(CHUNK_SIZE, CHUNK_SIZE * 2)
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 2),
          value.slice(CHUNK_SIZE * 2)
        );
      });

      it('stores values exactly at CHUNK_SIZE without chunking', async () => {
        const key = 'exact-key';
        const value = createLargeValue(CHUNK_SIZE);

        await SupabaseStorageAdapter.setItem(key, value);

        // Should store directly without chunking
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
        // Should NOT store chunk count
        expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
          `${key}${CHUNK_COUNT_SUFFIX}`,
          expect.any(String)
        );
      });

      it('chunks values just over CHUNK_SIZE', async () => {
        const key = 'just-over-key';
        const value = createLargeValue(CHUNK_SIZE + 1);

        await SupabaseStorageAdapter.setItem(key, value);

        // Should store chunk count of 2
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`, '2');
        // Should store 2 chunks
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 0),
          value.slice(0, CHUNK_SIZE)
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 1),
          value.slice(CHUNK_SIZE)
        );
      });

      it('cleans up existing chunks before storing new value', async () => {
        const key = 'overwrite-key';
        const smallValue = 'small';

        // Simulate existing chunked value with 2 chunks
        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return '2';
          return null;
        });

        await SupabaseStorageAdapter.setItem(key, smallValue);

        // Should delete old chunks
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(getChunkKey(key, 0));
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(getChunkKey(key, 1));
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`);

        // Should store new small value directly
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, smallValue);
      });
    });

    describe('getItem with chunked values', () => {
      it('reassembles chunked values from multiple SecureStore entries', async () => {
        const key = 'chunked-key';
        const chunk0 = createLargeValue(CHUNK_SIZE);
        const chunk1 = createLargeValue(CHUNK_SIZE);
        const chunk2 = createLargeValue(500);
        const expectedValue = chunk0 + chunk1 + chunk2;

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return '3';
          if (k === getChunkKey(key, 0)) return chunk0;
          if (k === getChunkKey(key, 1)) return chunk1;
          if (k === getChunkKey(key, 2)) return chunk2;
          return null;
        });

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBe(expectedValue);
      });

      it('returns null if a chunk is missing', async () => {
        const key = 'missing-chunk-key';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return '3';
          if (k === getChunkKey(key, 0)) return 'chunk0';
          if (k === getChunkKey(key, 1)) return null; // Missing chunk!
          if (k === getChunkKey(key, 2)) return 'chunk2';
          return null;
        });

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBeNull();
      });

      it('returns null for invalid chunk count', async () => {
        const key = 'invalid-count-key';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return 'not-a-number';
          return null;
        });

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBeNull();
      });

      it('returns null for zero chunk count', async () => {
        const key = 'zero-count-key';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return '0';
          return null;
        });

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBeNull();
      });

      it('reads legacy non-chunked values correctly', async () => {
        const key = 'legacy-key';
        const value = 'legacy-value';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return null; // No chunk count
          if (k === key) return value;
          return null;
        });

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBe(value);
      });
    });

    describe('removeItem with chunked values', () => {
      it('removes all chunks when removing a chunked value', async () => {
        const key = 'chunked-remove-key';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return '3';
          return null;
        });

        await SupabaseStorageAdapter.removeItem(key);

        // Should delete all 3 chunks + chunk count + base key
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(getChunkKey(key, 0));
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(getChunkKey(key, 1));
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(getChunkKey(key, 2));
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`);
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
        // Should also remove from AsyncStorage
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
      });

      it('removes legacy non-chunked values correctly', async () => {
        const key = 'legacy-remove-key';

        (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) => {
          if (k === `${key}${CHUNK_COUNT_SUFFIX}`) return null; // Not chunked
          return null;
        });

        await SupabaseStorageAdapter.removeItem(key);

        // Should delete base key + AsyncStorage
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
      });
    });

    describe('migration of large values from AsyncStorage', () => {
      it('migrates large values from AsyncStorage with chunking', async () => {
        const key = 'migrate-large-key';
        const largeValue = createLargeValue(4500); // Requires 3 chunks

        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(largeValue);

        const result = await SupabaseStorageAdapter.getItem(key);

        expect(result).toBe(largeValue);

        // Should store chunk count
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(`${key}${CHUNK_COUNT_SUFFIX}`, '3');

        // Should store 3 chunks
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 0),
          largeValue.slice(0, CHUNK_SIZE)
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 1),
          largeValue.slice(CHUNK_SIZE, CHUNK_SIZE * 2)
        );
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
          getChunkKey(key, 2),
          largeValue.slice(CHUNK_SIZE * 2)
        );

        // Should remove from AsyncStorage after successful migration
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
      });
    });
  });
});
