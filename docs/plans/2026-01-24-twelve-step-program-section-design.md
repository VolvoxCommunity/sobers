# 12 Step Program Section Design

**Date:** 2026-01-24
**Status:** Approved

## Overview

Replace the current "Steps" tab with a comprehensive "12 Step Program" section containing five sub-sections: Steps, Daily Readings, Prayers, Literature, and Meetings.

## Navigation Structure

### Bottom Tab Change

- Rename "Steps" tab to "Program"
- Update icon from `BookOpen` to recovery-focused icon (e.g., `Compass` or `Heart`)
- Route changes from `/steps` to `/program`

### Internal Navigation (Horizontal Tabs)

Five tabs with icon + short label:

| Tab            | Icon | Label   |
| -------------- | ---- | ------- |
| Steps          | 📖   | Steps   |
| Daily Readings | ☀️   | Daily   |
| Prayers        | 🙏   | Prayers |
| Literature     | 📚   | Lit     |
| Meetings       | 👥   | Meet    |

### File Structure

```
app/(app)/(tabs)/program/
├── _layout.tsx        # Top tabs navigator
├── index.tsx          # Redirects to /steps (default tab)
├── steps/
│   ├── index.tsx      # Steps list (existing, moved)
│   └── [id].tsx       # Step detail (existing, moved)
├── daily.tsx          # Daily readings
├── prayers.tsx        # Prayer library
├── literature.tsx     # Literature + tracker
└── meetings.tsx       # Meeting tracker
```

## Database Schema

### Daily Readings

```sql
-- Fallback content if external APIs unavailable
daily_readings (
  id uuid PRIMARY KEY,
  program text,          -- 'aa' | 'na'
  month int,
  day int,
  title text,
  content text,
  source text,           -- "Daily Reflections, p. 24"
  UNIQUE(program, month, day)
)

-- User preferences for reading program
user_reading_preferences (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  preferred_program text DEFAULT 'aa', -- 'aa' | 'na' | 'both'
  created_at timestamptz,
  updated_at timestamptz
)

-- Track which readings user has viewed
user_reading_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  reading_date date,           -- The date of the reading
  program text,                -- 'aa' | 'na'
  viewed_at timestamptz,
  UNIQUE(user_id, reading_date, program)
)
```

### Prayers

```sql
-- Static prayer content (seeded, not user-generated)
prayers (
  id uuid PRIMARY KEY,
  title text,
  content text,
  category text,        -- 'step' | 'common' | 'aa' | 'na'
  step_number int,      -- NULL if not step-specific
  sort_order int
)

-- User's favorited prayers
user_prayer_favorites (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  prayer_id uuid REFERENCES prayers(id),
  created_at timestamptz,
  UNIQUE(user_id, prayer_id)
)

-- Track prayers viewed
user_prayer_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  prayer_id uuid REFERENCES prayers(id),
  viewed_at timestamptz
)
```

### Literature

```sql
-- Books and their metadata (seeded)
literature_books (
  id uuid PRIMARY KEY,
  title text,              -- "Alcoholics Anonymous (Big Book)"
  program text,            -- 'aa' | 'na'
  chapter_count int,
  external_url text,       -- Link to purchase/read
  sort_order int
)

-- Chapters per book (seeded)
literature_chapters (
  id uuid PRIMARY KEY,
  book_id uuid REFERENCES literature_books(id),
  chapter_number int,
  title text,
  page_range text          -- "1-14"
)

-- User's visible books (show/hide functionality)
user_literature_books (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  book_id uuid REFERENCES literature_books(id),
  is_visible boolean DEFAULT true,
  added_at timestamptz,
  UNIQUE(user_id, book_id)
)

-- Chapter completion tracking
user_literature_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  chapter_id uuid REFERENCES literature_chapters(id),
  completed_at timestamptz,
  UNIQUE(user_id, chapter_id)
)
```

### Meetings

```sql
-- User's logged meetings
user_meetings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  meeting_name text,
  meeting_type text,       -- 'aa' | 'na' | 'other'
  location text,           -- Optional
  attended_at timestamptz,
  notes text,              -- Optional personal notes
  created_at timestamptz
)
```

### Statistics

```sql
-- Cached stats for fast Home screen loading
user_program_stats (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) UNIQUE,
  reading_current_streak int DEFAULT 0,
  reading_longest_streak int DEFAULT 0,
  reading_total_count int DEFAULT 0,
  updated_at timestamptz
)
```

## Screen Designs

### Steps Tab

- Move existing `steps/index.tsx` and `steps/[id].tsx` into new location
- No functional changes to existing step list and detail views

### Daily Readings Tab

- Toggle between AA/NA readings (based on user preference)
- Display full reading content for current date
- "Mark as Read" button tracks daily engagement
- Streak counter shows consecutive days read
- Pull-to-refresh fetches latest content

**Data source priority:**

1. External API (AA Daily Reflections, NA Just for Today)
2. Supabase fallback (`daily_readings` table)

### Prayers Tab

- Categorized list: Step Prayers, Common Prayers, AA Prayers, NA Prayers
- Heart icon to favorite/unfavorite prayers
- Prayer detail view shows full text
- Viewing a prayer automatically tracks in history

### Literature Tab

- "My Books" list showing user's added books
- Progress bar per book (chapters completed / total)
- [+ Add Book] button to add from available books
- [⋮ menu] per book: Hide from list, Reset progress, View details
- Book detail shows chapter list with checkboxes
- External link to purchase/read official content

### Meetings Tab

- Meetings grouped by week (This Week, Last Week, Earlier)
- [+ Log New] button opens meeting entry modal
- Modal fields: Meeting Name, Type (AA/NA/Other), Date & Time, Location (optional), Notes (optional)
- Meeting names auto-suggest from previous entries
- Tap meeting to view/edit, swipe to delete

## Home Screen Integration

### Daily Reflection Card (Full Content)

```
┌─────────────────────────────────────────────────┐
│  ☀️ Daily Reflection              Jan 24, 2026 │
├─────────────────────────────────────────────────┤
│                                                 │
│  "Acceptance Is the Answer"                    │
│                                                 │
│  Full reading content displayed here.          │
│  The complete daily meditation text            │
│  so users can read it without navigating       │
│  away from Home...                             │
│                                                 │
│  — Daily Reflections, p. 24                    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │     ✓ Mark as Read     🔥 12-day streak │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Program Activity Card

```
┌─────────────────────────────────────────────────┐
│  📊 Program Activity                    [→]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 🔥 12   │ │ 📖 4/12 │ │ 👥 3    │           │
│  │ Day     │ │ Steps   │ │ Meetings│           │
│  │ Streak  │ │ Done    │ │ This Wk │           │
│  └─────────┘ └─────────┘ └─────────┘           │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Statistics Tracked

### Daily Reflections

| Metric         | Description                          |
| -------------- | ------------------------------------ |
| Current streak | Consecutive days with reading marked |
| Longest streak | All-time best streak                 |
| Total readings | Lifetime count of readings completed |
| This month     | Readings completed current month     |

### Steps

| Metric          | Description                |
| --------------- | -------------------------- |
| Steps completed | X/12 steps marked complete |

### Prayers

| Metric          | Description                 |
| --------------- | --------------------------- |
| Prayers viewed  | Total unique prayers read   |
| Favorites count | Number of favorited prayers |

### Literature

| Metric             | Description                    |
| ------------------ | ------------------------------ |
| Books in progress  | Active books being tracked     |
| Chapters completed | Total across all books         |
| Overall progress   | Combined % across active books |

### Meetings

| Metric              | Description            |
| ------------------- | ---------------------- |
| Meetings this week  | Count for current week |
| Meetings this month | Monthly total          |
| Total meetings      | Lifetime count         |

## Settings

### Profile Column Change

| Current                    | New                    |
| -------------------------- | ---------------------- |
| `show_twelve_step_content` | `show_program_content` |

### Settings UI

```
┌─────────────────────────────────────────────────┐
│  Content Preferences                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Show 12 Step Program               [Toggle]   │
│  Display the Program tab with steps,           │
│  daily readings, prayers, literature,          │
│  and meeting tracker                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

### When Disabled

- Program tab hidden from bottom navigation
- Daily Reflection card hidden from Home screen
- Program Activity card hidden from Home screen

## Implementation Notes

### External API Research Needed

- AA Daily Reflections API availability
- NA Just for Today API availability
- Fallback: Populate `daily_readings` table manually

### Prayer Content

Seed `prayers` table with:

- Step 3 Prayer
- Step 7 Prayer
- Step 11 Prayer (various versions)
- Serenity Prayer
- Lord's Prayer
- St. Francis Prayer
- AA-specific prayers
- NA-specific prayers

### Literature Books

Seed `literature_books` and `literature_chapters` with:

- Alcoholics Anonymous (Big Book)
- Twelve Steps and Twelve Traditions
- NA Basic Text
- Living Clean
- It Works: How and Why

### Migration Strategy

1. Create new database tables
2. Rename `show_twelve_step_content` to `show_program_content`
3. Move existing steps screens to new location
4. Build new screens incrementally
5. Seed prayer and literature content
