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

```text
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
  program text CHECK (program IN ('aa', 'na')),
  month int,
  day int,
  title text,
  content text,
  source text,           -- "Daily Reflections, p. 24"
  UNIQUE(program, month, day)
)

-- Index for fast lookups by program and date
CREATE INDEX idx_daily_readings_lookup ON daily_readings(program, month, day);

-- User preferences for reading program
-- Note: When preferred_program = 'both', the UI displays readings side-by-side
-- with a toggle to switch between AA and NA views
user_reading_preferences (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  preferred_program text DEFAULT 'aa' CHECK (preferred_program IN ('aa', 'na', 'both')),
  created_at timestamptz,
  updated_at timestamptz
)

-- Track which readings user has viewed
-- Note: reflection_date is the date of the reading content (not when viewed - that's viewed_at)
-- AA and NA readings are tracked separately (user can mark both as read on the same day)
user_reading_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  reflection_date date,        -- The date of the reading content
  program text CHECK (program IN ('aa', 'na')),
  viewed_at timestamptz,
  UNIQUE(user_id, reflection_date, program)
)

-- Index for streak calculations and history lookups
CREATE INDEX idx_user_reading_history_user_date ON user_reading_history(user_id, reflection_date DESC);
```

### Prayers

```sql
-- Static prayer content (seeded, not user-generated)
prayers (
  id uuid PRIMARY KEY,
  title text,
  content text,
  category text CHECK (category IN ('step', 'common', 'aa', 'na')),
  step_number int,      -- NULL if not step-specific
  sort_order int
)

-- Index for categorized listings
CREATE INDEX idx_prayers_category ON prayers(category, sort_order);

-- User's favorited prayers
user_prayer_favorites (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  prayer_id uuid REFERENCES prayers(id),
  created_at timestamptz,
  UNIQUE(user_id, prayer_id)
)

-- Index for listing user's favorites
CREATE INDEX idx_user_prayer_favorites_user ON user_prayer_favorites(user_id);

-- Track prayers viewed
-- Note: Allows multiple records for same user/prayer to track repeated views over time
-- Use GROUP BY and MAX(viewed_at) to get most recent view per prayer
user_prayer_history (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  prayer_id uuid REFERENCES prayers(id),
  viewed_at timestamptz
)

-- Index for recent history lookups
CREATE INDEX idx_user_prayer_history_user ON user_prayer_history(user_id, viewed_at DESC);
```

### Literature

```sql
-- Books and their metadata (seeded)
literature_books (
  id uuid PRIMARY KEY,
  title text,              -- "Alcoholics Anonymous (Big Book)"
  program text CHECK (program IN ('aa', 'na')),
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

-- Index for chapter listings by book
CREATE INDEX idx_literature_chapters_book ON literature_chapters(book_id, chapter_number);

-- User's visible books (show/hide functionality)
-- Note: Rows are only created when a user explicitly adds a book to their list.
-- is_visible allows hiding without deleting (preserves progress data).
user_literature_books (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  book_id uuid REFERENCES literature_books(id),
  is_visible boolean DEFAULT true,
  added_at timestamptz,
  UNIQUE(user_id, book_id)
)

-- Index for filtering visible books per user
CREATE INDEX idx_user_literature_books_user_visible ON user_literature_books(user_id, is_visible);

-- Chapter completion tracking
user_literature_progress (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  chapter_id uuid REFERENCES literature_chapters(id),
  completed_at timestamptz,
  UNIQUE(user_id, chapter_id)
)

-- Index for progress lookups and calculations
CREATE INDEX idx_user_literature_progress_user ON user_literature_progress(user_id, chapter_id);
```

### Meetings

```sql
-- User's logged meetings
user_meetings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  meeting_name text,
  meeting_type text CHECK (meeting_type IN ('aa', 'na', 'other')),
  location text,           -- Optional
  attended_at timestamptz,
  notes text,              -- Optional personal notes
  created_at timestamptz
)

-- Index for meetings grouped by week
CREATE INDEX idx_user_meetings_user_attended ON user_meetings(user_id, attended_at DESC);

-- Index for meeting names auto-suggest
CREATE INDEX idx_user_meetings_user_name ON user_meetings(user_id, meeting_name);
```

### Statistics

```sql
-- Cached stats for fast Home screen loading
-- Updated via database trigger on user_reading_history INSERT/DELETE
-- Trigger function: update_user_program_stats()
user_program_stats (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) UNIQUE,
  reading_current_streak int DEFAULT 0,
  reading_longest_streak int DEFAULT 0,
  reading_total_count int DEFAULT 0,
  updated_at timestamptz
)

-- Trigger to maintain cached stats in real-time
CREATE OR REPLACE FUNCTION update_user_program_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate stats for affected user
  -- Implementation calculates streaks and totals from user_reading_history
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_reading_stats
AFTER INSERT OR DELETE ON user_reading_history
FOR EACH ROW EXECUTE FUNCTION update_user_program_stats();
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

**Mark as Read Implementation:**

| UI State              | Query                                                                                          | Mutation                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Check if already read | `SELECT * FROM user_reading_history WHERE user_id = ? AND reflection_date = ? AND program = ?` | -                                                                                                             |
| Mark as read          | -                                                                                              | `INSERT INTO user_reading_history (user_id, reflection_date, program, viewed_at) VALUES (?, today, ?, now())` |
| Show checkmark        | If query returns row                                                                           | -                                                                                                             |
| Show button           | If query returns no row                                                                        | -                                                                                                             |

**Program toggle behavior:**

- AA and NA readings are tracked separately
- Switching between AA/NA re-queries for that program's read status
- User can mark both AA and NA as read on the same day

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

```text
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

```text
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

**Naming rationale:** The column is intentionally named generically (`show_program_content`)
to allow for potential future expansion to other program types beyond 12-step content.
The UI uses the specific label "Show 12 Step Program" because that accurately describes
the current functionality. If additional program types are added in the future, the
column can support them without migration, and the UI label can be updated accordingly.

### Settings UI

```text
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

#### Phase 1: Database Changes (deploy behind feature flag)

1. **Create new tables** (can be deployed independently):

   ```sql
   -- Run in transaction
   BEGIN;
   CREATE TABLE daily_readings (...);
   CREATE TABLE user_reading_preferences (...);
   CREATE TABLE user_reading_history (...);
   CREATE TABLE prayers (...);
   CREATE TABLE user_prayer_favorites (...);
   CREATE TABLE user_prayer_history (...);
   CREATE TABLE literature_books (...);
   CREATE TABLE literature_chapters (...);
   CREATE TABLE user_literature_books (...);
   CREATE TABLE user_literature_progress (...);
   CREATE TABLE user_meetings (...);
   CREATE TABLE user_program_stats (...);
   COMMIT;
   ```

2. **Column rename migration** (idempotent):

   ```sql
   -- Check if old column exists before renaming
   DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'profiles' AND column_name = 'show_twelve_step_content') THEN
       ALTER TABLE profiles RENAME COLUMN show_twelve_step_content TO show_program_content;
     END IF;
   END $$;
   ```

   Existing user preferences are preserved (column data unchanged).

3. **Seed static content** (prayers, literature_books, literature_chapters)

#### Phase 2: UI Deployment

4. Move existing steps screens to new location
5. Build new screens incrementally
6. Enable feature flag to show new Program tab

#### Default Values for New Tables

- `user_reading_preferences`: Created on first access to Daily Readings tab (lazy initialization)
- `user_program_stats`: Created via trigger on first `user_reading_history` insert

#### Rollback Strategy

**If rollback needed after Phase 1:**

```sql
-- Reverse column rename
ALTER TABLE profiles RENAME COLUMN show_program_content TO show_twelve_step_content;

-- New tables can remain (empty) or be dropped
-- No FK dependencies from existing tables, safe to drop
DROP TABLE IF EXISTS user_program_stats CASCADE;
DROP TABLE IF EXISTS user_meetings CASCADE;
DROP TABLE IF EXISTS user_literature_progress CASCADE;
DROP TABLE IF EXISTS user_literature_books CASCADE;
DROP TABLE IF EXISTS literature_chapters CASCADE;
DROP TABLE IF EXISTS literature_books CASCADE;
DROP TABLE IF EXISTS user_prayer_history CASCADE;
DROP TABLE IF EXISTS user_prayer_favorites CASCADE;
DROP TABLE IF EXISTS prayers CASCADE;
DROP TABLE IF EXISTS user_reading_history CASCADE;
DROP TABLE IF EXISTS user_reading_preferences CASCADE;
DROP TABLE IF EXISTS daily_readings CASCADE;
```

**If rollback needed after Phase 2:**

- Disable feature flag to hide new UI
- Database can remain as-is (no data loss)
- Revert app code to previous version
