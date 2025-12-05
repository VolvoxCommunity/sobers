/**
 * @fileoverview Tests for lib/sentry.ts
 *
 * Tests the Sentry initialization and utility functions including:
 * - Initialization logic
 * - User context management
 * - Custom context
 * - Error capturing
 * - Component wrapping
 */

// =============================================================================
// Mocks
// =============================================================================

// Mock Sentry before importing the module
// Define mocks outside factory so they persist across resetModules()
const mockInit = jest.fn();
const mockSetUser = jest.fn();
const mockSetContext = jest.fn();
const mockCaptureException = jest.fn();
const mockWrap = jest.fn((component) => component);
const mockReactNavigationIntegration = jest.fn(() => ({ name: 'ReactNavigation' }));
const mockMobileReplayIntegration = jest.fn(() => ({ name: 'MobileReplay' }));
const mockFeedbackIntegration = jest.fn(() => ({ name: 'Feedback' }));

// Use factory function that returns the same mock references directly
// This ensures mocks persist across resetModules()
jest.mock('@sentry/react-native', () => {
  // Return the same mock functions directly (not wrapped) so they persist
  return {
    init: mockInit,
    setUser: mockSetUser,
    setContext: mockSetContext,
    captureException: mockCaptureException,
    wrap: mockWrap,
    reactNavigationIntegration: mockReactNavigationIntegration,
    mobileReplayIntegration: mockMobileReplayIntegration,
    feedbackIntegration: mockFeedbackIntegration,
  };
});

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    extra: {
      eas: {
        buildNumber: '123',
      },
    },
  },
}));

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(() => false),
}));

jest.mock('@/lib/sentry-privacy', () => ({
  privacyBeforeSend: jest.fn((event) => event),
  privacyBeforeBreadcrumb: jest.fn((breadcrumb) => breadcrumb),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('Sentry Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Don't reset modules in beforeEach - it causes issues with mock tracking
    // Only reset modules in specific tests that need it
    process.env = { ...originalEnv };
    // Set up DSN for most tests
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initializeSentry', () => {
    it('initializes Sentry when DSN is configured', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.init.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeSentry } = require('@/lib/sentry');
      initializeSentry();

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.init).toHaveBeenCalledTimes(1);
      expect(sentryModule.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          enableLogs: true,
          sendDefaultPii: true,
          enableAutoSessionTracking: true,
          tracesSampleRate: 1.0,
        })
      );
    });

    it('skips initialization when DSN is not configured', () => {
      mockInit.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeSentry } = require('@/lib/sentry');
      initializeSentry();

      expect(mockInit).not.toHaveBeenCalled();
    });

    it('sets environment to development when __DEV__ is true', () => {
      // Save original __DEV__ value and set to true for this test
      const originalDev = global.__DEV__;
      (global as unknown as { __DEV__: boolean }).__DEV__ = true;

      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.init.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeSentry } = require('@/lib/sentry');
      initializeSentry();

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.init).toHaveBeenCalledTimes(1);
      expect(sentryModule.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
        })
      );

      // Restore original value
      (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
    });

    it('handles Sentry.init throwing an error', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      const initError = new Error('Sentry init failed');
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');

      // Clear and mock init to throw error AFTER re-requiring
      sentryModule.init.mockClear();
      sentryModule.init.mockImplementation(() => {
        throw initError;
      });

      // Spy on console.error to verify it's called
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeSentry } = require('@/lib/sentry');

      // Should not throw
      expect(() => initializeSentry()).not.toThrow();

      // Should log the error
      expect(consoleSpy).toHaveBeenCalledWith('[Sentry] Failed to initialize:', initError);

      consoleSpy.mockRestore();
      // Reset mock implementation
      sentryModule.init.mockImplementation(() => {});
    });
  });

  describe('setSentryUser', () => {
    it('sets user context with user ID', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.setUser.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setSentryUser } = require('@/lib/sentry');
      setSentryUser('user-123');

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.setUser).toHaveBeenCalledWith({ id: 'user-123' });
    });

    it('does not set user when DSN is not configured', () => {
      mockSetUser.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setSentryUser } = require('@/lib/sentry');
      setSentryUser('user-123');

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  describe('clearSentryUser', () => {
    it('clears user context', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.setUser.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { clearSentryUser } = require('@/lib/sentry');
      clearSentryUser();

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.setUser).toHaveBeenCalledWith(null);
    });

    it('does not clear user when DSN is not configured', () => {
      mockSetUser.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { clearSentryUser } = require('@/lib/sentry');
      clearSentryUser();

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  describe('setSentryContext', () => {
    it('sets custom context', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.setContext.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setSentryContext } = require('@/lib/sentry');
      setSentryContext('profile', { id: 'user-123', role: 'sponsor' });

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.setContext).toHaveBeenCalledWith('profile', {
        id: 'user-123',
        role: 'sponsor',
      });
    });

    it('does not set context when DSN is not configured', () => {
      mockSetContext.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setSentryContext } = require('@/lib/sentry');
      setSentryContext('profile', { id: 'user-123' });

      expect(mockSetContext).not.toHaveBeenCalled();
    });
  });

  describe('wrapRootComponent', () => {
    it('wraps component with Sentry error boundary', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();
      const TestComponent = () => null;

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.wrap.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { wrapRootComponent } = require('@/lib/sentry');
      const wrapped = wrapRootComponent(TestComponent);

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.wrap).toHaveBeenCalledWith(TestComponent);
      expect(wrapped).toBe(TestComponent); // Our mock returns the same component
    });

    it('returns original component when DSN is not configured', () => {
      mockWrap.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();
      const TestComponent = () => null;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { wrapRootComponent } = require('@/lib/sentry');
      const wrapped = wrapRootComponent(TestComponent);

      expect(mockWrap).not.toHaveBeenCalled();
      expect(wrapped).toBe(TestComponent);
    });
  });

  describe('captureSentryException', () => {
    it('captures exception with context', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();
      const error = new Error('Test error');
      const context = { userId: 'user-123' };

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.captureException.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureSentryException } = require('@/lib/sentry');
      captureSentryException(error, context);

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.captureException).toHaveBeenCalledWith(error, {
        contexts: context,
      });
    });

    it('captures exception without context', () => {
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      jest.resetModules();
      const error = new Error('Test error');

      // Re-require the mocked module to get the mock reference after reset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sentryModule = require('@sentry/react-native');
      // Clear mocks after re-requiring to ensure clean state
      sentryModule.captureException.mockClear();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureSentryException } = require('@/lib/sentry');
      captureSentryException(error);

      // After resetModules, check the mock from the re-required module
      expect(sentryModule.captureException).toHaveBeenCalledWith(error, {
        contexts: undefined,
      });
    });

    it('does not capture exception when DSN is not configured', () => {
      mockCaptureException.mockClear();
      // Set env var BEFORE resetModules so it's available when module loads
      process.env.EXPO_PUBLIC_SENTRY_DSN = '';
      jest.resetModules();
      const error = new Error('Test error');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureSentryException } = require('@/lib/sentry');
      captureSentryException(error);

      expect(mockCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('navigationIntegration', () => {
    it('exports navigation integration', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { navigationIntegration } = require('@/lib/sentry');

      expect(navigationIntegration).toEqual({ name: 'ReactNavigation' });
      expect(mockReactNavigationIntegration).toHaveBeenCalled();
    });
  });
});
