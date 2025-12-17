# Universal Logger

The universal logger provides centralized, structured logging for the Sobers application. All logs are sent to Sentry as breadcrumbs and output to the console in development.

## Quick Start

```typescript
import { logger, LogCategory } from '@/lib/logger';

// Error logging
try {
  await supabase.from('tasks').insert(data);
} catch (error) {
  logger.error('Task creation failed', error as Error, {
    category: LogCategory.DATABASE,
    userId: user.id,
  });
}

// Info logging
logger.info('User logged in successfully', {
  category: LogCategory.AUTH,
  userId: user.id,
});

// Debug logging
logger.debug('Component rendered', {
  category: LogCategory.UI,
  componentName: 'TaskList',
});
```

## API Reference

### Log Levels

The logger provides five log levels:

#### `logger.error(message, error, metadata?)`

Log errors that need attention. Always include the Error object.

```typescript
logger.error('Profile fetch failed', error as Error, {
  category: LogCategory.DATABASE,
  userId: profile.id,
});
```

**Parameters:**

- `message` (string): Human-readable error description
- `error` (Error): The error object to log
- `metadata` (object, optional): Additional context

**When to use:**

- Database operation failures
- API request failures
- Authentication errors
- Any exceptional condition that prevents normal operation

#### `logger.warn(message, metadata?)`

Log warnings that should be investigated but don't prevent operation.

```typescript
logger.warn('Cache miss, fetching from database', {
  category: LogCategory.DATABASE,
  key: cacheKey,
});
```

**Parameters:**

- `message` (string): Warning description
- `metadata` (object, optional): Additional context

**When to use:**

- Deprecated feature usage
- Fallback behavior triggered
- Missing optional data
- Performance concerns

#### `logger.info(message, metadata?)`

Log significant events in the application flow.

```typescript
logger.info('OAuth session created', {
  category: LogCategory.AUTH,
  provider: 'google',
});
```

**Parameters:**

- `message` (string): Event description
- `metadata` (object, optional): Additional context

**When to use:**

- Successful authentication
- Important state changes
- Milestone completions
- Feature activation

#### `logger.debug(message, metadata?)`

Log detailed information for debugging.

```typescript
logger.debug('Steps content loaded', {
  category: LogCategory.DATABASE,
  count: steps.length,
});
```

**Parameters:**

- `message` (string): Debug information
- `metadata` (object, optional): Additional context

**When to use:**

- Development debugging
- Detailed flow tracking
- Data transformation details
- Only active in development (`__DEV__` = true)

#### `logger.trace(message, metadata?)`

Log very detailed execution traces (rarely needed).

```typescript
logger.trace('Entering function', {
  category: LogCategory.UI,
  functionName: 'calculateTimeline',
});
```

**Parameters:**

- `message` (string): Trace information
- `metadata` (object, optional): Additional context

**When to use:**

- Very detailed debugging
- Performance profiling
- Rarely needed in application code

### Log Categories

Use `LogCategory` enum to categorize logs for easier filtering in Sentry.

```typescript
export enum LogCategory {
  AUTH = 'auth', // Authentication and authorization
  NAVIGATION = 'navigation', // Routing and navigation
  DATABASE = 'database', // Supabase operations
  API = 'http', // API requests
  UI = 'ui', // UI interactions and rendering
  STORAGE = 'storage', // Local storage operations
  NOTIFICATION = 'notification', // Push notifications
  SYNC = 'sync', // Data synchronization
  ERROR = 'error', // General errors
  ANALYTICS = 'analytics', // Analytics and tracking events
}
```

**Usage:**

```typescript
logger.error('Database query failed', error as Error, {
  category: LogCategory.DATABASE,
  table: 'profiles',
});
```

## Best Practices

### 1. Always Use Logger Instead of Console

❌ **Don't:**

```typescript
console.log('User logged in');
console.error('Error:', error);
```

✅ **Do:**

```typescript
logger.info('User logged in', { category: LogCategory.AUTH });
logger.error('Login failed', error as Error, { category: LogCategory.AUTH });
```

**Why:** The logger provides:

- Centralized tracking in Sentry
- Structured metadata
- Privacy scrubbing
- Development console output
- Consistent formatting

### 2. Include Contextual Metadata

❌ **Don't:**

```typescript
logger.error('Task creation failed', error as Error, {
  category: LogCategory.DATABASE,
});
```

✅ **Do:**

```typescript
logger.error('Task creation failed', error as Error, {
  category: LogCategory.DATABASE,
  userId: user.id,
  taskTitle: taskData.title,
  assignedTo: taskData.assigned_to,
});
```

**Why:** Metadata helps with debugging and understanding context in Sentry.

### 3. Use Appropriate Categories

❌ **Don't:**

```typescript
logger.error('Profile update failed', error as Error, {
  category: LogCategory.UI,
});
```

✅ **Do:**

```typescript
logger.error('Profile update failed', error as Error, {
  category: LogCategory.DATABASE,
  profileId: profile.id,
});
```

**Why:** Correct categories enable effective filtering in Sentry.

### 4. Write Descriptive Messages

❌ **Don't:**

```typescript
logger.error('Error', error as Error);
logger.info('Success');
```

✅ **Do:**

```typescript
logger.error('Sponsor-sponsee relationship creation failed', error as Error, {
  category: LogCategory.DATABASE,
});
logger.info('Google Auth session created successfully', {
  category: LogCategory.AUTH,
});
```

**Why:** Clear messages make logs searchable and understandable.

### 5. Always Pass Error Objects to logger.error

❌ **Don't:**

```typescript
logger.error('Something failed', undefined, {
  category: LogCategory.DATABASE,
  errorMessage: error.message,
});
```

✅ **Do:**

```typescript
logger.error('Database query failed', error as Error, {
  category: LogCategory.DATABASE,
  query: 'select * from profiles',
});
```

**Why:** Error objects include stack traces and error details.

### 6. Use Debug Logs Sparingly

❌ **Don't:**

```typescript
logger.debug('x = 1');
logger.debug('y = 2');
logger.debug('z = 3');
```

✅ **Do:**

```typescript
logger.debug('Timeline calculation complete', {
  category: LogCategory.UI,
  eventCount: events.length,
  calculationTime: Date.now() - startTime,
});
```

**Why:** Debug logs should provide meaningful insights, not clutter.

## Examples by Use Case

### Database Operations

```typescript
// Successful operation with debug logging
try {
  const { data, error } = await supabase.from('steps_content').select('*').order('step_number');

  if (error) throw error;

  logger.debug('Steps content loaded successfully', {
    category: LogCategory.DATABASE,
    count: data.length,
  });

  setSteps(data);
} catch (err) {
  logger.error('Steps content fetch failed', err as Error, {
    category: LogCategory.DATABASE,
  });
  setError('Failed to load steps');
}
```

### Authentication

```typescript
// OAuth flow
logger.debug('Google Auth redirect URL configured', {
  category: LogCategory.AUTH,
  redirectUrl,
});

try {
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    logger.error('Google Auth session creation failed', error, {
      category: LogCategory.AUTH,
    });
    throw error;
  }

  logger.info('Google Auth session created successfully', {
    category: LogCategory.AUTH,
  });
} catch (error) {
  // Handle error
}
```

### UI Interactions

```typescript
// Button press in demo component
const handlePress = () => {
  logger.debug('Demo nav item pressed', {
    category: LogCategory.UI,
    item: 'Home',
  });

  // Handle navigation
};
```

### Storage Operations

The app uses a layered storage approach:

- **AsyncStorage**: Non-sensitive data (theme preferences)
- **SecureStore**: Sensitive data like auth tokens (mobile only, with chunking for large values)
- **localStorage**: Web platform storage

```typescript
// Theme preference loading (AsyncStorage - non-sensitive)
try {
  const saved = await AsyncStorage.getItem('theme_mode');
  if (saved) {
    setThemeMode(saved as ThemeMode);
  }
} catch (error) {
  logger.error('Failed to load theme preference', error as Error, {
    category: LogCategory.STORAGE,
  });
}

// Auth token storage errors (SecureStore - sensitive)
// Note: The SupabaseStorageAdapter handles this automatically
try {
  await SecureStore.setItemAsync(key, token);
} catch (error) {
  logger.error('Failed to save session to SecureStore', error as Error, {
    category: LogCategory.AUTH,
  });
}

// Storage migration logging (legacy AsyncStorage → SecureStore)
logger.error(
  'Session migration to secure storage failed - session will remain functional but may use less secure storage until next login',
  error as Error,
  { category: LogCategory.AUTH }
);
```

## Privacy & Security

### Automatic PII Scrubbing

The logger automatically scrubs personally identifiable information (PII) through Sentry's `beforeBreadcrumb` hook configured in `lib/sentry-privacy.ts`.

**Scrubbed fields:**

- Email addresses
- Passwords
- Access tokens
- Refresh tokens
- API keys
- Credit card numbers

**Example:**

```typescript
// This metadata will be automatically scrubbed
logger.info('User registered', {
  category: LogCategory.AUTH,
  email: 'user@example.com', // Scrubbed to '[email]'
  password: 'secret123', // Scrubbed to '[password]'
});
```

### What to Avoid Logging

Even with automatic scrubbing, avoid logging:

- ❌ Full names (use user IDs instead)
- ❌ Phone numbers
- ❌ Addresses
- ❌ Social security numbers
- ❌ Medical information
- ❌ Financial data

## Development vs Production

### Development Mode (`__DEV__ = true`)

- All logs output to console
- Debug and trace logs are active
- Full metadata visible

### Production Mode (`__DEV__ = false`)

- Logs sent to Sentry only (no console output)
- Debug and trace logs still create breadcrumbs
- Privacy scrubbing active

## Sentry Integration

### Breadcrumbs

All logger calls create Sentry breadcrumbs that appear in error reports.

**Breadcrumb structure:**

```typescript
{
  level: 'info',           // or 'error', 'warning', 'debug'
  category: 'database',    // from LogCategory
  message: 'Task created',
  data: {
    category: 'database',
    userId: '123',
    taskId: '456',
  },
  timestamp: 1234567890,
}
```

### Viewing Breadcrumbs

1. Open Sentry dashboard
2. Navigate to an issue
3. View "Breadcrumbs" tab
4. Filter by category to find relevant logs

## ESLint Configuration

The `no-console` ESLint rule is enforced across the codebase to prevent direct console usage.

**Exceptions:**

- `lib/logger.ts` - The logger implementation itself
- `lib/sentry.ts` - Sentry initialization (uses console to avoid circular dependency)
- `jest.setup.js` - Test configuration

**To use console in a new file:**

Don't. Use the logger instead. If you absolutely must use console (e.g., for a new logging system), add the file to the exception list in `eslint.config.js`.

## Troubleshooting

### "Cannot find module '@/lib/logger'"

**Problem:** Import path not resolving

**Solution:** Ensure `@/` path alias is configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Logs not appearing in Sentry

**Problem:** Breadcrumbs not visible in Sentry dashboard

**Possible causes:**

1. Sentry not initialized - Check `EXPO_PUBLIC_SENTRY_DSN` env var
2. Privacy scrubbing too aggressive - Review `lib/sentry-privacy.ts`
3. Error not captured - Breadcrumbs only appear with errors

**Solution:** Test by triggering an error:

```typescript
logger.info('Test breadcrumb', { category: LogCategory.AUTH });
throw new Error('Test error to see breadcrumbs');
```

### ESLint error "Unexpected console statement"

**Problem:** ESLint catching console usage

**Solution:** Use the logger instead:

```typescript
// ❌ This will error
console.log('Hello');

// ✅ Use logger
logger.debug('Hello', { category: LogCategory.UI });
```

## Migration Guide

If you're migrating existing console calls:

1. **Import the logger:**

   ```typescript
   import { logger, LogCategory } from '@/lib/logger';
   ```

2. **Replace console calls:**

   ```typescript
   // Before
   console.error('Error:', error);

   // After
   logger.error('Descriptive message', error as Error, {
     category: LogCategory.DATABASE,
   });
   ```

3. **Choose appropriate category:**
   - Database operations → `LogCategory.DATABASE`
   - Auth operations → `LogCategory.AUTH`
   - UI interactions → `LogCategory.UI`
   - Storage operations → `LogCategory.STORAGE`

4. **Add contextual metadata:**

   ```typescript
   logger.error('Task creation failed', error as Error, {
     category: LogCategory.DATABASE,
     userId: user.id,
     taskTitle: data.title,
   });
   ```

5. **Test the change:**

   ```bash
   pnpm format && pnpm lint && pnpm typecheck
   ```

## Related Files

- `lib/logger.ts` - Logger implementation
- `lib/logger.test.ts` - Logger tests
- `lib/sentry.ts` - Sentry initialization
- `lib/sentry-privacy.ts` - Privacy scrubbing rules
- `lib/supabase.ts` - SupabaseStorageAdapter with auth logging
- `contexts/ThemeContext.tsx` - Theme storage logging example
- `eslint.config.js` - ESLint no-console rule
- `jest.setup.js` - Test mocks for Sentry

## Further Reading

- [Sentry Breadcrumbs Documentation](https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/)
- [ESLint no-console Rule](https://eslint.org/docs/latest/rules/no-console)
- [Best Practices for Application Logging](https://www.loggly.com/ultimate-guide/node-logging-basics/)
