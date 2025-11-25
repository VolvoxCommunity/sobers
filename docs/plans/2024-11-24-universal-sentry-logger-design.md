# Universal Sentry Logger Design

**Date:** 2024-11-24
**Status:** Approved
**Related Issues:** #19 (Epic), #20-#34 (Implementation tasks)

## Overview

A centralized, type-safe logging library that routes all application logs through Sentry with proper breadcrumb tracking, while providing a drop-in replacement for console methods with enhanced debugging capabilities.

## Goals

- ✅ Type-safe logging API with IntelliSense support
- ✅ All logs tracked in Sentry as breadcrumbs
- ✅ Preserve privacy scrubbing for sensitive data
- ✅ Development-friendly console output
- ✅ User action tracking
- ✅ Eliminate all direct console usage (48 calls across 11 files)

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────┐
│                  Application Code                    │
│  (contexts, screens, components)                     │
└───────────────────────┬─────────────────────────────┘
                        │
                        │ import { logger }
                        ▼
┌─────────────────────────────────────────────────────┐
│                   lib/logger.ts                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Public API: debug, info, warn, error, trace │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│         ┌───────────┴───────────┐                   │
│         ▼                       ▼                    │
│  ┌──────────────┐      ┌──────────────┐            │
│  │   Sentry     │      │   Console    │            │
│  │ Breadcrumbs  │      │   Output     │            │
│  │ (all envs)   │      │ (__DEV__)    │            │
│  └──────────────┘      └──────────────┘            │
└─────────────────────────────────────────────────────┘
```

### Dependency Flow

- **Application code** → `logger` (never imports Sentry directly)
- **logger.ts** → `@sentry/react-native` (checks if initialized via try/catch)
- **Privacy scrubbing** → Automatic via existing `beforeBreadcrumb` hook in `lib/sentry-privacy.ts`

The logger is safe to import anywhere because it gracefully handles cases where Sentry isn't initialized yet.

## API Design

### Type Definitions

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  trace(message: string, metadata?: Record<string, any>): void;
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
```

### Core Logger Instance

```typescript
export const logger: Logger = {
  debug: (msg, meta) => log('debug', msg, undefined, meta),
  info: (msg, meta) => log('info', msg, undefined, meta),
  warn: (msg, meta) => log('warn', msg, undefined, meta),
  error: (msg, err, meta) => log('error', msg, err, meta),
  trace: (msg, meta) => log('trace', msg, undefined, meta),
};
```

### Usage Examples

```typescript
import { logger, LogCategory } from '@/lib/logger';

// Basic logging
logger.info('User logged in');
logger.debug('Fetching user profile');

// With metadata
logger.info('Task completed', { taskId: '123', duration: 450 });

// With type-safe categories
logger.info('User signed in', {
  category: LogCategory.AUTH,
  userId: '123',
  provider: 'google'
});

// Errors with context
logger.error('Failed to fetch data', fetchError, { userId: '456' });

// Without category - defaults to 'log'
logger.warn('Rate limit approaching', { remaining: 10, limit: 100 });
```

## Implementation Details

### Internal Log Function

All public methods funnel through a single internal `log()` function:

```typescript
function log(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): void {
  // 1. Create Sentry breadcrumb (all environments)
  createBreadcrumb(level, message, error, metadata);

  // 2. Output to console (development only)
  if (__DEV__) {
    logToConsole(level, message, error, metadata);
  }
}
```

### Sentry Breadcrumb Creation

```typescript
function createBreadcrumb(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): void {
  try {
    // Extract category from metadata to avoid duplication in data object.
    // When metadata is nullish, defaults to {} so category becomes undefined,
    // which is then handled by the fallback to 'log' below.
    const { category, ...restMetadata } = metadata ?? {};

    Sentry.addBreadcrumb({
      level: mapLevelToSentry(level),
      category: typeof category === 'string' ? category : 'log',
      message,
      data: {
        ...restMetadata,
        ...(error && { error: error.message, stack: error.stack }),
      },
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    // Silently fail if Sentry not initialized - don't break app
  }
}

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
```

**Design Decisions:**
- Try/catch around Sentry calls prevents crashes if Sentry isn't initialized
- Error objects serialized to `{ error: message, stack: trace }` in breadcrumb data
- Category defaults to `'log'` if not provided in metadata
- Timestamp uses seconds (Sentry convention)

### Development Console Output

```typescript
function logToConsole(
  level: LogLevel,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
): void {
  const consoleMethod = getConsoleMethod(level);

  // Format: [DEBUG] Message
  const formattedMessage = `[${level.toUpperCase()}] ${message}`;

  // Log with appropriate console method
  if (error) {
    consoleMethod(formattedMessage, error, metadata || '');
  } else if (metadata && Object.keys(metadata).length > 0) {
    consoleMethod(formattedMessage, metadata);
  } else {
    consoleMethod(formattedMessage);
  }
}

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
```

**Console Output Examples:**
```
[INFO] User logged in { userId: '123' }
[WARN] Rate limit approaching { remaining: 10, limit: 100 }
[ERROR] Database query failed
  Error: Connection timeout
    at executeQuery (database.ts:45)
  { query: 'SELECT...', userId: '456' }
```

## Log Level Behavior

All log levels create Sentry breadcrumbs in all environments. Console output only in development:

```
Development (__DEV__ = true):
  debug() → Console + Sentry breadcrumb
  info()  → Console + Sentry breadcrumb
  warn()  → Console + Sentry breadcrumb
  error() → Console + Sentry breadcrumb

Production (__DEV__ = false):
  debug() → Sentry breadcrumb only (no console)
  info()  → Sentry breadcrumb only (no console)
  warn()  → Sentry breadcrumb only (no console)
  error() → Sentry breadcrumb only (no console)
```

**Rationale:**
- All logs provide context in Sentry, even debug logs
- Simpler mental model (console in dev, silent in prod)
- Debug breadcrumbs help trace issues in development
- Can filter by level in Sentry dashboard if debug is too noisy

## Log Categories

Categories are **optional** and help organize logs in Sentry:

```typescript
export enum LogCategory {
  AUTH = 'auth',           // Authentication and authorization
  NAVIGATION = 'navigation', // Screen/route changes
  DATABASE = 'database',    // Supabase queries
  API = 'http',            // External API calls
  UI = 'ui',               // User interface events
  STORAGE = 'storage',     // Local storage operations
  NOTIFICATION = 'notification', // Push notifications
  SYNC = 'sync',           // Data synchronization
  ERROR = 'error',         // Error handling
}
```

**Usage Patterns:**
- Enum provides IntelliSense but strings also work
- Default to `'log'` category if not specified
- No validation - Sentry accepts any category string
- Filter in Sentry: `category:auth`, `category:database`, etc.

**Design Philosophy:**
- YAGNI: Only add category when it provides value
- Flexible: Not required, use when useful for filtering
- Type-safe: Enum prevents typos but doesn't restrict

## Sentry Initialization Logging

**Challenge:** Logger imports Sentry, but Sentry init also needs logging (circular dependency).

**Solution:** Keep console for Sentry init only with ESLint exceptions.

```typescript
// lib/sentry.ts
function initializeSentry(): void {
  if (!shouldInitialize()) {
    // eslint-disable-next-line no-console
    console.warn('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  const environment = getEnvironment();
  // eslint-disable-next-line no-console
  console.log(`[Sentry] Initializing for environment: ${environment}`);

  try {
    Sentry.init({ ... });
    // eslint-disable-next-line no-console
    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Sentry] Failed to initialize:', error);
  }
}
```

**Rationale:**
- Simple and practical
- Only 4 ESLint exceptions in a single file
- Keeps the logger module simple
- Init feedback valuable during development

## Privacy & Security

**Automatic Privacy Scrubbing:**
- All breadcrumbs pass through existing `beforeBreadcrumb` hook in `lib/sentry-privacy.ts`
- Sensitive fields automatically filtered: `email`, `password`, `token`, `sobriety_date`, etc.
- Email addresses redacted from messages
- No additional scrubbing needed in logger

**Zero Trust:**
- Logger doesn't validate or filter data
- Trust Sentry's privacy hooks to handle scrubbing
- Developers can log freely, privacy handled centrally

## Testing Strategy

### Unit Tests (`lib/logger.test.ts`)

**Coverage Requirements:**
- 80%+ coverage (project standard)
- All log levels tested
- Metadata handling verified
- Error object serialization tested
- Console output mocked and verified

**Test Structure:**
```typescript
import { logger, LogCategory } from './logger';
import * as Sentry from '@sentry/react-native';

jest.mock('@sentry/react-native');

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

    it('includes metadata in breadcrumb', () => {
      logger.info('Test', { userId: '123', category: LogCategory.AUTH });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          data: expect.objectContaining({ userId: '123' }),
        })
      );
    });
  });

  describe('error()', () => {
    it('includes error details in breadcrumb', () => {
      const error = new Error('Test error');
      logger.error('Failed', error, { userId: '456' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          data: expect.objectContaining({
            userId: '456',
            error: 'Test error',
            stack: expect.any(String),
          }),
        })
      );
    });
  });

  describe('console output', () => {
    it('outputs to console in dev mode', () => {
      // Mock __DEV__ = true and verify console calls
    });

    it('suppresses console in production', () => {
      // Mock __DEV__ = false and verify no console calls
    });
  });
});
```

### Integration Tests (`lib/logger.integration.test.ts`)

Test logger in real component scenarios:
- AuthContext authentication flow
- Error scenarios with actual Sentry SDK
- Breadcrumb trail verification
- Privacy scrubbing validation

## Implementation Plan

### Phase 1: Core Infrastructure (Issues #20-22, #27, #31)
1. Create logger module with type-safe API
2. Integrate with Sentry breadcrumbs
3. Add development console fallback
4. Write unit tests (80%+ coverage)
5. Update Sentry initialization logging

### Phase 2: Migration (Issues #23-26, #34)
1. Create migration script (optional, for automation)
2. Migrate core contexts (Auth, Theme) - 19 console calls
3. Migrate screen components - 19 console calls
4. Migrate utility components - 6 console calls
5. Add ESLint `no-console` rule with pre-commit enforcement

### Phase 3: Enhanced Features (Issues #29-30, #32-33)
1. Finalize log categories
2. Add user action tracking
3. Integration tests
4. Documentation (CLAUDE.md update + usage guide)

**Total Estimated Effort:** 43-57 hours

## File Structure

```
lib/
├── logger.ts              # Core logger module (new)
├── logger.test.ts         # Unit tests (new)
├── logger.integration.test.ts  # Integration tests (new)
├── sentry.ts              # Existing Sentry config (minor updates)
└── sentry-privacy.ts      # Existing privacy scrubbing (no changes)

docs/
└── plans/
    └── 2024-11-24-universal-sentry-logger-design.md  # This document
```

## Success Criteria

- [ ] All 48 console statements migrated to logger
- [ ] Zero `console.*` calls in production code (enforced by ESLint)
- [ ] Logs appear as Sentry breadcrumbs with proper metadata
- [ ] 80%+ test coverage for logger module
- [ ] Documentation updated in CLAUDE.md
- [ ] No performance degradation
- [ ] Privacy scrubbing verified for all log types

## Migration Examples

### Before (Console)
```typescript
// contexts/AuthContext.tsx
console.log('[Google Auth] Opening browser with URL:', data.url);
console.error('[Google Auth] setSession error:', sessionError);

// app/(tabs)/profile.tsx
console.error('Error updating sobriety date:', error);

// app/(tabs)/journey.tsx
console.error('Error fetching timeline data:', err);
```

### After (Logger)
```typescript
// contexts/AuthContext.tsx
import { logger, LogCategory } from '@/lib/logger';

logger.debug('[Google Auth] Opening browser', {
  category: LogCategory.AUTH,
  url: data.url
});

logger.error('[Google Auth] Session creation failed', sessionError, {
  category: LogCategory.AUTH,
  provider: 'google'
});

// app/(tabs)/profile.tsx
logger.error('Sobriety date update failed', error, {
  category: LogCategory.DATABASE,
  screen: 'profile',
  userId: user?.id
});

// app/(tabs)/journey.tsx
logger.error('Timeline data fetch failed', err, {
  category: LogCategory.DATABASE,
  screen: 'journey',
  userId: user?.id
});
```

## Benefits

- 🔍 **Better Debugging**: Full context in Sentry for every error
- 📊 **Analytics**: Track user actions and app behavior patterns
- 🔒 **Privacy**: Centralized scrubbing rules applied to all logs automatically
- 🚀 **Developer Experience**: Type-safe API with IntelliSense
- 🛡️ **Quality**: ESLint enforcement prevents regressions
- 🎯 **Consistency**: Single logging interface across entire codebase
- 🔧 **Maintainability**: Easy to add features (timing, filtering) in one place

## Open Questions

None - design is approved and ready for implementation.

## References

- Epic Issue: #19
- Implementation Issues: #20-#34
- Sentry Breadcrumbs API: https://docs.sentry.io/platforms/react-native/enriching-events/breadcrumbs/
- Project Standards: CLAUDE.md (80% test coverage, TypeScript strict mode)
