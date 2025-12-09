/**
 * @jest-environment jsdom
 */

// Define mock functions that will be accessible inside jest.mock factory
// Import after mocks are set up
import { initializeApp, getApps } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  isSupported,
} from 'firebase/analytics';

import {
  initializePlatformAnalytics as initializeWebAnalytics,
  trackEventPlatform as trackEventWeb,
  setUserIdPlatform as setUserIdWeb,
  setUserPropertiesPlatform as setUserPropertiesWeb,
  trackScreenViewPlatform as trackScreenViewWeb,
  resetAnalyticsPlatform as resetAnalyticsWeb,
  __resetForTesting,
} from '@/lib/analytics/platform.web';

const mockLoggerWarn = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();
const mockIsDebugMode = jest.fn(() => false);

// Mock analytics-utils - must be before imports
jest.mock('@/lib/analytics-utils', () => ({
  isDebugMode: () => mockIsDebugMode(),
}));

// Mock logger - use wrapper functions to avoid hoisting issues
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    debug: (...args: unknown[]) => mockLoggerDebug(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
  LogCategory: {
    ANALYTICS: 'ANALYTICS',
  },
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'existing-app' })),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({ app: { name: 'test-app' } })),
  logEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  isSupported: jest.fn(() => Promise.resolve(true)),
}));

describe('Web Analytics', () => {
  beforeEach(() => {
    // Reset module state to allow re-initialization between tests
    __resetForTesting();
    jest.clearAllMocks();
    (getApps as jest.Mock).mockReturnValue([]);
    (isSupported as jest.Mock).mockResolvedValue(true);
    mockIsDebugMode.mockReturnValue(false);
  });

  describe('initializeWebAnalytics', () => {
    const mockConfig = {
      apiKey: 'test-key',
      projectId: 'test-project',
      appId: 'test-app-id',
      measurementId: 'G-XXXXXXXX',
    };

    it('initializes Firebase app with config', async () => {
      await initializeWebAnalytics(mockConfig);

      expect(initializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-key',
          projectId: 'test-project',
          appId: 'test-app-id',
          measurementId: 'G-XXXXXXXX',
        })
      );
    });

    it('initializes analytics after app', async () => {
      await initializeWebAnalytics(mockConfig);

      expect(getAnalytics).toHaveBeenCalled();
    });

    it('logs success in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await initializeWebAnalytics(mockConfig);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Firebase Analytics initialized for web',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('does not reinitialize if app already exists', async () => {
      (getApps as jest.Mock).mockReturnValue([{ name: 'existing' }]);

      await initializeWebAnalytics(mockConfig);

      expect(initializeApp).not.toHaveBeenCalled();
    });

    it('logs message when app already exists in debug mode', async () => {
      (getApps as jest.Mock).mockReturnValue([{ name: 'existing' }]);
      mockIsDebugMode.mockReturnValue(true);

      await initializeWebAnalytics(mockConfig);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Firebase app already initialized, retrieved existing instance',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles unsupported browsers gracefully', async () => {
      (isSupported as jest.Mock).mockResolvedValue(false);

      await expect(initializeWebAnalytics(mockConfig)).resolves.not.toThrow();
      expect(initializeApp).not.toHaveBeenCalled();
    });

    it('logs warning for unsupported browsers in debug mode', async () => {
      (isSupported as jest.Mock).mockResolvedValue(false);
      mockIsDebugMode.mockReturnValue(true);

      await initializeWebAnalytics(mockConfig);

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Firebase Analytics not supported in this browser',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles initialization errors gracefully', async () => {
      const error = new Error('Init failed');
      (initializeApp as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      await expect(initializeWebAnalytics(mockConfig)).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to initialize Firebase Analytics',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error initialization errors', async () => {
      (initializeApp as jest.Mock).mockImplementationOnce(() => {
        throw 'string error';
      });

      await expect(initializeWebAnalytics(mockConfig)).resolves.not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to initialize Firebase Analytics',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('returns immediately when already initialized (with debug logging)', async () => {
      mockIsDebugMode.mockReturnValue(true);

      // First call initializes
      await initializeWebAnalytics(mockConfig);
      jest.clearAllMocks();

      // Second call should return immediately without reinitializing
      await initializeWebAnalytics(mockConfig);

      expect(initializeApp).not.toHaveBeenCalled();
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Analytics already initialized, skipping re-initialization',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('concurrent calls await the same Promise', async () => {
      // Create a deferred promise to control timing
      let resolveSupported: (value: boolean) => void;
      const supportedPromise = new Promise<boolean>((resolve) => {
        resolveSupported = resolve;
      });
      (isSupported as jest.Mock).mockReturnValue(supportedPromise);

      // Start two concurrent initializations
      const call1 = initializeWebAnalytics(mockConfig);
      const call2 = initializeWebAnalytics(mockConfig);

      // isSupported should only be called once (first call starts initialization)
      expect(isSupported).toHaveBeenCalledTimes(1);

      // Resolve and wait for both
      resolveSupported!(true);
      await Promise.all([call1, call2]);
    });

    it('logs waiting message for concurrent calls in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      // Create a deferred promise to control timing
      let resolveSupported: (value: boolean) => void;
      const supportedPromise = new Promise<boolean>((resolve) => {
        resolveSupported = resolve;
      });
      (isSupported as jest.Mock).mockReturnValue(supportedPromise);

      // Start two concurrent initializations
      const call1 = initializeWebAnalytics(mockConfig);
      const call2 = initializeWebAnalytics(mockConfig);

      // Second call should log waiting message
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Analytics initialization in progress, waiting...',
        expect.objectContaining({ category: 'ANALYTICS' })
      );

      // Resolve and wait for both
      resolveSupported!(true);
      await Promise.all([call1, call2]);
    });

    it('gracefully handles Firebase failure and marks initialization complete', async () => {
      // Firebase init fails, but initialization still completes (graceful degradation)
      (isSupported as jest.Mock).mockResolvedValueOnce(true);
      (initializeApp as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Firebase init failed');
      });

      await initializeWebAnalytics(mockConfig);

      // Error should be logged
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to initialize Firebase Analytics',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );

      // Initialization should still be marked complete (graceful degradation)
      // Subsequent calls should return early
      jest.clearAllMocks();
      mockIsDebugMode.mockReturnValue(true);

      await initializeWebAnalytics(mockConfig);

      // Should log that initialization is already complete
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Analytics already initialized, skipping re-initialization',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
      expect(initializeApp).not.toHaveBeenCalled();
    });
  });

  describe('trackEventWeb', () => {
    beforeEach(async () => {
      // Initialize analytics first
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('calls logEvent with event name and params', () => {
      trackEventWeb('test_event', { param1: 'value1' });

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', { param1: 'value1' });
    });

    it('calls logEvent without params when none provided', () => {
      trackEventWeb('test_event');

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', undefined);
    });

    it('logs event in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);

      trackEventWeb('test_event', { param1: 'value1' });

      // Implementation wraps params in event_params for structured logging
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Event: test_event',
        expect.objectContaining({
          category: 'ANALYTICS',
          event_params: expect.objectContaining({ param1: 'value1' }),
        })
      );
    });
  });

  describe('setUserIdWeb', () => {
    beforeEach(async () => {
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('sets user ID', () => {
      setUserIdWeb('user-123');

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), 'user-123');
    });

    it('clears user ID when null', () => {
      setUserIdWeb(null);

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), null);
    });

    it('logs in debug mode with hashed userId', async () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserIdWeb('user-123');

      // Wait for the async hash operation to complete (flush promises)
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Implementation hashes userId for privacy-safe logging
      // In test environment crypto may not be available, so [hash-error] is also valid
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringMatching(/^setUserId: <hashed: ([a-f0-9]+|\[hash-error\])>$/),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('setUserPropertiesWeb', () => {
    beforeEach(async () => {
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('sets user properties', () => {
      const props = { theme_preference: 'dark' as const };
      setUserPropertiesWeb(props);

      expect(setUserProperties).toHaveBeenCalledWith(expect.anything(), props);
    });

    it('logs in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);
      const props = { theme_preference: 'dark' as const };

      setUserPropertiesWeb(props);

      // Implementation wraps properties in user_properties for structured logging
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserProperties',
        expect.objectContaining({
          category: 'ANALYTICS',
          user_properties: expect.objectContaining({ theme_preference: 'dark' }),
        })
      );
    });
  });

  describe('trackScreenViewWeb', () => {
    beforeEach(async () => {
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('tracks screen view with name and class', () => {
      trackScreenViewWeb('HomeScreen', 'TabScreen');

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'screen_view', {
        screen_name: 'HomeScreen',
        screen_class: 'TabScreen',
      });
    });

    it('uses screen name as class when class not provided', () => {
      trackScreenViewWeb('HomeScreen');

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'screen_view', {
        screen_name: 'HomeScreen',
        screen_class: 'HomeScreen',
      });
    });
  });

  describe('resetAnalyticsWeb', () => {
    beforeEach(async () => {
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('clears user ID', async () => {
      await resetAnalyticsWeb();

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), null);
    });

    it('logs in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await resetAnalyticsWeb();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Resetting analytics state',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });
});

describe('Web Analytics - New Functionality', () => {
  describe('Provider Configuration', () => {
    const mockConfig = {
      apiKey: 'test-key',
      projectId: 'test-project',
      appId: 'test-app-id',
      measurementId: 'G-XXXXXXXX',
    };

    beforeEach(() => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      mockIsDebugMode.mockReturnValue(false);
    });

    it('initializes with Firebase provider by default', async () => {
      await initializeWebAnalytics(mockConfig);

      expect(initializeApp).toHaveBeenCalled();
      expect(getAnalytics).toHaveBeenCalled();
    });

    it('logs completion with provider information in debug mode', async () => {
      mockIsDebugMode.mockReturnValue(true);

      await initializeWebAnalytics(mockConfig);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Analytics initialization complete',
        expect.objectContaining({
          category: 'ANALYTICS',
          provider: expect.any(String),
          firebaseEnabled: expect.any(Boolean),
          vercelEnabled: expect.any(Boolean),
        })
      );
    });
  });

  describe('Error Handling', () => {
    const mockConfig = {
      apiKey: 'test-key',
      projectId: 'test-project',
      appId: 'test-app-id',
      measurementId: 'G-XXXXXXXX',
    };

    beforeEach(async () => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      await initializeWebAnalytics(mockConfig);
      jest.clearAllMocks();
    });

    it('handles logEvent errors gracefully', () => {
      const error = new Error('Firebase error');
      (logEvent as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => trackEventWeb('test_event', { param1: 'value1' })).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event in Firebase',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles setUserId errors gracefully', () => {
      const error = new Error('Set user ID failed');
      (setUserId as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => setUserIdWeb('user-123')).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user ID',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles setUserProperties errors gracefully', () => {
      const error = new Error('Set properties failed');
      (setUserProperties as jest.Mock).mockImplementationOnce(() => {
        throw error;
      });

      expect(() => setUserPropertiesWeb({ theme_preference: 'dark' })).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to set user properties',
        error,
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('handles non-Error exceptions in logEvent', () => {
      (logEvent as jest.Mock).mockImplementationOnce(() => {
        throw 'string error';
      });

      expect(() => trackEventWeb('test_event')).not.toThrow();
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to track event test_event in Firebase',
        expect.any(Error),
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });
  });

  describe('Idempotency and Re-initialization', () => {
    const mockConfig = {
      apiKey: 'test-key',
      projectId: 'test-project',
      appId: 'test-app-id',
      measurementId: 'G-XXXXXXXX',
    };

    beforeEach(() => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      mockIsDebugMode.mockReturnValue(false);
    });

    it('prevents multiple initialization attempts', async () => {
      await initializeWebAnalytics(mockConfig);
      const firstCallCount = initializeApp.mock.calls.length;

      // Try to initialize again
      await initializeWebAnalytics(mockConfig);

      // Should not call initializeApp again
      expect(initializeApp).toHaveBeenCalledTimes(firstCallCount);
    });

    it('logs debug message when skipping re-initialization', async () => {
      mockIsDebugMode.mockReturnValue(true);
      await initializeWebAnalytics(mockConfig);

      jest.clearAllMocks();

      await initializeWebAnalytics(mockConfig);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Analytics already initialized, skipping re-initialization',
        expect.objectContaining({ category: 'ANALYTICS' })
      );
    });

    it('allows re-initialization after __resetForTesting', async () => {
      await initializeWebAnalytics(mockConfig);

      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);

      await initializeWebAnalytics(mockConfig);

      // Should call initializeApp again after reset
      expect(initializeApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Analytics Not Initialized', () => {
    beforeEach(() => {
      __resetForTesting();
      jest.clearAllMocks();
      mockIsDebugMode.mockReturnValue(false);
    });

    it('logs debug message when tracking event without initialization', () => {
      mockIsDebugMode.mockReturnValue(true);

      trackEventWeb('test_event', { param1: 'value1' });

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('Event (not sent - no provider initialized)'),
        expect.objectContaining({
          category: 'ANALYTICS',
          event_params: expect.any(Object),
        })
      );
    });

    it('logs debug message when setting user ID without initialization', () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserIdWeb('user-123');

      // Wait for async hash operation
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(mockLoggerDebug).toHaveBeenCalledWith(
            expect.stringContaining('setUserId (not sent - Firebase not initialized)'),
            expect.objectContaining({ category: 'ANALYTICS' })
          );
          resolve(undefined);
        }, 10);
      });
    });

    it('logs debug message when clearing user ID (null) without initialization', () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserIdWeb(null);

      // Wait for async hash operation (even for null, there's async processing)
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(mockLoggerDebug).toHaveBeenCalledWith(
            'setUserId (not sent - Firebase not initialized): null',
            expect.objectContaining({ category: 'ANALYTICS' })
          );
          resolve(undefined);
        }, 10);
      });
    });

    it('logs debug message when setting user properties without initialization', () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserPropertiesWeb({ theme_preference: 'dark' });

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserProperties (not sent - Firebase not initialized)',
        expect.objectContaining({
          category: 'ANALYTICS',
          user_properties: expect.any(Object),
        })
      );
    });

    it('does not call Firebase methods when not initialized', () => {
      trackEventWeb('test_event');
      setUserIdWeb('user-123');
      setUserPropertiesWeb({ theme_preference: 'dark' });

      expect(logEvent).not.toHaveBeenCalled();
      expect(setUserId).not.toHaveBeenCalled();
      expect(setUserProperties).not.toHaveBeenCalled();
    });
  });

  describe('User Properties Filtering', () => {
    beforeEach(async () => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('filters out undefined values from user properties', () => {
      const props = {
        theme_preference: 'dark' as const,
        has_sponsor: undefined,
        days_sober_bucket: '31-90' as const,
      };

      setUserPropertiesWeb(props);

      // Firebase should only receive defined values
      expect(setUserProperties).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          theme_preference: 'dark',
          days_sober_bucket: '31-90',
        })
      );

      // Should not include undefined values
      const callArgs = (setUserProperties as jest.Mock).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('has_sponsor');
    });

    it('preserves boolean false values', () => {
      const props = {
        has_sponsor: false,
        has_sponsees: false,
      };

      setUserPropertiesWeb(props);

      expect(setUserProperties).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          has_sponsor: false,
          has_sponsees: false,
        })
      );
    });

    it('handles empty properties object', () => {
      setUserPropertiesWeb({});

      expect(setUserProperties).toHaveBeenCalledWith(expect.anything(), {});
    });

    it('handles all undefined properties', () => {
      const props = {
        theme_preference: undefined,
        has_sponsor: undefined,
      };

      setUserPropertiesWeb(props);

      expect(setUserProperties).toHaveBeenCalledWith(expect.anything(), {});
    });
  });

  describe('Parameter Sanitization for Logging', () => {
    beforeEach(async () => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      mockIsDebugMode.mockReturnValue(true);
      await initializeWebAnalytics({
        apiKey: 'test-key',
        projectId: 'test-project',
        appId: 'test-app-id',
        measurementId: 'G-XXXXXXXX',
      });
      jest.clearAllMocks();
    });

    it('logs params without PII in debug mode', () => {
      trackEventWeb('test_event', {
        task_id: '123',
        count: 5,
      });

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Event: test_event',
        expect.objectContaining({
          category: 'ANALYTICS',
          event_params: expect.objectContaining({
            task_id: '123',
            count: 5,
          }),
        })
      );
    });

    it('redacts PII-prone keys from logged params', () => {
      trackEventWeb('test_event', {
        email: 'user@example.com',
        task_id: '123',
      });

      const debugCall = mockLoggerDebug.mock.calls.find((call) =>
        call[0].includes('Event: test_event')
      );
      expect(debugCall).toBeDefined();
      expect(debugCall[1].event_params.email).toBe('[Filtered]');
      expect(debugCall[1].event_params.task_id).toBe('123');
    });

    it('recursively sanitizes nested objects', () => {
      trackEventWeb('test_event', {
        metadata: {
          email: 'user@example.com',
          task_id: '123',
        },
      });

      const debugCall = mockLoggerDebug.mock.calls.find((call) =>
        call[0].includes('Event: test_event')
      );
      expect(debugCall).toBeDefined();
      expect(debugCall[1].event_params.metadata.email).toBe('[Filtered]');
      expect(debugCall[1].event_params.metadata.task_id).toBe('123');
    });

    it('handles params with reserved logger keys', () => {
      trackEventWeb('test_event', {
        error_message: 'this should be filtered',
        task_id: '123',
      });

      const debugCall = mockLoggerDebug.mock.calls.find((call) =>
        call[0].includes('Event: test_event')
      );
      expect(debugCall).toBeDefined();
      // error_message should be filtered to prevent overwriting logger metadata
      expect(debugCall[1].event_params).not.toHaveProperty('error_message');
      expect(debugCall[1].event_params.task_id).toBe('123');
    });
  });

  describe('__resetForTesting', () => {
    it('throws error when called outside test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(() => __resetForTesting()).toThrow(
        '__resetForTesting should only be called in test environments'
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('successfully resets state in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      expect(() => __resetForTesting()).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases', () => {
    const mockConfig = {
      apiKey: 'test-key',
      projectId: 'test-project',
      appId: 'test-app-id',
      measurementId: 'G-XXXXXXXX',
    };

    beforeEach(async () => {
      __resetForTesting();
      jest.clearAllMocks();
      (getApps as jest.Mock).mockReturnValue([]);
      (isSupported as jest.Mock).mockResolvedValue(true);
      await initializeWebAnalytics(mockConfig);
      jest.clearAllMocks();
    });

    it('handles trackEvent with null params', () => {
      expect(() => trackEventWeb('test_event', null as any)).not.toThrow();
      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', null);
    });

    it('handles trackEvent with empty object params', () => {
      trackEventWeb('test_event', {});
      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', {});
    });

    it('handles empty screen name in trackScreenView', () => {
      trackScreenViewWeb('');
      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'screen_view', {
        screen_name: '',
        screen_class: '',
      });
    });

    it('handles very long event names', () => {
      const longName = 'a'.repeat(1000);
      trackEventWeb(longName);
      expect(logEvent).toHaveBeenCalledWith(expect.anything(), longName, undefined);
    });

    it('handles special characters in event names', () => {
      const specialName = 'event_with-special.chars!@#$%';
      trackEventWeb(specialName);
      expect(logEvent).toHaveBeenCalledWith(expect.anything(), specialName, undefined);
    });

    it('handles params with circular references gracefully', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      // This should not crash, even if logging might fail internally
      expect(() => trackEventWeb('test_event', circular)).not.toThrow();
    });

    it('correctly handles shared objects (not circular) in params', () => {
      mockIsDebugMode.mockReturnValue(true);

      // Shared object used in multiple places - NOT circular, just shared
      const shared = { id: '123', name: 'test' };
      const params = {
        first: shared,
        second: shared,
        nested: { inner: shared },
      };

      trackEventWeb('test_event', params);

      // Should log all instances of shared object correctly (not as [Circular])
      const debugCall = mockLoggerDebug.mock.calls.find((call) =>
        call[0].includes('Event: test_event')
      );
      expect(debugCall).toBeDefined();

      // All references to the shared object should be sanitized properly, not marked [Circular]
      expect(debugCall[1].event_params.first).toEqual({ id: '123', name: '[Filtered]' });
      expect(debugCall[1].event_params.second).toEqual({ id: '123', name: '[Filtered]' });
      expect(debugCall[1].event_params.nested.inner).toEqual({ id: '123', name: '[Filtered]' });
    });
  });
});
