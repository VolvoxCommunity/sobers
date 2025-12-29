// __tests__/lib/analytics.web.test.ts
import * as amplitude from '@amplitude/analytics-browser';

import {
  initializePlatformAnalytics,
  trackEventPlatform,
  setUserIdPlatform,
  setUserPropertiesPlatform,
  trackScreenViewPlatform,
  resetAnalyticsPlatform,
  __resetForTesting,
} from '@/lib/analytics/platform.web';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  LogCategory: { ANALYTICS: 'analytics' },
}));

describe('lib/analytics/platform.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetForTesting();
  });

  describe('initializePlatformAnalytics', () => {
    it('should initialize Amplitude with API key', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledWith('test-key', undefined, expect.any(Object));
    });

    it('should not reinitialize if already initialized', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      expect(amplitude.init).toHaveBeenCalledTimes(1);
    });

    it('should rethrow initialization errors to allow retry', async () => {
      const mockError = new Error('Network error');
      (amplitude.init as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });

      await expect(initializePlatformAnalytics({ apiKey: 'test-key' })).rejects.toThrow(
        'Network error'
      );

      // Verify init was called
      expect(amplitude.init).toHaveBeenCalled();
    });
  });

  describe('trackEventPlatform', () => {
    it('should track event after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).toHaveBeenCalledWith('Test Event', { param: 'value' });
    });

    it('should not track event before initialization', () => {
      trackEventPlatform('Test Event', { param: 'value' });

      expect(amplitude.track).not.toHaveBeenCalled();
    });
  });

  describe('setUserIdPlatform', () => {
    it('should set user ID after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform('user-123');

      expect(amplitude.setUserId).toHaveBeenCalledWith('user-123');
    });

    it('should clear user ID when null', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserIdPlatform(null);

      expect(amplitude.setUserId).toHaveBeenCalledWith(undefined);
    });

    it('should not set user ID before initialization', () => {
      setUserIdPlatform('user-123');

      expect(amplitude.setUserId).not.toHaveBeenCalled();
    });
  });

  describe('setUserPropertiesPlatform', () => {
    it('should set user properties after initialization', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserPropertiesPlatform({ has_sponsor: true, theme_preference: 'dark' });

      expect(amplitude.identify).toHaveBeenCalled();
    });

    it('should not set user properties before initialization', () => {
      setUserPropertiesPlatform({ has_sponsor: true });

      expect(amplitude.identify).not.toHaveBeenCalled();
    });

    it('should skip undefined property values', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      setUserPropertiesPlatform({ has_sponsor: true, theme_preference: undefined });

      expect(amplitude.identify).toHaveBeenCalled();
    });
  });

  describe('trackScreenViewPlatform', () => {
    it('should track screen view event', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackScreenViewPlatform('Home', 'TabScreen');

      expect(amplitude.track).toHaveBeenCalledWith('Screen Viewed', {
        screen_name: 'Home',
        screen_class: 'TabScreen',
      });
    });

    it('should use screen name as default screen class', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      trackScreenViewPlatform('Settings');

      expect(amplitude.track).toHaveBeenCalledWith('Screen Viewed', {
        screen_name: 'Settings',
        screen_class: 'Settings',
      });
    });
  });

  describe('resetAnalyticsPlatform', () => {
    it('should reset analytics state', async () => {
      await initializePlatformAnalytics({ apiKey: 'test-key' });

      await resetAnalyticsPlatform();

      expect(amplitude.reset).toHaveBeenCalled();
    });

    it('should not reset before initialization', async () => {
      await resetAnalyticsPlatform();

      expect(amplitude.reset).not.toHaveBeenCalled();
    });
  });
});
