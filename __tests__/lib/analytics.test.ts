// __tests__/lib/analytics.test.ts
import { Platform } from 'react-native';

import {
  initializeAnalytics,
  trackEvent,
  setUserId,
  setUserProperties,
  trackScreenView,
  resetAnalytics,
  AnalyticsEvents,
  calculateDaysSoberBucket,
} from '@/lib/analytics';
import { trackEventWeb, setUserIdWeb, setUserPropertiesWeb } from '@/lib/analytics.web';
import { sanitizeParams, shouldInitializeAnalytics } from '@/lib/analytics-utils';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: jest.fn(
      (options: { web?: unknown; default?: unknown }) => options.web ?? options.default
    ),
  },
}));

// Mock the platform-specific modules
jest.mock('@/lib/analytics.web', () => ({
  initializeWebAnalytics: jest.fn(() => Promise.resolve()),
  trackEventWeb: jest.fn(),
  setUserIdWeb: jest.fn(),
  setUserPropertiesWeb: jest.fn(),
  trackScreenViewWeb: jest.fn(),
  resetAnalyticsWeb: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/analytics.native', () => ({
  initializeNativeAnalytics: jest.fn(() => Promise.resolve()),
  trackEventNative: jest.fn(() => Promise.resolve()),
  setUserIdNative: jest.fn(() => Promise.resolve()),
  setUserPropertiesNative: jest.fn(() => Promise.resolve()),
  trackScreenViewNative: jest.fn(() => Promise.resolve()),
  resetAnalyticsNative: jest.fn(() => Promise.resolve()),
}));

// Mock analytics-utils
jest.mock('@/lib/analytics-utils', () => ({
  sanitizeParams: jest.fn((params) => params),
  shouldInitializeAnalytics: jest.fn(() => true),
  isDebugMode: jest.fn(() => false),
  calculateDaysSoberBucket: jest.fn(() => '31-90'),
}));

describe('Unified Analytics Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (shouldInitializeAnalytics as jest.Mock).mockReturnValue(true);
  });

  describe('initializeAnalytics', () => {
    it('does not initialize when config is missing', async () => {
      (shouldInitializeAnalytics as jest.Mock).mockReturnValue(false);

      await initializeAnalytics();

      // Should return early without calling platform init
      expect(trackEventWeb).not.toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('sanitizes params before tracking', () => {
      const params = { task_id: '123', email: 'test@test.com' };
      trackEvent('test_event', params);

      expect(sanitizeParams).toHaveBeenCalledWith(params);
    });

    it('tracks event on web platform', () => {
      trackEvent('test_event', { task_id: '123' });

      expect(trackEventWeb).toHaveBeenCalledWith('test_event', { task_id: '123' });
    });
  });

  describe('setUserId', () => {
    it('sets user ID on web platform', () => {
      setUserId('user-123');

      expect(setUserIdWeb).toHaveBeenCalledWith('user-123');
    });

    it('clears user ID when null', () => {
      setUserId(null);

      expect(setUserIdWeb).toHaveBeenCalledWith(null);
    });
  });

  describe('setUserProperties', () => {
    it('sets user properties on web platform', () => {
      const props = { theme_preference: 'dark' as const };
      setUserProperties(props);

      expect(setUserPropertiesWeb).toHaveBeenCalledWith(props);
    });
  });

  describe('exports', () => {
    it('re-exports AnalyticsEvents', () => {
      expect(AnalyticsEvents).toBeDefined();
      expect(AnalyticsEvents.AUTH_LOGIN).toBe('auth_login');
    });

    it('re-exports calculateDaysSoberBucket', () => {
      expect(calculateDaysSoberBucket).toBeDefined();
      expect(typeof calculateDaysSoberBucket).toBe('function');
    });
  });
});
