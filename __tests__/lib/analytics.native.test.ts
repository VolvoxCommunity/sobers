// Define mock functions that will be accessible inside jest.mock factory
import {
  initializePlatformAnalytics as initializeNativeAnalytics,
  trackEventPlatform as trackEventNative,
  setUserIdPlatform as setUserIdNative,
  setUserPropertiesPlatform as setUserPropertiesNative,
  trackScreenViewPlatform as trackScreenViewNative,
  resetAnalyticsPlatform as resetAnalyticsNative,
} from '@/lib/analytics/impl.native';

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

// Mock @react-native-firebase/analytics before imports
const mockLogEvent = jest.fn(() => Promise.resolve());
const mockSetUserId = jest.fn(() => Promise.resolve());
const mockSetUserProperties = jest.fn(() => Promise.resolve());
const mockLogScreenView = jest.fn(() => Promise.resolve());
const mockResetAnalyticsData = jest.fn(() => Promise.resolve());
const mockSetAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());

// Use wrapper functions to avoid hoisting issues with mock variable references
jest.mock('@react-native-firebase/analytics', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      logEvent: (...args: unknown[]) => mockLogEvent(...args),
      setUserId: (...args: unknown[]) => mockSetUserId(...args),
      setUserProperties: (...args: unknown[]) => mockSetUserProperties(...args),
      logScreenView: (...args: unknown[]) => mockLogScreenView(...args),
      resetAnalyticsData: (...args: unknown[]) => mockResetAnalyticsData(...args),
      setAnalyticsCollectionEnabled: (...args: unknown[]) =>
        mockSetAnalyticsCollectionEnabled(...args),
    })),
  };
});

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
    it('calls logEvent with event name and params', async () => {
      await trackEventNative('test_event', { param1: 'value1' });

      expect(mockLogEvent).toHaveBeenCalledWith('test_event', { param1: 'value1' });
    });

    it('calls logEvent without params when none provided', async () => {
      await trackEventNative('test_event');

      expect(mockLogEvent).toHaveBeenCalledWith('test_event', undefined);
    });

    it('logs event in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await trackEventNative('test_event', { param1: 'value1' });

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Event: test_event',
        expect.objectContaining({ category: 'ANALYTICS', param1: 'value1' })
      );
    });

    it('handles tracking errors gracefully', async () => {
      const error = new Error('Track failed');
      mockLogEvent.mockRejectedValueOnce(error);

      await expect(trackEventNative('test_event')).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error tracking errors', async () => {
      mockLogEvent.mockRejectedValueOnce('string error');

      await expect(trackEventNative('test_event')).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('setUserIdNative', () => {
    it('sets user ID', async () => {
      await setUserIdNative('user-123');

      expect(mockSetUserId).toHaveBeenCalledWith('user-123');
    });

    it('clears user ID when null', async () => {
      await setUserIdNative(null);

      expect(mockSetUserId).toHaveBeenCalledWith(null);
    });

    it('logs in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await setUserIdNative('user-123');

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserId: user-123',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('SetUserId failed');
      mockSetUserId.mockRejectedValueOnce(error);

      await expect(setUserIdNative('user-123')).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user ID',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error setUserId errors', async () => {
      mockSetUserId.mockRejectedValueOnce('string error');

      await expect(setUserIdNative('user-123')).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user ID',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('setUserPropertiesNative', () => {
    it('sets user properties', async () => {
      const props = { theme_preference: 'dark' };
      await setUserPropertiesNative(props);

      expect(mockSetUserProperties).toHaveBeenCalledWith(props);
    });

    it('logs in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);
      const props = { theme_preference: 'dark' };

      await setUserPropertiesNative(props);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserProperties',
        expect.objectContaining({ category: 'ANALYTICS', theme_preference: 'dark' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('SetUserProperties failed');
      mockSetUserProperties.mockRejectedValueOnce(error);

      await expect(setUserPropertiesNative({ theme_preference: 'dark' })).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user properties',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error errors', async () => {
      mockSetUserProperties.mockRejectedValueOnce('string error');

      await expect(setUserPropertiesNative({ theme_preference: 'dark' })).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user properties',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('trackScreenViewNative', () => {
    it('logs screen view with name', async () => {
      await trackScreenViewNative('HomeScreen');

      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'HomeScreen',
        screen_class: 'HomeScreen',
      });
    });

    it('logs screen view with name and class', async () => {
      await trackScreenViewNative('HomeScreen', 'TabScreen');

      expect(mockLogScreenView).toHaveBeenCalledWith({
        screen_name: 'HomeScreen',
        screen_class: 'TabScreen',
      });
    });

    it('logs in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await trackScreenViewNative('HomeScreen');

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Screen view: HomeScreen',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('LogScreenView failed');
      mockLogScreenView.mockRejectedValueOnce(error);

      await expect(trackScreenViewNative('HomeScreen')).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track screen view',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error errors', async () => {
      mockLogScreenView.mockRejectedValueOnce('string error');

      await expect(trackScreenViewNative('HomeScreen')).resolves.not.toThrow();
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
