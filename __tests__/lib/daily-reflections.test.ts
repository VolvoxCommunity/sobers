/**
 * @fileoverview Tests for Daily Reflections data service
 */

import { fetchDailyReflectionForDate } from '@/lib/daily-reflections';

// =============================================================================
// Mocks
// =============================================================================

const mockInvoke = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEqDay = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqMonth = jest.fn(() => ({ eq: mockEqDay }));
const mockEqProgram = jest.fn(() => ({ eq: mockEqMonth }));
const mockSelect = jest.fn(() => ({ eq: mockEqProgram }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    API: 'http',
    DATABASE: 'database',
  },
}));

describe('fetchDailyReflectionForDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns normalized reflection when edge function succeeds', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        date: '2026-02-28',
        program: 'aa',
        title: 'A New Freedom',
        content: 'Today I choose progress over perfection.',
        source: 'Daily Reflections, p. 88',
        fetched_from: 'external',
      },
      error: null,
    });

    const reflection = await fetchDailyReflectionForDate('2026-02-28');

    expect(mockInvoke).toHaveBeenCalledWith('daily-reflection', {
      body: { date: '2026-02-28' },
    });
    expect(reflection).toEqual({
      date: '2026-02-28',
      program: 'aa',
      title: 'A New Freedom',
      content: 'Today I choose progress over perfection.',
      source: 'Daily Reflections, p. 88',
      fetched_from: 'external',
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('falls back to daily_readings when edge function fails', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('function unavailable'),
    });
    mockMaybeSingle.mockResolvedValue({
      data: {
        title: 'Cached Reflection',
        content: 'Cached content body.',
        source: 'Daily Reflections, p. 12',
      },
      error: null,
    });

    const reflection = await fetchDailyReflectionForDate('2026-02-28');

    expect(mockFrom).toHaveBeenCalledWith('daily_readings');
    expect(reflection).toEqual({
      date: '2026-02-28',
      program: 'aa',
      title: 'Cached Reflection',
      content: 'Cached content body.',
      source: 'Daily Reflections, p. 12',
      fetched_from: 'cache',
    });
  });

  it('throws when both edge function and fallback fail', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('function down'),
    });
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: new Error('database down'),
    });

    await expect(fetchDailyReflectionForDate('2026-02-28')).rejects.toThrow(
      'Failed to load daily reflection'
    );
  });

  it('throws for invalid date input', async () => {
    await expect(fetchDailyReflectionForDate('2026-2-28')).rejects.toThrow('Invalid date format');
    await expect(fetchDailyReflectionForDate('')).rejects.toThrow('Invalid date format');
  });
});
