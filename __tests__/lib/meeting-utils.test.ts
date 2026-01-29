// __tests__/lib/meeting-utils.test.ts
import {
  calculateMeetingStreak,
  checkMeetingMilestones,
  MEETING_COUNT_MILESTONES,
} from '@/lib/meeting-utils';

describe('calculateMeetingStreak', () => {
  const today = new Date('2026-01-28');

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
    const meetings = [{ attended_at: '2026-01-28T10:00:00Z' }];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });

  it('returns 1 for meeting yesterday (grace period)', () => {
    const meetings = [{ attended_at: '2026-01-27T10:00:00Z' }];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });

  it('returns 0 for meeting 2 days ago (streak broken)', () => {
    const meetings = [{ attended_at: '2026-01-26T10:00:00Z' }];
    expect(calculateMeetingStreak(meetings)).toBe(0);
  });

  it('counts consecutive days correctly', () => {
    const meetings = [
      { attended_at: '2026-01-28T10:00:00Z' },
      { attended_at: '2026-01-27T10:00:00Z' },
      { attended_at: '2026-01-26T10:00:00Z' },
    ];
    expect(calculateMeetingStreak(meetings)).toBe(3);
  });

  it('counts multiple meetings on same day as 1 day', () => {
    const meetings = [
      { attended_at: '2026-01-28T10:00:00Z' },
      { attended_at: '2026-01-28T14:00:00Z' },
      { attended_at: '2026-01-27T10:00:00Z' },
    ];
    expect(calculateMeetingStreak(meetings)).toBe(2);
  });

  it('breaks streak on gap day', () => {
    const meetings = [
      { attended_at: '2026-01-28T10:00:00Z' },
      { attended_at: '2026-01-26T10:00:00Z' }, // Gap on 27th
    ];
    expect(calculateMeetingStreak(meetings)).toBe(1);
  });
});

describe('checkMeetingMilestones', () => {
  it('returns first meeting milestone', () => {
    const result = checkMeetingMilestones(1, 0, []);
    expect(result).toContainEqual({
      type: 'count',
      value: 1,
      label: 'First Meeting!',
    });
  });

  it('returns 5 meetings milestone', () => {
    const result = checkMeetingMilestones(5, 0, []);
    expect(result).toContainEqual({
      type: 'count',
      value: 5,
      label: '5 Meetings',
    });
  });

  it('does not return already achieved milestone', () => {
    const existing = [{ milestone_type: 'count', milestone_value: 1 }];
    const result = checkMeetingMilestones(1, 0, existing);
    expect(result).not.toContainEqual(expect.objectContaining({ type: 'count', value: 1 }));
  });

  it('returns 7-day streak milestone', () => {
    const result = checkMeetingMilestones(10, 7, []);
    expect(result).toContainEqual({
      type: 'streak',
      value: 7,
      label: '7-Day Streak!',
    });
  });

  it('does not return streak milestone if not reached', () => {
    const result = checkMeetingMilestones(10, 6, []);
    expect(result).not.toContainEqual(expect.objectContaining({ type: 'streak', value: 7 }));
  });
});

describe('MEETING_COUNT_MILESTONES', () => {
  it('includes expected values', () => {
    expect(MEETING_COUNT_MILESTONES).toEqual([1, 5, 10, 25, 50, 100]);
  });
});
