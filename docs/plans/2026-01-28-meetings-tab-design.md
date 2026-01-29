# Meetings Tab Design

## Overview

Simple meeting attendance tracking with calendar view, day streak tracking, and journey timeline integration.

## Data Model

### `user_meetings` table (existing, simplified)

| Field        | Type      | Required | Description            |
| ------------ | --------- | -------- | ---------------------- |
| id           | UUID      | Yes      | Primary key            |
| user_id      | UUID      | Yes      | References profiles    |
| meeting_name | text      | Yes      | Name of the meeting    |
| location     | text      | No       | Meeting location       |
| attended_at  | timestamp | Yes      | Date and time attended |
| notes        | text      | No       | Optional reflections   |
| created_at   | timestamp | Yes      | Auto-generated         |
| updated_at   | timestamp | Yes      | Auto-generated         |

Note: The existing `meeting_type` field is ignored (not removed for migration simplicity).

### `user_meeting_milestones` table (new)

| Field           | Type      | Required | Description                     |
| --------------- | --------- | -------- | ------------------------------- |
| id              | UUID      | Yes      | Primary key                     |
| user_id         | UUID      | Yes      | References profiles             |
| milestone_type  | text      | Yes      | 'count', 'streak', or 'monthly' |
| milestone_value | integer   | Yes      | The milestone value achieved    |
| achieved_at     | timestamp | Yes      | When milestone was reached      |

Unique constraint on (user_id, milestone_type, milestone_value).

### Streak Calculation

- Calculated on the fly, not stored
- Counts consecutive days (ending today or yesterday) with at least one meeting
- Multiple meetings on same day = 1 day for streak purposes
- Missing a day resets streak to 0

### Milestone Triggers

| Type    | Values                | Description                      |
| ------- | --------------------- | -------------------------------- |
| count   | 1, 5, 10, 25, 50, 100 | Total meetings attended          |
| streak  | 7                     | 7 consecutive days with meetings |
| monthly | 30                    | 30 meetings in a calendar month  |

## Meetings Tab UI

### Layout (top to bottom)

1. **Stats header**
   - Total meeting count: "47 meetings"
   - Day streak (only if active): "🔥 5 day streak"
   - No streak = no streak text shown

2. **Calendar view**
   - Monthly grid
   - Dots on days with meetings
   - Current day highlighted
   - Swipe/arrows to navigate months
   - Tap day to open day detail sheet

3. **Day detail bottom sheet**
   - Header: Selected date
   - List of meetings for that day (name, time, location)
   - "Log Meeting" button
   - Tap meeting to edit

### Log Meeting Form (bottom sheet)

| Field        | Type                    | Notes                                                   |
| ------------ | ----------------------- | ------------------------------------------------------- |
| Meeting name | Text input              | Required                                                |
| Date         | Date picker             | Pre-filled with selected day                            |
| Time         | iOS-style scroll picker | 30-minute increments (:00, :30)                         |
| Location     | Text input              | Optional                                                |
| Notes        | Multiline text          | Optional, placeholder: "Any thoughts or reflections..." |

- Cannot log future meetings
- Can backdate past meetings

## Journey Timeline Integration

### Individual Meetings

- Event type: `meeting_logged`
- Icon: MapPin (Lucide)
- Title: Meeting name
- Subtitle: Location and time
- Chronological with other events

### Milestones

- Event types: `meeting_milestone`, `meeting_streak`, `meeting_monthly`
- Icon: Trophy (Lucide)
- Distinct gold/amber styling
- Examples:
  - "First Meeting!" (count = 1)
  - "5 Meetings" (count = 5)
  - "7-Day Streak!" (streak = 7)
  - "30 Meetings This Month" (monthly = 30)

## Edge Cases

- **Empty state**: Calendar shows no dots, "0 meetings", encouraging message
- **Day with no meetings**: Sheet shows "No meetings logged" + Log button
- **Deleting meetings**: Earned milestones are kept
- **Streak grace period**: Counts today OR yesterday as valid end date

## File Structure

### New Files

```
app/(app)/(tabs)/program/meetings.tsx        # Main screen

components/program/
├── MeetingsCalendar.tsx                     # Calendar grid
├── MeetingStatsHeader.tsx                   # Count + streak
├── DayDetailSheet.tsx                       # Day bottom sheet
├── LogMeetingSheet.tsx                      # Log/edit form
└── MeetingListItem.tsx                      # Meeting row

lib/
└── meeting-utils.ts                         # Streak calc, milestone check
```

### Modified Files

- `app/(app)/(tabs)/journey.tsx` - Add meeting event types
- `types/database.ts` - Add UserMeetingMilestone type

### Database Migrations

- Create `user_meeting_milestones` table

### Tests

- `__tests__/lib/meeting-utils.test.ts`
- `__tests__/components/program/MeetingsCalendar.test.tsx`
- `__tests__/components/program/LogMeetingSheet.test.tsx`
