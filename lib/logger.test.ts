import { logger } from './logger';
import * as Sentry from '@sentry/react-native';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          category: 'error',
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
});
