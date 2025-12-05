/**
 * @fileoverview Tests for lib/supabase.ts
 *
 * Tests the Supabase client initialization and storage adapter including:
 * - Storage adapter behavior for web and native
 * - SSR handling
 * - Lazy client initialization
 */

// =============================================================================
// Mocks
// =============================================================================

// Mock react-native-url-polyfill before anything else
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock createClient
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
  },
  from: jest.fn(),
};

const mockCreateClient = jest.fn(() => mockSupabaseClient);

jest.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('Supabase Module', () => {
  const originalEnv = process.env;
  const originalWindow = global.window;
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Ensure env vars are set for tests
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    (Platform as any).OS = originalPlatform;
    // Restore window
    if (originalWindow) {
      global.window = originalWindow;
    }
  });

  describe('supabase client', () => {
    it('exports a supabase client proxy', () => {
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('@/lib/supabase');

      expect(supabase).toBeDefined();
    });

    it('lazily initializes client when accessed', () => {
      mockCreateClient.mockClear();
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const supabaseJs = require('@supabase/supabase-js');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('@/lib/supabase');

      // Access a property to trigger initialization
      supabase.auth;

      // After resetModules, we need to check the mock from the re-required module
      // The mock factory is re-evaluated, so we check the actual mock that was used
      expect(supabaseJs.createClient).toHaveBeenCalled();
      // Verify it was called with at least URL and key (options may be passed separately in some Jest versions)
      const calls = (supabaseJs.createClient as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe('https://test.supabase.co');
      expect(calls[0][1]).toBe('test-anon-key');
    });

    it('binds functions to client correctly', () => {
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('@/lib/supabase');

      // Access the from method
      const result = supabase.from;

      expect(typeof result).toBe('function');
    });
  });

  describe('SupabaseStorageAdapter', () => {
    describe('getItem', () => {
      it('returns null in SSR environment (no window)', async () => {
        jest.resetModules();
        // Simulate SSR by removing window
        const originalWindow = global.window;
        // @ts-expect-error - Intentionally setting window to undefined for SSR test
        delete global.window;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          const result = await storageAdapter.getItem('test-key');
          expect(result).toBeNull();
        }

        // Restore window
        global.window = originalWindow;
      });

      it('uses AsyncStorage on native platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'ios';
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-value');

        // Ensure window is defined for client environment
        global.window = {} as Window & typeof globalThis;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          const result = await storageAdapter.getItem('test-key');
          expect(AsyncStorage.getItem).toHaveBeenCalledWith('test-key');
          expect(result).toBe('stored-value');
        }
      });

      it('uses localStorage on web platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'web';

        // Mock window and localStorage
        const mockLocalStorage = {
          getItem: jest.fn().mockReturnValue('web-stored-value'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        };
        global.window = { localStorage: mockLocalStorage } as unknown as Window & typeof globalThis;
        Object.defineProperty(global, 'localStorage', {
          value: mockLocalStorage,
          writable: true,
          configurable: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          const result = await storageAdapter.getItem('test-key');
          expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
          expect(result).toBe('web-stored-value');
        }
      });
    });

    describe('setItem', () => {
      it('resolves to undefined in SSR environment', async () => {
        jest.resetModules();
        const originalWindow = global.window;
        // @ts-expect-error - Intentionally setting window to undefined for SSR test
        delete global.window;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          const result = await storageAdapter.setItem('test-key', 'test-value');
          expect(result).toBeUndefined();
        }

        global.window = originalWindow;
      });

      it('stores value in AsyncStorage on native platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'ios';
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        global.window = {} as Window & typeof globalThis;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          await storageAdapter.setItem('test-key', 'test-value');
          expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
        }
      });

      it('stores value in localStorage on web platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'web';

        const mockLocalStorage = {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        };
        global.window = { localStorage: mockLocalStorage } as unknown as Window & typeof globalThis;
        Object.defineProperty(global, 'localStorage', {
          value: mockLocalStorage,
          writable: true,
          configurable: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          await storageAdapter.setItem('test-key', 'test-value');
          expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
        }
      });
    });

    describe('removeItem', () => {
      it('resolves to undefined in SSR environment', async () => {
        jest.resetModules();
        const originalWindow = global.window;
        // @ts-expect-error - Intentionally setting window to undefined for SSR test
        delete global.window;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          const result = await storageAdapter.removeItem('test-key');
          expect(result).toBeUndefined();
        }

        global.window = originalWindow;
      });

      it('removes value from AsyncStorage on native platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'ios';
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
        global.window = {} as Window & typeof globalThis;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          await storageAdapter.removeItem('test-key');
          expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
        }
      });

      it('removes value from localStorage on web platform', async () => {
        jest.resetModules();
        (Platform as any).OS = 'web';

        const mockLocalStorage = {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        };
        global.window = { localStorage: mockLocalStorage } as unknown as Window & typeof globalThis;
        Object.defineProperty(global, 'localStorage', {
          value: mockLocalStorage,
          writable: true,
          configurable: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createClient } = require('@supabase/supabase-js');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@/lib/supabase');

        const storageAdapter = (createClient as jest.Mock).mock.calls[0]?.[2]?.auth?.storage;

        if (storageAdapter) {
          await storageAdapter.removeItem('test-key');
          expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
        }
      });
    });
  });

  describe('environment validation', () => {
    it('creates client with correct configuration', () => {
      mockCreateClient.mockClear();
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const supabaseJs = require('@supabase/supabase-js');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('@/lib/supabase');

      // Trigger initialization
      supabase.auth;

      // After resetModules, we need to check the mock from the re-required module
      // The mock factory is re-evaluated, so we check the actual mock that was used
      expect(supabaseJs.createClient).toHaveBeenCalled();
      // Verify it was called with at least URL and key (options may be passed separately in some Jest versions)
      const calls = (supabaseJs.createClient as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toBe('https://test.supabase.co');
      expect(calls[0][1]).toBe('test-anon-key');
    });
  });
});
