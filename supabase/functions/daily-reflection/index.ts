// =============================================================================
// Imports
// =============================================================================
import { parseDailyReflectionPayload } from '../_shared/daily-reflection-parser.ts';

// =============================================================================
// Constants
// =============================================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PROGRAM = 'aa';
const AA_REFLECTIONS_BASE_URL = 'https://www.aa.org/api/reflections';
const AA_FETCH_TIMEOUT_MS = 8000;

// Supabase config (from environment)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// =============================================================================
// Types
// =============================================================================
interface DailyReflectionRequest {
  date: string;
}

interface CachedDailyReading {
  title: string;
  content: string;
  source: string | null;
}

interface JsonResponseBody {
  [key: string]: string | number | boolean | null;
}

// =============================================================================
// Helpers
// =============================================================================

function jsonResponse(status: number, body: JsonResponseBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function parseRequestBody(body: unknown): DailyReflectionRequest {
  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as DailyReflectionRequest).date !== 'string'
  ) {
    throw new Error('Request must include a date string in YYYY-MM-DD format.');
  }

  return { date: (body as DailyReflectionRequest).date };
}

function parseDateParts(date: string): { month: number; day: number; monthDay: string } {
  if (!DATE_PATTERN.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;

  if (!isValidDate) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  return {
    month,
    day,
    monthDay: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

async function fetchReflectionFromAA(month: number, day: number): Promise<unknown> {
  const monthParam = String(month).padStart(2, '0');
  const dayParam = String(day).padStart(2, '0');
  const url = `${AA_REFLECTIONS_BASE_URL}/${monthParam}/${dayParam}`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), AA_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`AA API responded with status ${response.status}.`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCachedDailyReading(
  month: number,
  day: number
): Promise<CachedDailyReading | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/daily_readings?select=title,content,source&program=eq.${PROGRAM}&month=eq.${month}&day=eq.${day}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as CachedDailyReading;
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheDailyReading(
  month: number,
  day: number,
  title: string,
  content: string,
  source: string | null
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/daily_readings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=none',
      },
      body: JSON.stringify({
        program: PROGRAM,
        month,
        day,
        title,
        content,
        source,
      }),
    });
  } catch {
    // Ignore cache errors - function still works
  }
}

// =============================================================================
// Handler
// =============================================================================

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const rawBody = await request.json();
    const { date } = parseRequestBody(rawBody);
    const { month, day, monthDay } = parseDateParts(date);

    // Try to get from cache first
    const cachedReading = await fetchCachedDailyReading(month, day);
    if (cachedReading) {
      return jsonResponse(200, {
        date,
        program: PROGRAM,
        title: cachedReading.title,
        content: cachedReading.content,
        source: cachedReading.source,
        fetched_from: 'cache',
      });
    }

    // Fetch from AA API
    const apiPayload = await fetchReflectionFromAA(month, day);
    const parsedReflection = parseDailyReflectionPayload(apiPayload, monthDay);

    // Cache the result
    await cacheDailyReading(
      month,
      day,
      parsedReflection.title,
      parsedReflection.content,
      parsedReflection.source
    );

    return jsonResponse(200, {
      date,
      program: PROGRAM,
      title: parsedReflection.title,
      content: parsedReflection.content,
      source: parsedReflection.source,
      fetched_from: 'external',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected function error.';
    const status =
      message.includes('Invalid date format') || message.includes('Request must include')
        ? 400
        : 502;
    return jsonResponse(status, { error: message });
  }
});
