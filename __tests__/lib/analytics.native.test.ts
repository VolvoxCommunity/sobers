// Define mock functions that will be accessible inside jest.mock factory
import {
  initializePlatformAnalytics as initializeNativeAnalytics,
  trackEventPlatform as trackEventNative,
  setUserIdPlatform as setUserIdNative,
  setUserPropertiesPlatform as setUserPropertiesNative,
  trackScreenViewPlatform as trackScreenViewNative,
  resetAnalyticsPlatform as resetAnalyticsNative,
} from '@/lib/analytics/platform.native';

const mockIsDebugMode = jest.fn(() => false);
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();

// Mock analytics-utils - use wrapper to avoid hoisting issues
jest.mock('@/lib/analytics-utils', () => ({
  isDebugMode: () => mockIsDebugMode(),
}));

// Mock logger - use wrapper functions to avoid hoisting issues
jest.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
  },
  LogCategory: {
    ANALYTICS: 'ANALYTICS',
  },
}));

// Mock @react-native-firebase/analytics modular API
const mockLogEvent = jest.fn(() => Promise.resolve());
const mockSetUserId = jest.fn(() => Promise.resolve());
const mockSetUserProperties = jest.fn(() => Promise.resolve());
const mockResetAnalyticsData = jest.fn(() => Promise.resolve());
const mockSetAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());
const mockGetAnalytics = jest.fn(() => ({ _instance: 'mock-analytics' }));

// Mock modular API - named exports instead of default export
jest.mock('@react-native-firebase/analytics', () => {
  return {
    __esModule: true,
    getAnalytics: () => mockGetAnalytics(),
    logEvent: (_analytics: unknown, ...args: unknown[]) => mockLogEvent(...args),
    setUserId: (_analytics: unknown, ...args: unknown[]) => mockSetUserId(...args),
    setUserProperties: (_analytics: unknown, ...args: unknown[]) => mockSetUserProperties(...args),
    resetAnalyticsData: (_analytics: unknown, ...args: unknown[]) =>
      mockResetAnalyticsData(...args),
    setAnalyticsCollectionEnabled: (_analytics: unknown, ...args: unknown[]) =>
      mockSetAnalyticsCollectionEnabled(...args),
  };
});

// Helper to flush promise queue for fire-and-forget error handling
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('Native Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDebugMode.mockReturnValue(false);
    mockGetAnalytics.mockReturnValue({ _instance: 'mock-analytics' });
  });

  describe('initializeNativeAnalytics', () => {
    it('completes without error', async () => {
      await expect(initializeNativeAnalytics()).resolves.not.toThrow();
    });

    it('always enables analytics collection', async () => {
      mockIsDebugMode.mockReturnValue(false);

      await initializeNativeAnalytics();

      expect(mockSetAnalyticsCollectionEnabled).toHaveBeenCalledWith(true);
    });

    it('logs success in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await initializeNativeAnalytics();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Firebase Analytics initialized for native',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('does not log success when not in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(false);

      await initializeNativeAnalytics();

      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Init failed');
      mockSetAnalyticsCollectionEnabled.mockRejectedValueOnce(error);

      await expect(initializeNativeAnalytics()).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to initialize native analytics',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error initialization errors', async () => {
      mockSetAnalyticsCollectionEnabled.mockRejectedValueOnce('string error');
      mockIsDebugMode.mockReturnValue(true);

      await expect(initializeNativeAnalytics()).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to initialize native analytics',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('trackEventNative', () => {
    it('calls logEvent with event name and params', () => {
      trackEventNative('test_event', { param1: 'value1' });

      expect(mockLogEvent).toHaveBeenCalledWith('test_event', { param1: 'value1' });
    });

    it('calls logEvent without params when none provided', () => {
      trackEventNative('test_event');

      expect(mockLogEvent).toHaveBeenCalledWith('test_event', undefined);
    });

    it('logs event in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);

      trackEventNative('test_event', { param1: 'value1' });

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Event: test_event',
        expect.objectContaining({ category: 'ANALYTICS', param1: 'value1' })
      );
    });

    it('handles tracking errors gracefully', async () => {
      const error = new Error('Track failed');
      mockLogEvent.mockRejectedValueOnce(error);

      // Function returns void (fire-and-forget), doesn't throw
      expect(() => trackEventNative('test_event')).not.toThrow();

      // Wait for the promise rejection to be caught and logged
      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error tracking errors', async () => {
      mockLogEvent.mockRejectedValueOnce('string error');

      expect(() => trackEventNative('test_event')).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('setUserIdNative', () => {
    it('sets user ID', () => {
      setUserIdNative('user-123');

      expect(mockSetUserId).toHaveBeenCalledWith('user-123');
    });

    it('clears user ID when null', () => {
      setUserIdNative(null);

      expect(mockSetUserId).toHaveBeenCalledWith(null);
    });

    it('logs hashed user ID in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserIdNative('user-123');

      // User ID is hashed for privacy in logs
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringMatching(/^setUserId: <hashed: [0-9a-f]+>$/),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('SetUserId failed');
      mockSetUserId.mockRejectedValueOnce(error);

      expect(() => setUserIdNative('user-123')).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user ID',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error setUserId errors', async () => {
      mockSetUserId.mockRejectedValueOnce('string error');

      expect(() => setUserIdNative('user-123')).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user ID',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('setUserPropertiesNative', () => {
    it('sets user properties with string values', () => {
      const props = { theme_preference: 'dark' };
      setUserPropertiesNative(props);

      expect(mockSetUserProperties).toHaveBeenCalledWith({ theme_preference: 'dark' });
    });

    it('converts boolean values to strings', () => {
      const props = { has_sponsor: true, is_premium: false };
      setUserPropertiesNative(props);

      expect(mockSetUserProperties).toHaveBeenCalledWith({
        has_sponsor: 'true',
        is_premium: 'false',
      });
    });

    it('handles null values', () => {
      const props = { theme_preference: null };
      setUserPropertiesNative(props);

      expect(mockSetUserProperties).toHaveBeenCalledWith({ theme_preference: null });
    });

    it('skips undefined values', () => {
      const props = { theme_preference: 'dark', other: undefined };
      setUserPropertiesNative(props);

      expect(mockSetUserProperties).toHaveBeenCalledWith({ theme_preference: 'dark' });
    });

    it('logs in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);
      const props = { theme_preference: 'dark' };

      setUserPropertiesNative(props);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserProperties',
        expect.objectContaining({ category: 'ANALYTICS', theme_preference: 'dark' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('SetUserProperties failed');
      mockSetUserProperties.mockRejectedValueOnce(error);

      expect(() => setUserPropertiesNative({ theme_preference: 'dark' })).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user properties',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error errors', async () => {
      mockSetUserProperties.mockRejectedValueOnce('string error');

      expect(() => setUserPropertiesNative({ theme_preference: 'dark' })).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user properties',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('trackScreenViewNative', () => {
    it('logs screen view with name using logEvent', () => {
      trackScreenViewNative('HomeScreen');

      // Uses logEvent with 'screen_view' instead of deprecated logScreenView
      expect(mockLogEvent).toHaveBeenCalledWith('screen_view', {
        screen_name: 'HomeScreen',
        screen_class: 'HomeScreen',
      });
    });

    it('logs screen view with name and class using logEvent', () => {
      trackScreenViewNative('HomeScreen', 'TabScreen');

      expect(mockLogEvent).toHaveBeenCalledWith('screen_view', {
        screen_name: 'HomeScreen',
        screen_class: 'TabScreen',
      });
    });

    it('logs in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);

      trackScreenViewNative('HomeScreen');

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Screen view: HomeScreen',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Screen view tracking failed');
      mockLogEvent.mockRejectedValueOnce(error);

      expect(() => trackScreenViewNative('HomeScreen')).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track screen view',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error errors', async () => {
      mockLogEvent.mockRejectedValueOnce('string error');

      expect(() => trackScreenViewNative('HomeScreen')).not.toThrow();

      await flushPromises();

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track screen view',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('resetAnalyticsNative', () => {
    it('resets analytics data', async () => {
      await resetAnalyticsNative();

      expect(mockResetAnalyticsData).toHaveBeenCalled();
    });

    it('logs in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await resetAnalyticsNative();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Resetting analytics state',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Reset failed');
      mockResetAnalyticsData.mockRejectedValueOnce(error);

      await expect(resetAnalyticsNative()).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to reset analytics',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error errors', async () => {
      mockResetAnalyticsData.mockRejectedValueOnce('string error');

      await expect(resetAnalyticsNative()).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to reset analytics',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('when Firebase is unavailable', () => {
    // Use jest.isolateModules to get fresh module state with failing getAnalytics
    const importWithFailingAnalytics = <T>(
      modulePath: string,
      callback: (mod: T) => void | Promise<void>
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        jest.isolateModules(() => {
          // Configure getAnalytics to throw before importing the module
          mockGetAnalytics.mockImplementation(() => {
            throw new Error('Firebase not configured');
          });
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod = require(modulePath) as T;
            const result = callback(mod);
            if (result instanceof Promise) {
              result.then(resolve).catch(reject);
            } else {
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('initializeNativeAnalytics warns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        async (mod) => {
          await mod.initializePlatformAnalytics();

          expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Analytics not available - Firebase may not be configured',
            expect.objectContaining({ category: 'ANALYTICS' })
          );
        }
      );
    });

    it('trackEventPlatform silently returns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        (mod) => {
          // Should not throw
          expect(() => mod.trackEventPlatform('test_event')).not.toThrow();
          // Firebase logEvent should not be called
          expect(mockLogEvent).not.toHaveBeenCalled();
        }
      );
    });

    it('setUserIdPlatform silently returns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        (mod) => {
          expect(() => mod.setUserIdPlatform('user-123')).not.toThrow();
          expect(mockSetUserId).not.toHaveBeenCalled();
        }
      );
    });

    it('setUserPropertiesPlatform silently returns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        (mod) => {
          expect(() => mod.setUserPropertiesPlatform({ theme: 'dark' })).not.toThrow();
          expect(mockSetUserProperties).not.toHaveBeenCalled();
        }
      );
    });

    it('trackScreenViewPlatform silently returns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        (mod) => {
          expect(() => mod.trackScreenViewPlatform('HomeScreen')).not.toThrow();
          expect(mockLogEvent).not.toHaveBeenCalled();
        }
      );
    });

    it('resetAnalyticsPlatform warns when analytics unavailable', async () => {
      await importWithFailingAnalytics<typeof import('@/lib/analytics/platform.native')>(
        '@/lib/analytics/platform.native',
        async (mod) => {
          await mod.resetAnalyticsPlatform();

          expect(mockLoggerWarn).toHaveBeenCalledWith(
            'Cannot reset analytics - Firebase not available',
            expect.objectContaining({ category: 'ANALYTICS' })
          );
        }
      );
    });
  });
});
