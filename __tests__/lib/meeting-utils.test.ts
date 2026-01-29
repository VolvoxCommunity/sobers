// __tests__/lib/meeting-utils.test.ts
import {
  calculateMeetingStreak,
  checkMeetingMilestones,
  MEETING_COUNT_MILESTONES,
} from '@/lib/meeting-utils';

describe('calculateMeetingStreak', () => {
  // Helper to create a date at noon local time for a given day offset from today
  const getLocalNoon = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(12, 0, 0, 0);
    return date;
  };

  // Set "today" to a fixed local noon time
  const today = getLocalNoon(0);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 when no meetings', () => {
    expect(calculateMeetingStreak([])).toBe(0);
  });

  it('returns 1 for meeting today', () => {
    const meetings = [{ attended_at: getLocalNoon(0).toISOString() }];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });

  it('returns 1 for meeting yesterday (grace period)', () => {
    const meetings = [{ attended_at: getLocalNoon(1).toISOString() }];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });

  it('returns 0 for meeting 2 days ago (streak broken)', () => {
    const meetings = [{ attended_at: getLocalNoon(2).toISOString() }];
    expect(calculateMeetingStreak(meetings)).toBe(0);
  });

  it('counts consecutive days correctly', () => {
    const meetings = [
      { attended_at: getLocalNoon(0).toISOString() },
      { attended_at: getLocalNoon(1).toISOString() },
      { attended_at: getLocalNoon(2).toISOString() },
    ];
    expect(calculateMeetingStreak(meetings)).toBe(3);
  });

  it('counts multiple meetings on same day as 1 day', () => {
    const todayMorning = getLocalNoon(0);
    todayMorning.setHours(10, 0, 0, 0);
    const todayAfternoon = getLocalNoon(0);
    todayAfternoon.setHours(14, 0, 0, 0);
    const meetings = [
      { attended_at: todayMorning.toISOString() },
      { attended_at: todayAfternoon.toISOString() },
      { attended_at: getLocalNoon(1).toISOString() },
    ];
    expect(calculateMeetingStreak(meetings)).toBe(2);
  });

  it('breaks streak on gap day', () => {
    const meetings = [
      { attended_at: getLocalNoon(0).toISOString() },
      { attended_at: getLocalNoon(2).toISOString() }, // Gap on day 1
    ];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });
});

describe('checkMeetingMilestones', () => {
  it('returns first meeting milestone with correct date', () => {
    const meetings = [{ attended_at: '2026-01-26T10:00:00Z' }];
    const result = checkMeetingMilestones(meetings, 0, []);
    expect(result).toContainEqual({
      type: 'count',
      value: 1,
      label: 'First Meeting!',
      achievedAt: '2026-01-26T10:00:00Z',
    });
  });

  it('returns 5 meetings milestone with date of 5th meeting', () => {
    const meetings = [
      { attended_at: '2026-01-20T10:00:00Z' },
      { attended_at: '2026-01-21T10:00:00Z' },
      { attended_at: '2026-01-22T10:00:00Z' },
      { attended_at: '2026-01-23T10:00:00Z' },
      { attended_at: '2026-01-24T10:00:00Z' },
    ];
    const result = checkMeetingMilestones(meetings, 0, []);
    expect(result).toContainEqual({
      type: 'count',
      value: 5,
      label: '5 Meetings',
      achievedAt: '2026-01-24T10:00:00Z',
    });
  });

  it('does not return already achieved milestone', () => {
    const meetings = [{ attended_at: '2026-01-26T10:00:00Z' }];
    const existing = [{ milestone_type: 'count', milestone_value: 1 }];
    const result = checkMeetingMilestones(meetings, 0, existing);
    expect(result).not.toContainEqual(expect.objectContaining({ type: 'count', value: 1 }));
  });

  it('returns 7-day streak milestone', () => {
    const meetings = Array.from({ length: 10 }, (_, i) => ({
      attended_at: `2026-01-${20 + i}T10:00:00Z`,
    }));
    const result = checkMeetingMilestones(meetings, 7, []);
    expect(result).toContainEqual(
      expect.objectContaining({
        type: 'streak',
        value: 7,
        label: '7-Day Streak!',
      })
    );
  });

  it('does not return streak milestone if not reached', () => {
    const meetings = Array.from({ length: 10 }, (_, i) => ({
      attended_at: `2026-01-${20 + i}T10:00:00Z`,
    }));
    const result = checkMeetingMilestones(meetings, 6, []);
    expect(result).not.toContainEqual(expect.objectContaining({ type: 'streak', value: 7 }));
  });
});

describe('MEETING_COUNT_MILESTONES', () => {
  it('includes expected values', () => {
    expect(MEETING_COUNT_MILESTONES).toEqual([1, 5, 10, 25, 50, 100]);
  });
});
