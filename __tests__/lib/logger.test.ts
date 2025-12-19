import { logger, setVerboseLogging } from '@/lib/logger';
import * as Sentry from '@sentry/react-native';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure verbose logging is enabled for tests
    setVerboseLogging(true);
  });

  describe('info()', () => {
    it('creates Sentry breadcrumb with info level', () => {
      logger.info('Test message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'info',
        category: 'log',
        message: 'Test message',
        data: {},
        timestamp: expect.any(Number),
      });
    });

    it('includes metadata in breadcrumb data', () => {
      logger.info('Test message', { userId: '123', action: 'login' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'info',
        category: 'log',
        message: 'Test message',
        data: { userId: '123', action: 'login' },
        timestamp: expect.any(Number),
      });
    });

    it('uses custom category from metadata and removes it from data', () => {
      logger.info('User signed in', { category: 'auth', userId: '123' });

      // category is extracted to top-level breadcrumb field, not duplicated in data
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'info',
        category: 'auth',
        message: 'User signed in',
        data: { userId: '123' },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('warn()', () => {
    it('creates Sentry breadcrumb with warning level', () => {
      logger.warn('Warning message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'warning',
        category: 'log',
        message: 'Warning message',
        data: {},
        timestamp: expect.any(Number),
      });
    });
  });

  describe('error()', () => {
    it('creates Sentry breadcrumb with error level', () => {
      logger.error('Error message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        category: 'log',
        message: 'Error message',
        data: {},
        timestamp: expect.any(Number),
      });
    });

    it('includes error object in breadcrumb data with namespaced keys', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        category: 'log',
        message: 'Operation failed',
        data: {
          error_message: 'Test error',
          error_stack: expect.any(String),
          error_name: 'Error',
        },
        timestamp: expect.any(Number),
      });
    });

    it('includes both error and metadata without key conflicts', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error, { userId: '456', operation: 'delete' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'error',
        category: 'log',
        message: 'Operation failed',
        data: {
          userId: '456',
          operation: 'delete',
          error_message: 'Test error',
          error_stack: expect.any(String),
          error_name: 'Error',
        },
        timestamp: expect.any(Number),
      });
    });

    it('captures error to Sentry when Error object is provided', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          // Default category when none provided is 'uncategorized'
          category: 'uncategorized',
        },
        extra: {
          message: 'Operation failed',
        },
      });
    });

    it('captures error to Sentry with custom category', () => {
      const error = new Error('Auth failed');
      logger.error('Login failed', error, { category: 'auth', userId: '123' });

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          category: 'auth',
        },
        extra: {
          message: 'Login failed',
          userId: '123',
        },
      });
    });

    it('does not capture to Sentry when no Error object is provided', () => {
      logger.error('Error message without Error object');

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('debug()', () => {
    it('creates Sentry breadcrumb with debug level', () => {
      logger.debug('Debug message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'debug',
        category: 'log',
        message: 'Debug message',
        data: {},
        timestamp: expect.any(Number),
      });
    });
  });

  describe('trace()', () => {
    it('creates Sentry breadcrumb with debug level', () => {
      logger.trace('Trace message');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        level: 'debug',
        category: 'log',
        message: 'Trace message',
        data: {},
        timestamp: expect.any(Number),
      });
    });
  });

  describe('development mode console output', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('logs to console.info in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.info('Info message');

      expect(consoleSpy).toHaveBeenCalledWith('[INFO] Info message');
      consoleSpy.mockRestore();
    });

    it('logs to console.warn in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledWith('[WARN] Warning message');
      consoleSpy.mockRestore();
    });

    it('logs to console.error in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.error('Error message');

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Error message');
      consoleSpy.mockRestore();
    });

    it('logs to console.debug in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      logger.debug('Debug message');

      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] Debug message');
      consoleSpy.mockRestore();
    });

    it('logs to console.trace in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'trace').mockImplementation();

      logger.trace('Trace message');

      expect(consoleSpy).toHaveBeenCalledWith('[TRACE] Trace message');
      consoleSpy.mockRestore();
    });

    it('includes error object in console output', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logger.error('Operation failed', error);

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Operation failed', error);
      consoleSpy.mockRestore();
    });

    it('includes metadata in console output', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.info('User action', { userId: '123', action: 'click' });

      expect(consoleSpy).toHaveBeenCalledWith('[INFO] User action', {
        userId: '123',
        action: 'click',
      });
      consoleSpy.mockRestore();
    });

    it('includes both error and metadata in console output', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logger.error('Operation failed', error, { userId: '456' });

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Operation failed', error, {
        userId: '456',
      });
      consoleSpy.mockRestore();
    });

    it('warns when metadata contains reserved keys', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.info('Test message', { error_message: 'should warn', userId: '123' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Logger] Metadata contains reserved keys that will be overwritten: error_message'
      );
      consoleWarnSpy.mockRestore();
    });

    it('warns for multiple reserved keys', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.info('Test message', {
        error_message: 'msg',
        error_stack: 'stack',
        error_name: 'name',
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Logger] Metadata contains reserved keys that will be overwritten: error_message, error_stack, error_name'
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Sentry error handling', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('silently catches Sentry captureException errors in development', () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Make captureException throw
      (Sentry.captureException as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry not initialized');
      });

      const error = new Error('Test error');
      logger.error('Operation failed', error);

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[Logger] Sentry not initialized, error not captured'
      );

      consoleDebugSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('silently catches Sentry addBreadcrumb errors', () => {
      // Make addBreadcrumb throw
      (Sentry.addBreadcrumb as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sentry not initialized');
      });

      // Should not throw even when Sentry fails
      expect(() => logger.info('Test message')).not.toThrow();
    });
  });
});
