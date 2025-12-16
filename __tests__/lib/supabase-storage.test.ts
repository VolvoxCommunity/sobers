/**
 * @jest-environment jsdom
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Unmock lib/supabase so we get the real adapter logic
jest.unmock('@/lib/supabase');

describe('SupabaseStorageAdapter', () => {
  let SupabaseStorageAdapter: any;

  beforeAll(() => {
    // Set env vars required by lib/supabase
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

    // Require the module after setting env vars
    // We use require because import is hoisted and runs before we can set env vars
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

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(value);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
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
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);

      // Verification of migration
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
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(key);
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

    it('should log error and return value when migration to SecureStore fails (native)', async () => {
      const key = 'test-key';
      const value = 'legacy-value';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(value);
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('SecureStore write failed')
      );

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBe(value);
      // Verify AsyncStorage.removeItem was NOT called since SecureStore write failed
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
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

    it('uses SecureStore on native', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await SupabaseStorageAdapter.setItem(key, value);

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
});
