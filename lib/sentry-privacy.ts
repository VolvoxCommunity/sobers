import * as Sentry from '@sentry/react-native';

/**
 * Sensitive fields that should be scrubbed from all events
 */
const SENSITIVE_FIELDS = [
  'message',
  'content',
  'description',
  'reflection',
  'sobriety_date',
  'relapse_date',
  'notes',
  'email',
  'phone',
  'name',
  'display_name',
  'password',
  'token',
  'access_token',
  'refresh_token',
];

/**
 * Email regex for redaction
 * Optimized for performance with non-backtracking character classes
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * OAuth-sensitive parameters that should be stripped from URLs
 * These can appear in query strings or URL fragments
 */
const OAUTH_PARAMS = ['access_token', 'refresh_token', 'code', 'id_token', 'state'];

/**
 * Regex to detect URLs in strings (http/https URLs)
 * Matches URLs that may contain query strings and fragments
 */
const URL_IN_STRING_REGEX = /https?:\/\/[^\s'"<>]+/g;

/**
 * Regex to match OAuth token values in console output
 * Matches patterns like "access_token: eyJ..." or "refresh_token: abc123"
 */
const TOKEN_VALUE_REGEX =
  /(access_token|refresh_token|id_token|code|state):\s*['"]?([^\s'"]+)['"]?/gi;

/**
 * BeforeSend hook to scrub sensitive data from events
 */
export function privacyBeforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  // Strip sensitive request data
  if (event.request?.data) {
    event.request.data = sanitizeObject(event.request.data);
  }

  // Redact email addresses from error messages
  if (event.message) {
    event.message = event.message.replace(EMAIL_REGEX, '[email]');
  }

  // Sanitize exception values
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: exception.value ? sanitizeString(exception.value) : exception.value,
    }));
  }

  // Remove sensitive user data, keep only ID
  if (event.user) {
    event.user = {
      id: event.user.id,
    };
  }

  return event;
}

/**
 * BeforeBreadcrumb hook to filter sensitive breadcrumbs.
 *
 * This function sanitizes breadcrumbs to prevent OAuth tokens and other sensitive
 * data from being sent to Sentry. It handles:
 * - HTTP breadcrumbs (Supabase queries)
 * - Navigation breadcrumbs (URL parameters)
 * - Console/debug breadcrumbs (logged URLs and token values)
 *
 * @param breadcrumb - The Sentry breadcrumb to sanitize
 * @returns The sanitized breadcrumb, or null to drop it entirely
 */
export function privacyBeforeBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb | null {
  // Filter Supabase query breadcrumbs
  if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('supabase')) {
    const table = extractTableName(breadcrumb.data.url);
    return {
      ...breadcrumb,
      data: {
        method: breadcrumb.data.method,
        table,
        status_code: breadcrumb.data.status_code,
      },
    };
  }

  // Filter HTTP breadcrumbs with OAuth URLs (non-Supabase)
  if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
    return {
      ...breadcrumb,
      data: {
        ...breadcrumb.data,
        url: sanitizeUrl(breadcrumb.data.url),
      },
    };
  }

  // Filter navigation breadcrumbs with sensitive params
  if (breadcrumb.category === 'navigation' && breadcrumb.data) {
    return {
      ...breadcrumb,
      data: {
        from: sanitizeUrl(breadcrumb.data.from),
        to: sanitizeUrl(breadcrumb.data.to),
      },
    };
  }

  // Filter console and debug breadcrumbs that may contain OAuth tokens
  // These are created by console.log/debug calls and can leak sensitive URLs and token values
  if (breadcrumb.category === 'console' || breadcrumb.category === 'debug') {
    return sanitizeConsoleBreadcrumb(breadcrumb);
  }

  // For any other breadcrumb type, check if message contains URLs and sanitize
  if (breadcrumb.message && typeof breadcrumb.message === 'string') {
    const sanitizedMessage = sanitizeUrlsInString(breadcrumb.message);
    if (sanitizedMessage !== breadcrumb.message) {
      return {
        ...breadcrumb,
        message: sanitizeTokenValues(sanitizedMessage),
      };
    }
  }

  return breadcrumb;
}

/**
 * Sanitize a console or debug breadcrumb.
 *
 * Console breadcrumbs can contain:
 * - URLs with OAuth tokens in query strings or fragments
 * - Explicit token values like "access_token: eyJ..."
 * - Other sensitive data logged during OAuth flows
 *
 * @param breadcrumb - The console/debug breadcrumb to sanitize
 * @returns The sanitized breadcrumb
 */
function sanitizeConsoleBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  const sanitized = { ...breadcrumb };

  // Sanitize the message field
  if (sanitized.message && typeof sanitized.message === 'string') {
    // First sanitize any URLs in the message
    let message = sanitizeUrlsInString(sanitized.message);
    // Then sanitize any explicit token values (e.g., "access_token: xyz123")
    message = sanitizeTokenValues(message);
    sanitized.message = message;
  }

  // Sanitize the data field if present
  if (sanitized.data) {
    sanitized.data = sanitizeConsoleBreadcrumbData(sanitized.data);
  }

  return sanitized;
}

/**
 * Sanitize a single value from console breadcrumb data.
 * Handles primitives, strings, arrays, and objects recursively.
 *
 * @param value - The value to sanitize
 * @returns The sanitized value
 */
function sanitizeConsoleBreadcrumbValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Sanitize URLs and token values in string values
    let sanitized = sanitizeUrlsInString(value);
    sanitized = sanitizeTokenValues(sanitized);
    return sanitized;
  }

  if (Array.isArray(value)) {
    // Recursively sanitize each element in the array
    return value.map(sanitizeConsoleBreadcrumbValue);
  }

  if (typeof value === 'object' && value !== null) {
    // Recursively sanitize nested objects
    return sanitizeConsoleBreadcrumbData(value as Record<string, unknown>);
  }

  // Return primitives (numbers, booleans, null, undefined) as-is
  return value;
}

/**
 * Sanitize the data object of a console breadcrumb.
 *
 * Console breadcrumb data can contain arbitrary arguments passed to console.log,
 * which may include URLs, token values, or entire objects with sensitive fields.
 *
 * @param data - The breadcrumb data object to sanitize
 * @returns The sanitized data object
 */
function sanitizeConsoleBreadcrumbData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if key itself is a sensitive field
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[Filtered]';
      continue;
    }

    sanitized[key] = sanitizeConsoleBreadcrumbValue(value);
  }

  return sanitized;
}

/**
 * Recursively sanitize object by replacing sensitive fields with '[Filtered]'
 * Handles circular references by tracking visited objects
 */
function sanitizeObject(obj: any, visited = new WeakSet()): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Detect circular references
  if (visited.has(obj)) {
    return '[Circular]';
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, visited));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[Filtered]';
    } else if (value === null) {
      // Preserve null values for sensitive fields (still filter them)
      sanitized[key] = SENSITIVE_FIELDS.includes(key.toLowerCase()) ? '[Filtered]' : null;
    } else if (value === undefined) {
      // Skip undefined values
      continue;
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, visited);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize string by redacting emails and quoted content
 * Optimized for performance with large strings by limiting regex scope
 */
function sanitizeString(str: string): string {
  // For very large strings (>10KB), only process first and last 5KB to avoid performance issues
  const MAX_CHUNK_SIZE = 10000;
  if (str.length > MAX_CHUNK_SIZE * 2) {
    const start = sanitizeStringChunk(str.slice(0, MAX_CHUNK_SIZE));
    const end = sanitizeStringChunk(str.slice(-MAX_CHUNK_SIZE));
    const middle = str.slice(MAX_CHUNK_SIZE, -MAX_CHUNK_SIZE);
    return start + middle + end;
  }

  return sanitizeStringChunk(str);
}

/**
 * Process a chunk of string with email and quoted content redaction
 */
function sanitizeStringChunk(str: string): string {
  // Redact email addresses
  let sanitized = str.replace(EMAIL_REGEX, '[email]');

  // Redact quoted strings that might contain user content (10+ chars to avoid filtering short technical strings)
  sanitized = sanitized.replace(/"[^"]{10,}"/g, '"[Filtered]"');

  return sanitized;
}

/**
 * Extract table name from Supabase URL
 */
function extractTableName(url: string): string {
  const match = url.match(/\/rest\/v1\/([^?]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Sanitize a URL by removing OAuth-sensitive parameters from query strings and fragments.
 *
 * This function:
 * - Removes OAuth parameters (access_token, refresh_token, code, id_token, state) from query strings
 * - Removes the entire fragment (portion after '#') as it often contains OAuth tokens
 * - Preserves the base URL and non-sensitive query parameters
 *
 * @param urlOrRoute - The URL or route string to sanitize
 * @returns The sanitized URL with OAuth parameters removed
 *
 * @example
 * ```ts
 * sanitizeUrl('https://app.com/callback?access_token=secret&state=abc&page=1')
 * // Returns: 'https://app.com/callback?page=1'
 *
 * sanitizeUrl('https://app.com/callback#access_token=secret')
 * // Returns: 'https://app.com/callback'
 * ```
 */
function sanitizeUrl(urlOrRoute: string): string {
  if (!urlOrRoute) return urlOrRoute;

  try {
    // Handle full URLs
    if (urlOrRoute.startsWith('http://') || urlOrRoute.startsWith('https://')) {
      const url = new URL(urlOrRoute);

      // Remove OAuth params from query string
      for (const param of OAUTH_PARAMS) {
        url.searchParams.delete(param);
      }

      // Remove fragment entirely (often contains OAuth tokens in implicit flow)
      // Fragments like #access_token=xyz&refresh_token=abc are common in OAuth
      if (url.hash) {
        url.hash = '';
      }

      return url.toString();
    }

    // Handle relative URLs or route paths (e.g., /callback?token=xyz)
    const [pathAndQuery, fragment] = urlOrRoute.split('#');
    const [path, queryString] = pathAndQuery.split('?');

    if (!queryString) {
      // No query string, just remove fragment
      return path;
    }

    // Parse and filter query params
    const params = new URLSearchParams(queryString);
    for (const param of OAUTH_PARAMS) {
      params.delete(param);
    }

    const filteredQuery = params.toString();
    return filteredQuery ? `${path}?${filteredQuery}` : path;
  } catch {
    // If URL parsing fails, fall back to simple stripping
    // Remove fragment first, then query string entirely as a safety measure
    const withoutFragment = urlOrRoute.split('#')[0];
    return withoutFragment.split('?')[0];
  }
}

/**
 * Sanitize all URLs found within a string.
 *
 * Useful for sanitizing console log messages that may contain URLs with OAuth tokens.
 *
 * @param str - The string potentially containing URLs
 * @returns The string with all URLs sanitized
 *
 * @example
 * ```ts
 * sanitizeUrlsInString('Redirect URL: https://app.com?access_token=secret&page=1')
 * // Returns: 'Redirect URL: https://app.com?page=1'
 * ```
 */
function sanitizeUrlsInString(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str.replace(URL_IN_STRING_REGEX, (url) => sanitizeUrl(url));
}

/**
 * Sanitize OAuth token values that appear directly in console output.
 *
 * Handles patterns like "access_token: eyJabc123" that are logged explicitly.
 *
 * @param str - The string potentially containing token values
 * @returns The string with token values redacted
 *
 * @example
 * ```ts
 * sanitizeTokenValues('Hash access_token: eyJabc123xyz')
 * // Returns: 'Hash access_token: [FILTERED]'
 * ```
 */
function sanitizeTokenValues(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str.replace(TOKEN_VALUE_REGEX, '$1: [FILTERED]');
}
