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

    it('returns null if neither has value (native)', async () => {
      const key = 'test-key';

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await SupabaseStorageAdapter.getItem(key);

      expect(result).toBeNull();
    });
  });

  describe('setItem', () => {
    it('uses SecureStore on native', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await SupabaseStorageAdapter.setItem(key, value);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(key, value);
    });
  });

  describe('removeItem', () => {
    it('removes from SecureStore AND AsyncStorage on native', async () => {
      const key = 'test-key';

      await SupabaseStorageAdapter.removeItem(key);

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });
});
