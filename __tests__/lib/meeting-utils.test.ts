// __tests__/lib/meeting-utils.test.ts
import { calculateMeetingStreak } from '@/lib/meeting-utils';

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
