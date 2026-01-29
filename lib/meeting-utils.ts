// lib/meeting-utils.ts

/**
 * Gets the date string in YYYY-MM-DD format from a Date, treating it as UTC.
 */
function getUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates the current meeting streak (consecutive days with meetings).
 * Streak ends today or yesterday (grace period before today's meeting).
 *
 * @param meetings - Array of meetings with attended_at timestamps
 * @returns Number of consecutive days with meetings
 */
export function calculateMeetingStreak(meetings: { attended_at: string }[]): number {
  if (meetings.length === 0) return 0;

  // Get unique days with meetings (UTC dates)
  const meetingDays = new Set<string>();
  meetings.forEach((m) => {
    const date = new Date(m.attended_at);
    meetingDays.add(getUTCDateString(date));
  });

  const today = new Date();
  const todayStr = getUTCDateString(today);

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = getUTCDateString(yesterday);

  // Streak must end today or yesterday
  if (!meetingDays.has(todayStr) && !meetingDays.has(yesterdayStr)) {
    return 0;
  }

  // Count consecutive days going backwards
  let streak = 0;
  const checkDate = new Date(today);

  // Start from today if has meeting, otherwise yesterday
  if (!meetingDays.has(todayStr)) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  while (true) {
    const dateStr = getUTCDateString(checkDate);
    if (meetingDays.has(dateStr)) {
      streak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Meeting count milestones that trigger timeline entries.
 */
export const MEETING_COUNT_MILESTONES = [1, 5, 10, 25, 50, 100];

/**
 * Milestone object returned by checkMeetingMilestones.
 */
export interface MeetingMilestone {
  type: 'count' | 'streak' | 'monthly';
  value: number;
  label: string;
}

/**
 * Checks if any new milestones have been achieved.
 *
 * @param totalCount - Total number of meetings attended
 * @param currentStreak - Current day streak
 * @param existingMilestones - Already achieved milestones
 * @returns Array of newly achieved milestones
 */
export function checkMeetingMilestones(
  totalCount: number,
  currentStreak: number,
  existingMilestones: { milestone_type: string; milestone_value: number }[]
): MeetingMilestone[] {
  const achieved: MeetingMilestone[] = [];
  const existing = new Set(
    existingMilestones.map((m) => `${m.milestone_type}-${m.milestone_value}`)
  );

  // Check count milestones
  MEETING_COUNT_MILESTONES.forEach((milestone) => {
    if (totalCount >= milestone && !existing.has(`count-${milestone}`)) {
      achieved.push({
        type: 'count',
        value: milestone,
        label: milestone === 1 ? 'First Meeting!' : `${milestone} Meetings`,
      });
    }
  });

  // Check streak milestone (7 days)
  if (currentStreak >= 7 && !existing.has('streak-7')) {
    achieved.push({
      type: 'streak',
      value: 7,
      label: '7-Day Streak!',
    });
  }

  return achieved;
}
