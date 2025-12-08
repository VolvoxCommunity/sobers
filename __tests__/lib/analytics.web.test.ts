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
        'Firebase app already initialized',
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

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Event: test_event',
        expect.objectContaining({ category: 'ANALYTICS', param1: 'value1' })
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

    it('logs in debug mode', () => {
      mockIsDebugMode.mockReturnValue(true);

      setUserIdWeb('user-123');

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserId: user-123',
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

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'setUserProperties',
        expect.objectContaining({ category: 'ANALYTICS', theme_preference: 'dark' })
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
