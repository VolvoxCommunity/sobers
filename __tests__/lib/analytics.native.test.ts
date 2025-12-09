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
const mockAnalyticsInstance = { _instance: 'mock-analytics' };

// Mock modular API - named exports instead of default export
jest.mock('@react-native-firebase/analytics', () => {
  return {
    __esModule: true,
    getAnalytics: jest.fn(() => mockAnalyticsInstance),
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
  });

  describe('initializeNativeAnalytics', () => {
    it('completes without error', async () => {
      await expect(initializeNativeAnalytics()).resolves.not.toThrow();
    });

    it('enables analytics collection in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

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

    it('does not enable collection when not in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(false);

      await initializeNativeAnalytics();

      expect(mockSetAnalyticsCollectionEnabled).not.toHaveBeenCalled();
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Init failed');
      mockSetAnalyticsCollectionEnabled.mockRejectedValueOnce(error);
      mockIsDebugMode.mockReturnValue(true);

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
});
