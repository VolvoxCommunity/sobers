// __tests__/lib/analytics.test.ts

// Define mock functions that will be accessible inside jest.mock factories
import {
  initializeAnalytics,
  trackEvent,
  setUserId,
  setUserProperties,
  trackScreenView,
  resetAnalytics,
  AnalyticsEvents,
  calculateDaysSoberBucket,
  __resetForTesting,
} from '@/lib/analytics';

const mockInitializePlatformAnalytics = jest.fn(() => Promise.resolve());
const mockTrackEventPlatform = jest.fn();
const mockSetUserIdPlatform = jest.fn();
const mockSetUserPropertiesPlatform = jest.fn();
const mockTrackScreenViewPlatform = jest.fn();
const mockResetAnalyticsPlatform = jest.fn(() => Promise.resolve());

const mockSanitizeParams = jest.fn((params) => params);
const mockShouldInitializeAnalytics = jest.fn(() => true);
const mockIsDebugMode = jest.fn(() => false);
const mockLoggerWarn = jest.fn();

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options: { web?: unknown; default?: unknown }) => options.default),
  },
}));

// Mock the platform implementation module
jest.mock('@/lib/analytics/platform', () => ({
  initializePlatformAnalytics: (...args: unknown[]) => mockInitializePlatformAnalytics(...args),
  trackEventPlatform: (...args: unknown[]) => mockTrackEventPlatform(...args),
  setUserIdPlatform: (...args: unknown[]) => mockSetUserIdPlatform(...args),
  setUserPropertiesPlatform: (...args: unknown[]) => mockSetUserPropertiesPlatform(...args),
  trackScreenViewPlatform: (...args: unknown[]) => mockTrackScreenViewPlatform(...args),
  resetAnalyticsPlatform: (...args: unknown[]) => mockResetAnalyticsPlatform(...args),
}));

// Mock analytics-utils
jest.mock('@/lib/analytics-utils', () => ({
  sanitizeParams: (params: unknown) => mockSanitizeParams(params),
  shouldInitializeAnalytics: () => mockShouldInitializeAnalytics(),
  isDebugMode: () => mockIsDebugMode(),
  calculateDaysSoberBucket: jest.fn(() => '31-90'),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    ANALYTICS: 'ANALYTICS',
  },
}));

describe('Unified Analytics Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module's internal initialization state between tests
    __resetForTesting();
    mockShouldInitializeAnalytics.mockReturnValue(true);
    mockIsDebugMode.mockReturnValue(false);
  });

  describe('initializeAnalytics', () => {
    it('skips initialization when Firebase not configured', async () => {
      mockShouldInitializeAnalytics.mockReturnValue(false);
      mockIsDebugMode.mockReturnValue(true);

      await initializeAnalytics();

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'Firebase not configured - analytics disabled',
        expect.any(Object)
      );
      expect(mockInitializePlatformAnalytics).not.toHaveBeenCalled();
    });

    it('initializes platform analytics when configured', async () => {
      await initializeAnalytics();

      expect(mockInitializePlatformAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: expect.any(String),
          projectId: expect.any(String),
          appId: expect.any(String),
          measurementId: expect.any(String),
        })
      );
    });

    it('returns immediately when already completed (with debug logging)', async () => {
      mockIsDebugMode.mockReturnValue(true);

      // First call completes initialization
      await initializeAnalytics();
      jest.clearAllMocks();

      // Second call should return immediately
      await initializeAnalytics();

      // Should not call platform init again
      expect(mockInitializePlatformAnalytics).not.toHaveBeenCalled();
    });

    it('concurrent calls await the same Promise', async () => {
      // Create a deferred promise to control timing
      let resolveInit: () => void;
      const initPromise = new Promise<void>((resolve) => {
        resolveInit = resolve;
      });
      mockInitializePlatformAnalytics.mockReturnValue(initPromise);

      // Start two concurrent initializations
      const call1 = initializeAnalytics();
      const call2 = initializeAnalytics();

      // Platform init should only be called once
      expect(mockInitializePlatformAnalytics).toHaveBeenCalledTimes(1);

      // Resolve and wait for both
      resolveInit!();
      await Promise.all([call1, call2]);
    });

    it('logs debug message when concurrent initialization is in progress with debug mode', async () => {
      const mockLoggerDebug = jest.fn();
      const { logger } = jest.requireMock('@/lib/logger');
      logger.debug = mockLoggerDebug;

      mockIsDebugMode.mockReturnValue(true);

      // Create a deferred promise to control timing
      let resolveInit: () => void;
      const initPromise = new Promise<void>((resolve) => {
        resolveInit = resolve;
      });
      mockInitializePlatformAnalytics.mockReturnValue(initPromise);

      // Start first initialization (sets state to pending)
      const call1 = initializeAnalytics();

      // Clear debug calls from first init setup
      mockLoggerDebug.mockClear();

      // Start second concurrent initialization - should trigger debug log
      const call2 = initializeAnalytics();

      // Verify debug message about waiting was logged
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Analytics initialization in progress, waiting...',
        expect.objectContaining({ category: 'ANALYTICS' })
      );

      // Resolve and wait for both
      resolveInit!();
      await Promise.all([call1, call2]);
    });

    it('allows retry after initialization failure', async () => {
      // First call fails
      mockInitializePlatformAnalytics.mockRejectedValueOnce(new Error('Init failed'));
      await initializeAnalytics();

      // Reset mocks
      jest.clearAllMocks();
      mockInitializePlatformAnalytics.mockResolvedValueOnce(undefined);

      // Second call should retry
      await initializeAnalytics();

      expect(mockInitializePlatformAnalytics).toHaveBeenCalledTimes(1);
    });

    it('warns about missing Firebase config on web platform', async () => {
      // Mock Platform.OS as 'web'
      const { Platform } = jest.requireMock('react-native');
      const originalOS = Platform.OS;
      Platform.OS = 'web';

      try {
        await initializeAnalytics();

        // Should warn about missing config (env vars are empty in test)
        expect(mockLoggerWarn).toHaveBeenCalledWith(
          'Firebase config incomplete - some required values are missing',
          expect.objectContaining({
            category: 'ANALYTICS',
            hasApiKey: expect.any(Boolean),
            hasProjectId: expect.any(Boolean),
            hasAppId: expect.any(Boolean),
            hasMeasurementId: expect.any(Boolean),
          })
        );
      } finally {
        // Restore Platform.OS
        Platform.OS = originalOS;
      }
    });
  });

  describe('trackEvent', () => {
    it('sanitizes params before tracking', () => {
      const params = { user_id: 'test', custom: 'value' };
      trackEvent('test_event', params);

      expect(mockSanitizeParams).toHaveBeenCalledWith(params);
      expect(mockTrackEventPlatform).toHaveBeenCalled();
    });

    it('tracks event with sanitized params', () => {
      mockSanitizeParams.mockReturnValue({ clean: 'param' });
      trackEvent('test_event', { dirty: 'param' });

      expect(mockTrackEventPlatform).toHaveBeenCalledWith('test_event', { clean: 'param' });
    });

    it('tracks event without params', () => {
      mockSanitizeParams.mockReturnValue(undefined);
      trackEvent('test_event');

      expect(mockSanitizeParams).toHaveBeenCalledWith(undefined);
      expect(mockTrackEventPlatform).toHaveBeenCalledWith('test_event', undefined);
    });
  });

  describe('setUserId', () => {
    it('sets user ID via platform implementation', () => {
      setUserId('user-123');

      expect(mockSetUserIdPlatform).toHaveBeenCalledWith('user-123');
    });

    it('clears user ID when null', () => {
      setUserId(null);

      expect(mockSetUserIdPlatform).toHaveBeenCalledWith(null);
    });
  });

  describe('setUserProperties', () => {
    it('sets user properties via platform implementation', () => {
      const properties = { days_sober_bucket: '31-90', has_sponsor: true };
      setUserProperties(properties);

      expect(mockSetUserPropertiesPlatform).toHaveBeenCalledWith(properties);
    });
  });

  describe('trackScreenView', () => {
    it('tracks screen view via platform implementation', () => {
      trackScreenView('HomeScreen', 'TabScreen');

      expect(mockTrackScreenViewPlatform).toHaveBeenCalledWith('HomeScreen', 'TabScreen');
    });

    it('tracks screen view without class', () => {
      trackScreenView('HomeScreen');

      expect(mockTrackScreenViewPlatform).toHaveBeenCalledWith('HomeScreen', undefined);
    });
  });

  describe('resetAnalytics', () => {
    it('resets analytics via platform implementation', async () => {
      await resetAnalytics();

      expect(mockResetAnalyticsPlatform).toHaveBeenCalled();
    });
  });

  describe('exports', () => {
    it('re-exports AnalyticsEvents', () => {
      expect(AnalyticsEvents).toBeDefined();
      expect(AnalyticsEvents.AUTH_LOGIN).toBeDefined();
    });

    it('re-exports calculateDaysSoberBucket', () => {
      expect(calculateDaysSoberBucket).toBeDefined();
      expect(typeof calculateDaysSoberBucket).toBe('function');
    });
  });

  describe('__resetForTesting', () => {
    it('throws error when called outside test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        // Temporarily set NODE_ENV to non-test value
        process.env.NODE_ENV = 'production';

        // Call the actual function - it should throw because NODE_ENV is not 'test'
        expect(() => {
          __resetForTesting();
        }).toThrow('__resetForTesting should only be called in test environments');
      } finally {
        // Restore NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });
});
