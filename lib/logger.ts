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
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Internal log function that handles Sentry breadcrumbs and console output.
 *
 * @param level - The severity level of the log
 * @param message - Human-readable log message
 * @param error - Optional Error object for error-level logs
 * @param metadata - Optional structured data to attach to the log
 */
function log(level: LogLevel, message: string, error?: Error, metadata?: LogMetadata): void {
  createBreadcrumb(level, message, error, metadata);

  if (__DEV__) {
    logToConsole(level, message, error, metadata);
  }
}

/**
 * Safely extract the category string from metadata.
 * Returns 'log' as default if category is not a valid string.
 *
 * @param metadata - The log metadata object
 * @returns The category string or 'log' default
 */
function extractCategory(metadata?: LogMetadata): string {
  if (!metadata?.category) return 'log';
  return typeof metadata.category === 'string' ? metadata.category : 'log';
}

/**
 * Create Sentry breadcrumb with proper level mapping.
 * Silently fails if Sentry is not initialized to prevent errors.
 *
 * @param level - The log level (debug, info, warn, error, trace)
 * @param message - The log message
 * @param error - Optional Error object with stack trace
 * @param metadata - Optional additional context
 */
function createBreadcrumb(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: LogMetadata
): void {
  try {
    // Build breadcrumb data, casting to Record<string, any> for Sentry compatibility
    const breadcrumbData: Record<string, unknown> = {
      ...metadata,
      ...(error && { error: error.message, stack: error.stack }),
    };

    Sentry.addBreadcrumb({
      level: mapLevelToSentry(level),
      category: extractCategory(metadata),
      message,
      // Sentry expects Record<string, any>, but our data is safe to pass
      data: breadcrumbData as Record<string, unknown>,
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
