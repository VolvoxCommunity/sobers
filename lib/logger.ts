import * as Sentry from '@sentry/react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

/**
 * Type-safe metadata for log entries.
 * Uses `unknown` instead of `any` to enforce type checking at call sites.
 */
export type LogMetadata = Record<string, unknown>;

export interface Logger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, error?: Error, metadata?: LogMetadata): void;
  trace(message: string, metadata?: LogMetadata): void;
}

export enum LogCategory {
  AUTH = 'auth',
  NAVIGATION = 'navigation',
  DATABASE = 'database',
  API = 'http',
  UI = 'ui',
  STORAGE = 'storage',
  NOTIFICATION = 'notification',
  SYNC = 'sync',
  ERROR = 'error',
  ANALYTICS = 'analytics',
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Internal log function that handles Sentry breadcrumbs, error capture, and console output.
 *
 * @param level - The severity level of the log
 * @param message - Human-readable log message
 * @param error - Optional Error object for error-level logs
 * @param metadata - Optional structured data to attach to the log
 */
function log(level: LogLevel, message: string, error?: Error, metadata?: LogMetadata): void {
  createBreadcrumb(level, message, error, metadata);

  // For error-level logs with an Error object, capture to Sentry
  // This sends the error to Sentry immediately (not just as a breadcrumb)
  if (level === 'error' && error) {
    captureErrorToSentry(message, error, metadata);
  }

  if (__DEV__) {
    logToConsole(level, message, error, metadata);
  }
}

/**
 * Capture an error to Sentry with context.
 * Silently fails if Sentry is not initialized.
 *
 * @param message - Human-readable error message
 * @param error - The Error object to capture
 * @param metadata - Optional additional context
 */
function captureErrorToSentry(message: string, error: Error, metadata?: LogMetadata): void {
  try {
    const { category, ...extraContext } = metadata ?? {};

    Sentry.captureException(error, {
      tags: {
        category: typeof category === 'string' ? category : 'uncategorized',
      },
      extra: {
        message,
        ...extraContext,
      },
    });
  } catch {
    // Silently fail if Sentry not initialized
    if (__DEV__) {
      console.debug('[Logger] Sentry not initialized, error not captured');
    }
  }
}

/**
 * Reserved keys used internally for error information in breadcrumb data.
 * These keys should not be used in metadata to avoid silent overwrites.
 */
const RESERVED_ERROR_KEYS = ['error_message', 'error_stack', 'error_name'] as const;

/**
 * Build error info object with namespaced keys to avoid conflicts with user metadata.
 * Uses 'error_message', 'error_stack', and 'error_name' instead of 'error' and 'stack'
 * to prevent silent overwrites if metadata contains those common keys.
 *
 * @param error - The Error object to extract info from
 * @returns Object with namespaced error properties
 */
function buildErrorInfo(error: Error): Record<string, unknown> {
  return {
    error_message: error.message,
    error_stack: error.stack,
    error_name: error.name,
  };
}

/**
 * Create Sentry breadcrumb with proper level mapping.
 * Silently fails if Sentry is not initialized to prevent errors.
 *
 * @remarks
 * Error information is stored with namespaced keys ('error_message', 'error_stack',
 * 'error_name') to avoid conflicts with user-provided metadata. These keys are
 * reserved and should not be used in metadata.
 *
 * @param level - The log level (debug, info, warn, error, trace)
 * @param message - The log message
 * @param error - Optional Error object with stack trace
 * @param metadata - Optional additional context (avoid using reserved keys)
 */
function createBreadcrumb(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: LogMetadata
): void {
  try {
    // Warn in development if metadata contains reserved keys
    if (__DEV__ && metadata) {
      const conflicts = RESERVED_ERROR_KEYS.filter((key) => key in metadata);
      if (conflicts.length > 0) {
        console.warn(
          `[Logger] Metadata contains reserved keys that will be overwritten: ${conflicts.join(', ')}`
        );
      }
    }

    // Extract category for breadcrumb field, spread remaining metadata into data
    // This prevents duplicate 'category' keys in the breadcrumb
    const { category, ...restMetadata } = metadata ?? {};

    // Build breadcrumb data with namespaced error keys to avoid conflicts
    const breadcrumbData: Record<string, unknown> = {
      ...restMetadata,
      ...(error && buildErrorInfo(error)),
    };

    Sentry.addBreadcrumb({
      level: mapLevelToSentry(level),
      category: typeof category === 'string' ? category : 'log',
      message,
      data: breadcrumbData,
      timestamp: Date.now() / 1000,
    });
  } catch {
    // Silently fail if Sentry not initialized
  }
}

/**
 * Map logger levels to Sentry breadcrumb levels
 */
function mapLevelToSentry(level: LogLevel): Sentry.SeverityLevel {
  const mapping: Record<LogLevel, Sentry.SeverityLevel> = {
    debug: 'debug',
    info: 'info',
    warn: 'warning',
    error: 'error',
    trace: 'debug',
  };
  return mapping[level];
}

/**
 * Output formatted log to console in development.
 * Console methods accept unknown values and stringify them appropriately.
 *
 * @param level - The log level for formatting
 * @param message - The log message
 * @param error - Optional Error object
 * @param metadata - Optional metadata to display
 */
function logToConsole(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: LogMetadata
): void {
  const consoleMethod = getConsoleMethod(level);
  const formattedMessage = `[${level.toUpperCase()}] ${message}`;

  const hasMetadata = metadata && Object.keys(metadata).length > 0;

  if (error) {
    // Only include metadata if it has content to avoid cluttering output
    if (hasMetadata) {
      consoleMethod(formattedMessage, error, metadata);
    } else {
      consoleMethod(formattedMessage, error);
    }
  } else if (hasMetadata) {
    consoleMethod(formattedMessage, metadata);
  } else {
    consoleMethod(formattedMessage);
  }
}

/**
 * Map log level to appropriate console method
 */
function getConsoleMethod(level: LogLevel): Console['log'] {
  const methods: Record<LogLevel, Console['log']> = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
    trace: console.trace,
  };
  return methods[level];
}

// =============================================================================
// Exported Logger
// =============================================================================

/**
 * Universal logger that routes all logs through Sentry breadcrumbs
 * with development console fallback.
 *
 * @example
 * ```typescript
 * import { logger, LogCategory } from '@/lib/logger';
 *
 * // Basic logging
 * logger.info('User logged in');
 *
 * // With metadata
 * logger.info('Task completed', { taskId: '123', duration: 450 });
 *
 * // With category
 * logger.info('User signed in', {
 *   category: LogCategory.AUTH,
 *   userId: '123',
 * });
 *
 * // Errors with context
 * logger.error('Failed to fetch data', fetchError, { userId: '456' });
 * ```
 */
export const logger: Logger = {
  debug: (msg, meta) => log('debug', msg, undefined, meta),
  info: (msg, meta) => log('info', msg, undefined, meta),
  warn: (msg, meta) => log('warn', msg, undefined, meta),
  error: (msg, err, meta) => log('error', msg, err, meta),
  trace: (msg, meta) => log('trace', msg, undefined, meta),
};
