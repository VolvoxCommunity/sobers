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
