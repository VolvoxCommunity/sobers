/**
 * @jest-environment jsdom
 */

// Mock firebase/app and firebase/analytics before imports
import { initializeApp, getApps } from 'firebase/app';
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  isSupported,
} from 'firebase/analytics';

// Import after mocks are set up
import {
  initializeWebAnalytics,
  trackEventWeb,
  setUserIdWeb,
  setUserPropertiesWeb,
  resetAnalyticsWeb,
} from '@/lib/analytics.web';

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

    it('does not reinitialize if app already exists', async () => {
      (getApps as jest.Mock).mockReturnValue([{ name: 'existing' }]);

      await initializeWebAnalytics(mockConfig);

      expect(initializeApp).not.toHaveBeenCalled();
    });

    it('handles unsupported browsers gracefully', async () => {
      (isSupported as jest.Mock).mockResolvedValue(false);

      await expect(initializeWebAnalytics(mockConfig)).resolves.not.toThrow();
    });
  });

  describe('trackEventWeb', () => {
    it('calls logEvent with event name and params', () => {
      trackEventWeb('test_event', { param1: 'value1' });

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', { param1: 'value1' });
    });

    it('calls logEvent without params when none provided', () => {
      trackEventWeb('test_event');

      expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'test_event', undefined);
    });
  });

  describe('setUserIdWeb', () => {
    it('sets user ID', () => {
      setUserIdWeb('user-123');

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), 'user-123');
    });

    it('clears user ID when null', () => {
      setUserIdWeb(null);

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), null);
    });
  });

  describe('setUserPropertiesWeb', () => {
    it('sets user properties', () => {
      const props = { theme_preference: 'dark' as const };
      setUserPropertiesWeb(props);

      expect(setUserProperties).toHaveBeenCalledWith(expect.anything(), props);
    });
  });

  describe('resetAnalyticsWeb', () => {
    it('clears user ID', async () => {
      await resetAnalyticsWeb();

      expect(setUserId).toHaveBeenCalledWith(expect.anything(), null);
    });
  });
});
