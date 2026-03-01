// =============================================================================
// Imports
// =============================================================================
import { logger, LogCategory } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import type { DailyReading, ProgramType } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

export interface DailyReflectionResult {
  date: string;
  program: ProgramType;
  title: string;
  content: string;
  source: string | null;
  fetched_from: 'cache' | 'external';
}

interface EdgeFunctionReflectionResponse {
  date: string;
  program: ProgramType;
  title: string;
  content: string;
  source: string | null;
  fetched_from: 'cache' | 'external';
}

type DailyReadingFallbackRow = Pick<DailyReading, 'title' | 'content' | 'source'>;

// =============================================================================
// Constants
// =============================================================================

const EDGE_FUNCTION_NAME = 'daily-reflection';
const FALLBACK_PROGRAM: ProgramType = 'aa';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert unknown thrown values into an Error instance.
 *
 * @param value - Unknown thrown value
 * @returns Error instance
 */
function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
}

/**
 * Validate date string and parse month/day components.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Parsed month/day values
 * @throws Error when input is invalid
 */
function parseDateParts(date: string): { month: number; day: number } {
  if (!DATE_PATTERN.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  return { month, day };
}

/**
 * Type guard for edge function response.
 *
 * @param value - Unknown response payload
 * @returns True when payload matches expected shape
 */
function isEdgeFunctionReflectionResponse(value: unknown): value is EdgeFunctionReflectionResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Partial<EdgeFunctionReflectionResponse>;
  const isProgramValid = response.program === 'aa' || response.program === 'na';
  const isFetchedFromValid =
    response.fetched_from === 'cache' || response.fetched_from === 'external';

  return (
    typeof response.date === 'string' &&
    isProgramValid &&
    typeof response.title === 'string' &&
    typeof response.content === 'string' &&
    (typeof response.source === 'string' || response.source === null) &&
    isFetchedFromValid
  );
}

/**
 * Fetch reflection from Supabase Edge Function.
 *
 * @param date - Date string (YYYY-MM-DD)
 * @returns Normalized reflection result
 * @throws Error when function fails or payload is invalid
 */
async function fetchFromEdgeFunction(date: string): Promise<DailyReflectionResult> {
  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { date },
  });

  if (error) {
    throw toError(error);
  }

  if (!isEdgeFunctionReflectionResponse(data)) {
    throw new Error('Edge function returned malformed reflection data.');
  }

  return {
    date: data.date,
    program: data.program,
    title: data.title,
    content: data.content,
    source: data.source,
    fetched_from: data.fetched_from,
  };
}

/**
 * Fetch reflection from cached fallback table.
 *
 * @param date - Date string (YYYY-MM-DD)
 * @returns Reflection result from cached database content
 * @throws Error when fallback fetch fails
 */
async function fetchFromFallbackTable(date: string): Promise<DailyReflectionResult> {
  const { month, day } = parseDateParts(date);
  const { data, error } = await supabase
    .from('daily_readings')
    .select('title, content, source')
    .eq('program', FALLBACK_PROGRAM)
    .eq('month', month)
    .eq('day', day)
    .maybeSingle<DailyReadingFallbackRow>();

  if (error) {
    throw toError(error);
  }

  if (!data || typeof data.title !== 'string' || typeof data.content !== 'string') {
    throw new Error('No fallback daily reflection found for date.');
  }

  return {
    date,
    program: FALLBACK_PROGRAM,
    title: data.title,
    content: data.content,
    source: data.source ?? null,
    fetched_from: 'cache',
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetch a Daily Reflection for a date.
 *
 * Uses the Edge Function as primary source and falls back to cached DB content.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns Daily reflection result
 * @throws Error when both primary and fallback sources fail
 */
export async function fetchDailyReflectionForDate(date: string): Promise<DailyReflectionResult> {
  parseDateParts(date);

  try {
    return await fetchFromEdgeFunction(date);
  } catch (edgeError) {
    logger.warn('Daily reflection edge fetch failed, using fallback cache', {
      category: LogCategory.API,
      date,
      error: toError(edgeError).message,
    });
  }

  try {
    return await fetchFromFallbackTable(date);
  } catch (fallbackError) {
    logger.error('Daily reflection fallback fetch failed', toError(fallbackError), {
      category: LogCategory.DATABASE,
      date,
    });
    throw new Error('Failed to load daily reflection');
  }
}
