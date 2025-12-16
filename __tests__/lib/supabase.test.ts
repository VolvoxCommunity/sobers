// Unmock the module we are testing
jest.unmock('@/lib/supabase');

describe('lib/supabase', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.com';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('throws error if EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    expect(() => require('@/lib/supabase')).toThrow('Missing Supabase environment variables');
  });

  it('throws error if EXPO_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '';
    expect(() => require('@/lib/supabase')).toThrow('Missing Supabase environment variables');
  });

  describe('Supabase Client Initialization', () => {
    it('initializes Supabase client with correct config on native', () => {
      const { Platform } = require('react-native');
      Platform.OS = 'ios';
      const { createClient } = require('@supabase/supabase-js');
      const { supabase } = require('@/lib/supabase');

      const _ = supabase.auth;

      expect(createClient).toHaveBeenCalledWith(
        'https://example.com',
        'anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          }),
        })
      );
    });
  });

  describe('SupabaseStorageAdapter', () => {
    let storageAdapter: any;

    const getStorageAdapter = () => {
      const { createClient } = require('@supabase/supabase-js');
      const { supabase } = require('@/lib/supabase');
      const _ = supabase.auth; // Trigger init
      const call = createClient.mock.calls.find((call: any[]) => call[0] === 'https://example.com');
      return call[2].auth.storage;
    };

    it('handles storage operations correctly during SSR (node env)', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      jest.isolateModules(() => {
        storageAdapter = getStorageAdapter();
      });

      await expect(storageAdapter.getItem('key')).resolves.toBeNull();
      await expect(storageAdapter.setItem('key', 'value')).resolves.toBeUndefined();
      await expect(storageAdapter.removeItem('key')).resolves.toBeUndefined();

      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('uses SecureStore on Native Client', async () => {
      const SecureStore = require('expo-secure-store');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const { Platform } = require('react-native');

      global.window = {} as any;
      Platform.OS = 'ios';

      jest.isolateModules(() => {
        storageAdapter = getStorageAdapter();
      });

      // SecureStore.getItemAsync returns null, so it falls back to AsyncStorage migration
      // For this test, we simulate value found in SecureStore
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-value');

      await expect(storageAdapter.getItem('key')).resolves.toBe('stored-value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('key');

      await storageAdapter.setItem('key', 'value');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');

      await storageAdapter.removeItem('key');
      // removeItem now uses Promise.allSettled to attempt both
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key');

      delete (global as any).window;
    });

    it('uses localStorage on Web Client', async () => {
      const { Platform } = require('react-native');
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      global.window = {} as any;
      global.localStorage = mockLocalStorage as any;

      Platform.OS = 'web';

      jest.isolateModules(() => {
        storageAdapter = getStorageAdapter();
      });

      mockLocalStorage.getItem.mockReturnValue('web-stored');

      await expect(storageAdapter.getItem('key')).resolves.toBe('web-stored');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('key');

      await storageAdapter.setItem('key', 'value');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key', 'value');

      await storageAdapter.removeItem('key');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('key');

      delete (global as any).window;
      delete (global as any).localStorage;
    });
  });

  describe('Proxy Behavior', () => {
    it('proxies function calls binding context', () => {
      const { createClient } = require('@supabase/supabase-js');

      const mockSignOut = jest.fn();
      createClient.mockReturnValue({
        auth: {
          signOut: mockSignOut,
        },
      });

      const { supabase } = require('@/lib/supabase');

      supabase.auth.signOut();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('proxies property access', () => {
      const { createClient } = require('@supabase/supabase-js');
      createClient.mockReturnValue({
        someProp: 123,
      });

      const { supabase } = require('@/lib/supabase');

      expect((supabase as any).someProp).toBe(123);
    });
  });
});
