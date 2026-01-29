# Meetings Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a meetings attendance tracker with calendar view, streak tracking, and journey timeline integration.

**Architecture:** Calendar-based UI with bottom sheets for day details and logging. Meetings appear on journey timeline with milestone markers at achievement thresholds.

**Tech Stack:** React Native, Expo Router, Supabase, GlassBottomSheet, Lucide icons

---

## Task 1: Database Migration - Create Milestones Table

**Files:**

- Create: `supabase/migrations/20260128100000_create_meeting_milestones.sql`

**Step 1: Create the migration file**

```sql
/*
  # Meeting Milestones Table

  Tracks meeting attendance milestones to prevent duplicate timeline entries.

  Columns:
  - user_id: References profiles
  - milestone_type: 'count', 'streak', or 'monthly'
  - milestone_value: The milestone value achieved (1, 5, 7, 10, etc.)
  - achieved_at: When milestone was reached

  Unique constraint prevents duplicate milestones.
*/

-- Create milestones table
CREATE TABLE IF NOT EXISTS public.user_meeting_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('count', 'streak', 'monthly')),
  milestone_value INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_type, milestone_value)
);

-- Enable RLS
ALTER TABLE public.user_meeting_milestones ENABLE ROW LEVEL SECURITY;

-- Users can read their own milestones
CREATE POLICY "Users can read own meeting milestones"
  ON public.user_meeting_milestones FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own milestones
CREATE POLICY "Users can insert own meeting milestones"
  ON public.user_meeting_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_user_meeting_milestones_user
  ON public.user_meeting_milestones(user_id, milestone_type);
```

**Step 2: Verify migration syntax is valid**

Run: `cat supabase/migrations/20260128100000_create_meeting_milestones.sql`
Expected: File contents displayed without errors

**Step 3: Commit**

```bash
git add supabase/migrations/20260128100000_create_meeting_milestones.sql
git commit -m "feat(db): add user_meeting_milestones table"
```

---

## Task 2: Add TypeScript Types

**Files:**

- Modify: `types/database.ts`

**Step 1: Add UserMeetingMilestone interface**

Add after the `UserMeeting` interface (around line 338):

```typescript
/**
 * Milestone achieved for meeting attendance.
 */
export interface UserMeetingMilestone {
  id: string;
  user_id: string;
  milestone_type: 'count' | 'streak' | 'monthly';
  milestone_value: number;
  achieved_at: string;
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add UserMeetingMilestone interface"
```

---

## Task 3: Create Meeting Utils - Streak Calculation

**Files:**

- Create: `lib/meeting-utils.ts`
- Create: `__tests__/lib/meeting-utils.test.ts`

**Step 1: Write failing tests for streak calculation**

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/lib/meeting-utils.test.ts`
Expected: FAIL - module not found

**Step 3: Implement calculateMeetingStreak**

```typescript
// lib/meeting-utils.ts

/**
 * Calculates the current meeting streak (consecutive days with meetings).
 * Streak ends today or yesterday (grace period before today's meeting).
 *
 * @param meetings - Array of meetings with attended_at timestamps
 * @returns Number of consecutive days with meetings
 */
export function calculateMeetingStreak(meetings: { attended_at: string }[]): number {
  if (meetings.length === 0) return 0;

  // Get unique days with meetings (local dates)
  const meetingDays = new Set<string>();
  meetings.forEach((m) => {
    const date = new Date(m.attended_at);
    const localDate = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    meetingDays.add(localDate);
  });

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  // Streak must end today or yesterday
  if (!meetingDays.has(todayStr) && !meetingDays.has(yesterdayStr)) {
    return 0;
  }

  // Count consecutive days going backwards
  let streak = 0;
  const checkDate = new Date(today);

  // Start from today if has meeting, otherwise yesterday
  if (!meetingDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toLocaleDateString('en-CA');
    if (meetingDays.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/lib/meeting-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/meeting-utils.ts __tests__/lib/meeting-utils.test.ts
git commit -m "feat(meetings): add streak calculation utility"
```

---

## Task 4: Add Milestone Detection to Meeting Utils

**Files:**

- Modify: `lib/meeting-utils.ts`
- Modify: `__tests__/lib/meeting-utils.test.ts`

**Step 1: Add tests for milestone detection**

Add to test file:

```typescript
import {
  calculateMeetingStreak,
  checkMeetingMilestones,
  MEETING_COUNT_MILESTONES,
} from '@/lib/meeting-utils';

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
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/lib/meeting-utils.test.ts`
Expected: FAIL - checkMeetingMilestones not found

**Step 3: Implement milestone detection**

Add to `lib/meeting-utils.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/lib/meeting-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/meeting-utils.ts __tests__/lib/meeting-utils.test.ts
git commit -m "feat(meetings): add milestone detection utility"
```

---

## Task 5: Create MeetingStatsHeader Component

**Files:**

- Create: `components/program/MeetingStatsHeader.tsx`
- Create: `__tests__/components/program/MeetingStatsHeader.test.tsx`

**Step 1: Write failing tests**

```typescript
// __tests__/components/program/MeetingStatsHeader.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MeetingStatsHeader from '@/components/program/MeetingStatsHeader';

// Mock theme context
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      card: '#fff',
      primary: '#007AFF',
      warning: '#FF9500',
      border: '#E5E5E5',
      shadow: '#000',
      fontRegular: 'System',
      fontMedium: 'System',
      fontSemiBold: 'System',
    },
  }),
}));

describe('MeetingStatsHeader', () => {
  it('displays meeting count', () => {
    render(<MeetingStatsHeader totalMeetings={47} streak={0} />);
    expect(screen.getByText('47 meetings')).toBeTruthy();
  });

  it('displays singular meeting for count of 1', () => {
    render(<MeetingStatsHeader totalMeetings={1} streak={0} />);
    expect(screen.getByText('1 meeting')).toBeTruthy();
  });

  it('displays streak when active', () => {
    render(<MeetingStatsHeader totalMeetings={10} streak={5} />);
    expect(screen.getByText('5 day streak')).toBeTruthy();
  });

  it('hides streak when zero', () => {
    render(<MeetingStatsHeader totalMeetings={10} streak={0} />);
    expect(screen.queryByText('day streak')).toBeNull();
  });

  it('displays 0 meetings when empty', () => {
    render(<MeetingStatsHeader totalMeetings={0} streak={0} />);
    expect(screen.getByText('0 meetings')).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/components/program/MeetingStatsHeader.test.tsx`
Expected: FAIL - module not found

**Step 3: Implement component**

```typescript
// components/program/MeetingStatsHeader.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Users } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

interface MeetingStatsHeaderProps {
  totalMeetings: number;
  streak: number;
}

/**
 * Displays meeting count and streak stats at top of Meetings screen.
 * Streak only shown when active (> 0).
 */
export default function MeetingStatsHeader({
  totalMeetings,
  streak,
}: MeetingStatsHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const meetingLabel = totalMeetings === 1 ? 'meeting' : 'meetings';

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Users size={20} color={theme.primary} />
        <Text style={styles.statText}>
          {totalMeetings} {meetingLabel}
        </Text>
      </View>

      {streak > 0 && (
        <View style={styles.stat}>
          <Flame size={20} color={theme.warning} />
          <Text style={styles.statText}>{streak} day streak</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statText: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
  });
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/components/program/MeetingStatsHeader.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/program/MeetingStatsHeader.tsx __tests__/components/program/MeetingStatsHeader.test.tsx
git commit -m "feat(meetings): add MeetingStatsHeader component"
```

---

## Task 6: Create MeetingsCalendar Component

**Files:**

- Create: `components/program/MeetingsCalendar.tsx`
- Create: `__tests__/components/program/MeetingsCalendar.test.tsx`

**Step 1: Write failing tests**

```typescript
// __tests__/components/program/MeetingsCalendar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MeetingsCalendar from '@/components/program/MeetingsCalendar';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      card: '#fff',
      background: '#f5f5f5',
      primary: '#007AFF',
      primaryLight: '#E3F2FD',
      border: '#E5E5E5',
      shadow: '#000',
      fontRegular: 'System',
      fontMedium: 'System',
      fontSemiBold: 'System',
    },
  }),
}));

describe('MeetingsCalendar', () => {
  const mockOnDayPress = jest.fn();
  const meetingDates = new Set(['2026-01-15', '2026-01-20']);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month and year header', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    // Default to current month - January 2026
    expect(screen.getByText(/January 2026/)).toBeTruthy();
  });

  it('calls onDayPress when day is tapped', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    const day15 = screen.getByText('15');
    fireEvent.press(day15);
    expect(mockOnDayPress).toHaveBeenCalledWith('2026-01-15');
  });

  it('shows dot indicator on days with meetings', () => {
    render(
      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={mockOnDayPress}
        selectedDate={null}
      />
    );
    // Day 15 should have a meeting dot
    const day15Container = screen.getByTestId('calendar-day-15');
    expect(day15Container).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/components/program/MeetingsCalendar.test.tsx`
Expected: FAIL - module not found

**Step 3: Implement calendar component**

```typescript
// components/program/MeetingsCalendar.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

interface MeetingsCalendarProps {
  meetingDates: Set<string>;
  onDayPress: (dateStr: string) => void;
  selectedDate: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Monthly calendar grid showing meeting attendance.
 * Days with meetings have a dot indicator.
 */
export default function MeetingsCalendar({
  meetingDates,
  onDayPress,
  selectedDate,
}: MeetingsCalendarProps) {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const styles = useMemo(() => createStyles(theme), [theme]);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add days of month
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    return days;
  }, [currentMonth]);

  const getDateStr = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.monthYear}>{monthYear}</Text>
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS.map((day) => (
          <Text key={day} style={styles.dayLabel}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = getDateStr(day);
          const hasMeeting = meetingDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > todayStr;

          return (
            <Pressable
              key={day}
              testID={`calendar-day-${day}`}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => !isFuture && onDayPress(dateStr)}
              disabled={isFuture}
            >
              <Text
                style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                  isFuture && styles.futureText,
                ]}
              >
                {day}
              </Text>
              {hasMeeting && <View style={styles.meetingDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      margin: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    navButton: {
      padding: 8,
    },
    monthYear: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
    },
    dayLabels: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontFamily: theme.fontMedium,
      color: theme.textTertiary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    todayCell: {
      backgroundColor: theme.primaryLight,
      borderRadius: 20,
    },
    selectedCell: {
      backgroundColor: theme.primary,
      borderRadius: 20,
    },
    dayText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    todayText: {
      fontFamily: theme.fontSemiBold,
      color: theme.primary,
    },
    selectedText: {
      color: '#fff',
    },
    futureText: {
      color: theme.textTertiary,
    },
    meetingDot: {
      position: 'absolute',
      bottom: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
  });
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/components/program/MeetingsCalendar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/program/MeetingsCalendar.tsx __tests__/components/program/MeetingsCalendar.test.tsx
git commit -m "feat(meetings): add MeetingsCalendar component"
```

---

## Task 7: Create MeetingListItem Component

**Files:**

- Create: `components/program/MeetingListItem.tsx`

**Step 1: Create the component**

```typescript
// components/program/MeetingListItem.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { UserMeeting } from '@/types/database';

interface MeetingListItemProps {
  meeting: UserMeeting;
  onPress: (meeting: UserMeeting) => void;
}

/**
 * Displays a single meeting in a list.
 * Shows name, time, and location.
 */
export default function MeetingListItem({
  meeting,
  onPress,
}: MeetingListItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const time = new Date(meeting.attended_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress(meeting)}
      testID={`meeting-item-${meeting.id}`}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{meeting.meeting_name}</Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Clock size={14} color={theme.textSecondary} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          {meeting.location && (
            <View style={styles.detail}>
              <MapPin size={14} color={theme.textSecondary} />
              <Text style={styles.detailText}>{meeting.location}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    content: {
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
    details: {
      flexDirection: 'row',
      gap: 16,
    },
    detail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add components/program/MeetingListItem.tsx
git commit -m "feat(meetings): add MeetingListItem component"
```

---

## Task 8: Create DayDetailSheet Component

**Files:**

- Create: `components/program/DayDetailSheet.tsx`

**Step 1: Create the component**

```typescript
// components/program/DayDetailSheet.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Plus, Calendar } from 'lucide-react-native';
import GlassBottomSheet, {
  GlassBottomSheetRef,
} from '@/components/GlassBottomSheet';
import MeetingListItem from '@/components/program/MeetingListItem';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { UserMeeting } from '@/types/database';

export interface DayDetailSheetRef {
  present: (date: string, meetings: UserMeeting[]) => void;
  dismiss: () => void;
}

interface DayDetailSheetProps {
  onLogMeeting: (date: string) => void;
  onEditMeeting: (meeting: UserMeeting) => void;
}

/**
 * Bottom sheet showing meetings for a selected day.
 * Includes list of meetings and button to log new meeting.
 */
const DayDetailSheet = forwardRef<DayDetailSheetRef, DayDetailSheetProps>(
  ({ onLogMeeting, onEditMeeting }, ref) => {
    const { theme } = useTheme();
    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const [selectedDate, setSelectedDate] = React.useState<string>('');
    const [meetings, setMeetings] = React.useState<UserMeeting[]>([]);
    const styles = useMemo(() => createStyles(theme), [theme]);

    useImperativeHandle(ref, () => ({
      present: (date: string, dayMeetings: UserMeeting[]) => {
        setSelectedDate(date);
        setMeetings(dayMeetings);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleLogMeeting = useCallback(() => {
      onLogMeeting(selectedDate);
    }, [selectedDate, onLogMeeting]);

    const formattedDate = selectedDate
      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : '';

    return (
      <GlassBottomSheet ref={sheetRef} snapPoints={['50%', '80%']}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Calendar size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>{formattedDate}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {meetings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No meetings logged</Text>
              <Text style={styles.emptySubtext}>
                Tap the button below to log a meeting
              </Text>
            </View>
          ) : (
            meetings.map((meeting) => (
              <MeetingListItem
                key={meeting.id}
                meeting={meeting}
                onPress={onEditMeeting}
              />
            ))
          )}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logButton} onPress={handleLogMeeting}>
            <Plus size={20} color="#fff" />
            <Text style={styles.logButtonText}>Log Meeting</Text>
          </TouchableOpacity>
        </View>
      </GlassBottomSheet>
    );
  }
);

DayDetailSheet.displayName = 'DayDetailSheet';

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 24,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    logButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
    },
    logButtonText: {
      fontSize: 16,
      fontFamily: theme.fontSemiBold,
      color: '#fff',
    },
  });

export default DayDetailSheet;
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add components/program/DayDetailSheet.tsx
git commit -m "feat(meetings): add DayDetailSheet component"
```

---

## Task 9: Create LogMeetingSheet Component

**Files:**

- Create: `components/program/LogMeetingSheet.tsx`

**Step 1: Create the component**

```typescript
// components/program/LogMeetingSheet.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, MapPin, Calendar, Clock, Trash2 } from 'lucide-react-native';
import GlassBottomSheet, {
  GlassBottomSheetRef,
} from '@/components/GlassBottomSheet';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { showConfirm } from '@/lib/alert';
import type { UserMeeting } from '@/types/database';

export interface LogMeetingSheetRef {
  present: (date?: string, meeting?: UserMeeting) => void;
  dismiss: () => void;
}

interface LogMeetingSheetProps {
  onMeetingLogged: () => void;
  onMeetingDeleted?: () => void;
}

/**
 * Bottom sheet for logging or editing a meeting.
 * Fields: name (required), date, time (30-min increments), location, notes.
 */
const LogMeetingSheet = forwardRef<LogMeetingSheetRef, LogMeetingSheetProps>(
  ({ onMeetingLogged, onMeetingDeleted }, ref) => {
    const { theme } = useTheme();
    const { profile } = useAuth();
    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [editingMeeting, setEditingMeeting] = useState<UserMeeting | null>(null);
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isEditing = editingMeeting !== null;

    // Round time to nearest 30 minutes
    const roundTo30Min = (d: Date): Date => {
      const result = new Date(d);
      const minutes = result.getMinutes();
      const roundedMinutes = Math.round(minutes / 30) * 30;
      result.setMinutes(roundedMinutes, 0, 0);
      return result;
    };

    const resetForm = useCallback(() => {
      setEditingMeeting(null);
      setName('');
      setDate(roundTo30Min(new Date()));
      setLocation('');
      setNotes('');
      setError('');
      setShowDatePicker(false);
      setShowTimePicker(false);
    }, []);

    useImperativeHandle(ref, () => ({
      present: (initialDate?: string, meeting?: UserMeeting) => {
        resetForm();
        if (meeting) {
          setEditingMeeting(meeting);
          setName(meeting.meeting_name);
          setDate(new Date(meeting.attended_at));
          setLocation(meeting.location || '');
          setNotes(meeting.notes || '');
        } else if (initialDate) {
          const d = new Date(initialDate + 'T12:00:00');
          setDate(roundTo30Min(d));
        }
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleDismiss = useCallback(() => {
      resetForm();
    }, [resetForm]);

    const handleSubmit = useCallback(async () => {
      if (!profile) return;

      if (!name.trim()) {
        setError('Meeting name is required');
        return;
      }

      // Check not in future
      const now = new Date();
      if (date > now) {
        setError('Cannot log future meetings');
        return;
      }

      setIsSubmitting(true);
      setError('');

      try {
        const meetingData = {
          user_id: profile.id,
          meeting_name: name.trim(),
          meeting_type: 'other' as const, // Ignored but required by schema
          location: location.trim() || null,
          attended_at: date.toISOString(),
          notes: notes.trim() || null,
        };

        if (isEditing && editingMeeting) {
          const { error: updateError } = await supabase
            .from('user_meetings')
            .update(meetingData)
            .eq('id', editingMeeting.id);

          if (updateError) throw updateError;
          showToast.success('Meeting updated');
        } else {
          const { error: insertError } = await supabase
            .from('user_meetings')
            .insert(meetingData);

          if (insertError) throw insertError;
          showToast.success('Meeting logged');
        }

        onMeetingLogged();
        handleClose();
      } catch (err) {
        logger.error('Meeting save failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to save meeting. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }, [profile, name, date, location, notes, isEditing, editingMeeting, onMeetingLogged, handleClose]);

    const handleDelete = useCallback(async () => {
      if (!editingMeeting) return;

      const confirmed = await showConfirm(
        'Delete Meeting',
        'Are you sure you want to delete this meeting?',
        'Delete',
        'Cancel',
        true
      );

      if (!confirmed) return;

      setIsSubmitting(true);

      try {
        const { error: deleteError } = await supabase
          .from('user_meetings')
          .delete()
          .eq('id', editingMeeting.id);

        if (deleteError) throw deleteError;

        showToast.success('Meeting deleted');
        onMeetingDeleted?.();
        handleClose();
      } catch (err) {
        logger.error('Meeting delete failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to delete meeting');
      } finally {
        setIsSubmitting(false);
      }
    }, [editingMeeting, onMeetingDeleted, handleClose]);

    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['70%', '90%']}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MapPin size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>
            {isEditing ? 'Edit Meeting' : 'Log Meeting'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Meeting Name *</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Friday Night AA"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={18} color={theme.textSecondary} />
                <Text style={styles.pickerText}>{formattedDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={18} color={theme.textSecondary} />
                <Text style={styles.pickerText}>{formattedTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(showDatePicker || showTimePicker) && Platform.OS !== 'web' && (
            <DateTimePicker
              value={date}
              mode={showDatePicker ? 'date' : 'time'}
              display={showTimePicker ? 'spinner' : 'default'}
              minuteInterval={30}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
            />
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Community Center"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <BottomSheetTextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any thoughts or reflections..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </BottomSheetScrollView>

        <View style={styles.footer}>
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 size={20} color={theme.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isEditing ? 'Save Changes' : 'Log Meeting'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassBottomSheet>
    );
  }
);

LogMeetingSheet.displayName = 'LogMeetingSheet';

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 24,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    notesInput: {
      minHeight: 80,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    flex1: {
      flex: 1,
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    pickerText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    deleteButton: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    submitText: {
      fontSize: 16,
      fontFamily: theme.fontSemiBold,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

export default LogMeetingSheet;
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add components/program/LogMeetingSheet.tsx
git commit -m "feat(meetings): add LogMeetingSheet component"
```

---

## Task 10: Implement Meetings Screen

**Files:**

- Modify: `app/(app)/(tabs)/program/meetings.tsx`

**Step 1: Replace placeholder with full implementation**

```typescript
// app/(app)/(tabs)/program/meetings.tsx
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import MeetingStatsHeader from '@/components/program/MeetingStatsHeader';
import MeetingsCalendar from '@/components/program/MeetingsCalendar';
import DayDetailSheet, {
  DayDetailSheetRef,
} from '@/components/program/DayDetailSheet';
import LogMeetingSheet, {
  LogMeetingSheetRef,
} from '@/components/program/LogMeetingSheet';
import {
  calculateMeetingStreak,
  checkMeetingMilestones,
} from '@/lib/meeting-utils';
import type { UserMeeting, UserMeetingMilestone } from '@/types/database';

/**
 * Meetings screen - calendar view with meeting attendance tracking.
 */
export default function MeetingsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const tabBarHeight = useTabBarPadding();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [meetings, setMeetings] = useState<UserMeeting[]>([]);
  const [milestones, setMilestones] = useState<UserMeetingMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayDetailRef = useRef<DayDetailSheetRef>(null);
  const logMeetingRef = useRef<LogMeetingSheetRef>(null);

  // Fetch meetings and milestones
  const fetchData = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const [meetingsResult, milestonesResult] = await Promise.all([
        supabase
          .from('user_meetings')
          .select('*')
          .eq('user_id', profile.id)
          .order('attended_at', { ascending: false }),
        supabase
          .from('user_meeting_milestones')
          .select('*')
          .eq('user_id', profile.id),
      ]);

      if (meetingsResult.error) throw meetingsResult.error;
      if (milestonesResult.error) throw milestonesResult.error;

      setMeetings(meetingsResult.data || []);
      setMilestones(milestonesResult.data || []);
    } catch (err) {
      logger.error('Meetings fetch failed', err as Error, {
        category: LogCategory.DATABASE,
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Calculate stats
  const streak = useMemo(
    () => calculateMeetingStreak(meetings),
    [meetings]
  );

  const meetingDates = useMemo(() => {
    const dates = new Set<string>();
    meetings.forEach((m) => {
      const date = new Date(m.attended_at).toLocaleDateString('en-CA');
      dates.add(date);
    });
    return dates;
  }, [meetings]);

  // Get meetings for a specific day
  const getMeetingsForDay = useCallback(
    (dateStr: string) => {
      return meetings.filter((m) => {
        const meetingDate = new Date(m.attended_at).toLocaleDateString('en-CA');
        return meetingDate === dateStr;
      });
    },
    [meetings]
  );

  // Handle day press on calendar
  const handleDayPress = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      const dayMeetings = getMeetingsForDay(dateStr);
      dayDetailRef.current?.present(dateStr, dayMeetings);
    },
    [getMeetingsForDay]
  );

  // Handle log meeting from day detail
  const handleLogMeeting = useCallback((date: string) => {
    dayDetailRef.current?.dismiss();
    setTimeout(() => {
      logMeetingRef.current?.present(date);
    }, 300);
  }, []);

  // Handle edit meeting
  const handleEditMeeting = useCallback((meeting: UserMeeting) => {
    dayDetailRef.current?.dismiss();
    setTimeout(() => {
      logMeetingRef.current?.present(undefined, meeting);
    }, 300);
  }, []);

  // Handle meeting logged - check for milestones
  const handleMeetingLogged = useCallback(async () => {
    await fetchData();

    // Check for new milestones
    if (!profile) return;

    const newMilestones = checkMeetingMilestones(
      meetings.length + 1, // +1 for the just-logged meeting
      streak,
      milestones.map((m) => ({
        milestone_type: m.milestone_type,
        milestone_value: m.milestone_value,
      }))
    );

    // Save new milestones
    for (const milestone of newMilestones) {
      try {
        await supabase.from('user_meeting_milestones').insert({
          user_id: profile.id,
          milestone_type: milestone.type,
          milestone_value: milestone.value,
        });
        logger.info(`Meeting milestone achieved: ${milestone.label}`, {
          category: LogCategory.DATABASE,
        });
      } catch (err) {
        logger.error('Failed to save milestone', err as Error, {
          category: LogCategory.DATABASE,
        });
      }
    }
  }, [fetchData, profile, meetings.length, streak, milestones]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <MeetingStatsHeader totalMeetings={meetings.length} streak={streak} />

      <MeetingsCalendar
        meetingDates={meetingDates}
        onDayPress={handleDayPress}
        selectedDate={selectedDate}
      />

      {meetings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No meetings logged yet</Text>
          <Text style={styles.emptySubtext}>
            Tap any day on the calendar to log your first meeting
          </Text>
        </View>
      )}

      <DayDetailSheet
        ref={dayDetailRef}
        onLogMeeting={handleLogMeeting}
        onEditMeeting={handleEditMeeting}
      />

      <LogMeetingSheet
        ref={logMeetingRef}
        onMeetingLogged={handleMeetingLogged}
        onMeetingDeleted={fetchData}
      />
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
```

**Step 2: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: No errors, all tests pass

**Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/meetings.tsx
git commit -m "feat(meetings): implement meetings screen with calendar view"
```

---

## Task 11: Add Meeting Events to Journey Timeline

**Files:**

- Modify: `app/(app)/(tabs)/journey.tsx`

**Step 1: Update TimelineEventType to include meeting types**

Find the `TimelineEventType` type (around line 25) and add meeting types:

```typescript
type TimelineEventType =
  | 'sobriety_start'
  | 'slip_up'
  | 'step_completion'
  | 'milestone'
  | 'task_completion'
  | 'task_milestone'
  | 'meeting_logged'
  | 'meeting_milestone';
```

**Step 2: Add MapPin and Trophy to icon imports**

Update the lucide imports (around line 8):

```typescript
import {
  Calendar,
  CheckCircle,
  Heart,
  RefreshCw,
  Award,
  TrendingUp,
  CheckSquare,
  ListChecks,
  Target,
  MapPin,
  Trophy,
} from 'lucide-react-native';
```

**Step 3: Add 'map-pin' and 'trophy' to icon type union**

Update the `icon` property in `TimelineEvent` interface (around line 49):

```typescript
  icon:
    | 'calendar'
    | 'check'
    | 'heart'
    | 'refresh'
    | 'award'
    | 'trending'
    | 'check-square'
    | 'list-checks'
    | 'target'
    | 'map-pin'
    | 'trophy';
```

**Step 4: Add icon rendering for map-pin and trophy**

In the `getIcon` function (around line 295), add:

```typescript
      case 'map-pin':
        return <MapPin size={size} color={color} />;
      case 'trophy':
        return <Trophy size={size} color={color} />;
```

**Step 5: Add imports for UserMeeting and UserMeetingMilestone**

Update the import from `@/types/database` (around line 7):

```typescript
import {
  UserStepProgress,
  SlipUp,
  Task,
  UserMeeting,
  UserMeetingMilestone,
} from '@/types/database';
```

**Step 6: Update TimelineRawData interface to include meetings**

Find the interface (around line 83) and add:

```typescript
interface TimelineRawData {
  slipUps: SlipUp[];
  stepProgress: UserStepProgress[];
  completedTasks: Task[];
  meetings: UserMeeting[];
  meetingMilestones: UserMeetingMilestone[];
}
```

**Step 7: Fetch meetings data**

In the `fetchRawData` function, add after the completedTasks fetch (around line 130):

```typescript
// 4. Fetch meetings
const { data: meetings, error: meetingsError } = await supabase
  .from('user_meetings')
  .select('*')
  .eq('user_id', profile.id)
  .order('attended_at', { ascending: false });

if (meetingsError) throw meetingsError;

// 5. Fetch meeting milestones
const { data: meetingMilestones, error: meetingMilestonesError } = await supabase
  .from('user_meeting_milestones')
  .select('*')
  .eq('user_id', profile.id);

if (meetingMilestonesError) throw meetingMilestonesError;

setTimelineData({
  slipUps: slipUps || [],
  stepProgress: stepProgress || [],
  completedTasks: completedTasks || [],
  meetings: meetings || [],
  meetingMilestones: meetingMilestones || [],
});
```

**Step 8: Process meetings into timeline events**

In the `React.useEffect` that processes timeline data (after task milestones, around line 242), add:

```typescript
// 7. Meeting events
const { meetings, meetingMilestones } = timelineData;

meetings.forEach((meeting) => {
  const subtitle = [
    meeting.location,
    new Date(meeting.attended_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  ]
    .filter(Boolean)
    .join(' • ');

  timelineEvents.push({
    id: `meeting-${meeting.id}`,
    type: 'meeting_logged',
    date: new Date(meeting.attended_at),
    title: meeting.meeting_name,
    description: subtitle,
    icon: 'map-pin',
    color: theme.info,
  });
});

// 8. Meeting milestones
meetingMilestones.forEach((milestone) => {
  let title = '';
  if (milestone.milestone_type === 'count') {
    title =
      milestone.milestone_value === 1 ? 'First Meeting!' : `${milestone.milestone_value} Meetings`;
  } else if (milestone.milestone_type === 'streak') {
    title = '7-Day Meeting Streak!';
  } else if (milestone.milestone_type === 'monthly') {
    title = `${milestone.milestone_value} Meetings This Month`;
  }

  timelineEvents.push({
    id: `meeting-milestone-${milestone.milestone_type}-${milestone.milestone_value}`,
    type: 'meeting_milestone',
    date: new Date(milestone.achieved_at),
    title,
    description: 'Meeting attendance milestone',
    icon: 'trophy',
    color: theme.award,
  });
});
```

**Step 9: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: No errors, all tests pass

**Step 10: Commit**

```bash
git add app/\(app\)/\(tabs\)/journey.tsx
git commit -m "feat(journey): add meeting events and milestones to timeline"
```

---

## Task 12: Run Full Quality Checks

**Step 1: Run all quality checks**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
Expected: All checks pass

**Step 2: Commit any formatting fixes**

If there are formatting changes:

```bash
git add -A
git commit -m "style: apply formatting"
```

---

## Task 13: Final Verification

**Step 1: List all commits on branch**

Run: `git log --oneline main..HEAD`
Expected: See all feature commits

**Step 2: Verify file structure**

Run: `ls -la lib/meeting-utils.ts components/program/Meeting*.tsx components/program/DayDetailSheet.tsx components/program/LogMeetingSheet.tsx`
Expected: All files exist

**Step 3: Run tests one final time**

Run: `pnpm test`
Expected: All tests pass

---

## Summary

This plan creates the meetings feature in 13 tasks:

1. **Database migration** - Create milestones table
2. **TypeScript types** - Add UserMeetingMilestone interface
3. **Meeting utils** - Streak calculation
4. **Meeting utils** - Milestone detection
5. **MeetingStatsHeader** - Stats display component
6. **MeetingsCalendar** - Calendar grid component
7. **MeetingListItem** - Meeting row component
8. **DayDetailSheet** - Day detail bottom sheet
9. **LogMeetingSheet** - Log/edit meeting form
10. **Meetings screen** - Main screen implementation
11. **Journey timeline** - Add meeting events
12. **Quality checks** - Format, lint, typecheck, build, test
13. **Final verification** - Confirm everything works
