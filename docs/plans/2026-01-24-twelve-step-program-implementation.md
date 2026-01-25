# 12 Step Program Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Steps tab with a comprehensive Program section containing Steps, Daily Readings, Prayers, Literature, and Meetings.

**Architecture:** File-based routing with Expo Router. New `/program` route with horizontal top tabs for sub-sections. Supabase for data persistence with RLS policies. Context API for state management.

**Tech Stack:** Expo Router 6, React Native, Supabase, TypeScript

**Design Document:** `docs/plans/2026-01-24-twelve-step-program-section-design.md`

---

## Phase 1: Database Schema & Types

### Task 1.1: Create Database Migration for Daily Readings Tables

**Files:**

- Create: `supabase/migrations/20260124000001_create_daily_readings_tables.sql`

**Step 1: Write the migration file**

```sql
/*
  # Daily Readings Tables

  Creates tables for daily readings content and user tracking:
  - daily_readings: Fallback content when external APIs unavailable
  - user_reading_preferences: User's preferred program (AA/NA/both)
  - user_reading_history: Track which readings user has viewed
*/

-- Daily readings content (fallback for external APIs)
CREATE TABLE IF NOT EXISTS public.daily_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program text NOT NULL CHECK (program IN ('aa', 'na')),
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  day int NOT NULL CHECK (day >= 1 AND day <= 31),
  title text NOT NULL,
  content text NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program, month, day)
);

-- User reading preferences
CREATE TABLE IF NOT EXISTS public.user_reading_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_program text NOT NULL DEFAULT 'aa' CHECK (preferred_program IN ('aa', 'na', 'both')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User reading history
CREATE TABLE IF NOT EXISTS public.user_reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reading_date date NOT NULL,
  program text NOT NULL CHECK (program IN ('aa', 'na')),
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reading_date, program)
);

-- Triggers for updated_at
CREATE TRIGGER update_daily_readings_updated_at
  BEFORE UPDATE ON public.daily_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reading_preferences_updated_at
  BEFORE UPDATE ON public.user_reading_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.daily_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_history ENABLE ROW LEVEL SECURITY;

-- daily_readings: Anyone can read
CREATE POLICY "Anyone can read daily readings"
  ON public.daily_readings FOR SELECT
  USING (true);

-- user_reading_preferences: Users can manage their own
CREATE POLICY "Users can read own reading preferences"
  ON public.user_reading_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading preferences"
  ON public.user_reading_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading preferences"
  ON public.user_reading_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- user_reading_history: Users can manage their own
CREATE POLICY "Users can read own reading history"
  ON public.user_reading_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading history"
  ON public.user_reading_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading history"
  ON public.user_reading_history FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000001_create_daily_readings_tables.sql
git commit -m "feat(db): add daily readings tables and RLS policies"
```

---

### Task 1.2: Create Database Migration for Prayers Tables

**Files:**

- Create: `supabase/migrations/20260124000002_create_prayers_tables.sql`

**Step 1: Write the migration file**

```sql
/*
  # Prayers Tables

  Creates tables for prayer content and user interactions:
  - prayers: Static prayer content (seeded)
  - user_prayer_favorites: User's favorited prayers
  - user_prayer_history: Track prayers viewed
*/

-- Prayers content
CREATE TABLE IF NOT EXISTS public.prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('step', 'common', 'aa', 'na')),
  step_number int CHECK (step_number IS NULL OR (step_number >= 1 AND step_number <= 12)),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User prayer favorites
CREATE TABLE IF NOT EXISTS public.user_prayer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayer_id uuid NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, prayer_id)
);

-- User prayer history
CREATE TABLE IF NOT EXISTS public.user_prayer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayer_id uuid NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_prayers_updated_at
  BEFORE UPDATE ON public.prayers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prayer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prayer_history ENABLE ROW LEVEL SECURITY;

-- prayers: Anyone can read
CREATE POLICY "Anyone can read prayers"
  ON public.prayers FOR SELECT
  USING (true);

-- user_prayer_favorites: Users can manage their own
CREATE POLICY "Users can read own prayer favorites"
  ON public.user_prayer_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prayer favorites"
  ON public.user_prayer_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own prayer favorites"
  ON public.user_prayer_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- user_prayer_history: Users can manage their own
CREATE POLICY "Users can read own prayer history"
  ON public.user_prayer_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prayer history"
  ON public.user_prayer_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000002_create_prayers_tables.sql
git commit -m "feat(db): add prayers tables and RLS policies"
```

---

### Task 1.3: Create Database Migration for Literature Tables

**Files:**

- Create: `supabase/migrations/20260124000003_create_literature_tables.sql`

**Step 1: Write the migration file**

```sql
/*
  # Literature Tables

  Creates tables for literature tracking:
  - literature_books: Book metadata (seeded)
  - literature_chapters: Chapter list per book (seeded)
  - user_literature_books: User's visible/hidden books
  - user_literature_progress: Chapter completion tracking
*/

-- Literature books
CREATE TABLE IF NOT EXISTS public.literature_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  program text NOT NULL CHECK (program IN ('aa', 'na')),
  chapter_count int NOT NULL,
  external_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Literature chapters
CREATE TABLE IF NOT EXISTS public.literature_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.literature_books(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  title text NOT NULL,
  page_range text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

-- User's visible books
CREATE TABLE IF NOT EXISTS public.user_literature_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.literature_books(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- User chapter progress
CREATE TABLE IF NOT EXISTS public.user_literature_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.literature_chapters(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chapter_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_literature_books_updated_at
  BEFORE UPDATE ON public.literature_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.literature_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_literature_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_literature_progress ENABLE ROW LEVEL SECURITY;

-- literature_books: Anyone can read
CREATE POLICY "Anyone can read literature books"
  ON public.literature_books FOR SELECT
  USING (true);

-- literature_chapters: Anyone can read
CREATE POLICY "Anyone can read literature chapters"
  ON public.literature_chapters FOR SELECT
  USING (true);

-- user_literature_books: Users can manage their own
CREATE POLICY "Users can read own literature books"
  ON public.user_literature_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own literature books"
  ON public.user_literature_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own literature books"
  ON public.user_literature_books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own literature books"
  ON public.user_literature_books FOR DELETE
  USING (auth.uid() = user_id);

-- user_literature_progress: Users can manage their own
CREATE POLICY "Users can read own literature progress"
  ON public.user_literature_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own literature progress"
  ON public.user_literature_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own literature progress"
  ON public.user_literature_progress FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000003_create_literature_tables.sql
git commit -m "feat(db): add literature tables and RLS policies"
```

---

### Task 1.4: Create Database Migration for Meetings Table

**Files:**

- Create: `supabase/migrations/20260124000004_create_meetings_table.sql`

**Step 1: Write the migration file**

```sql
/*
  # Meetings Table

  Creates table for user meeting tracking:
  - user_meetings: User's logged meeting attendance
*/

-- User meetings
CREATE TABLE IF NOT EXISTS public.user_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_name text NOT NULL,
  meeting_type text NOT NULL CHECK (meeting_type IN ('aa', 'na', 'other')),
  location text,
  attended_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_user_meetings_updated_at
  BEFORE UPDATE ON public.user_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries by user and date
CREATE INDEX idx_user_meetings_user_attended
  ON public.user_meetings(user_id, attended_at DESC);

-- RLS Policies
ALTER TABLE public.user_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own meetings"
  ON public.user_meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
  ON public.user_meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON public.user_meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON public.user_meetings FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000004_create_meetings_table.sql
git commit -m "feat(db): add user meetings table and RLS policies"
```

---

### Task 1.5: Create Database Migration for Program Stats Table

**Files:**

- Create: `supabase/migrations/20260124000005_create_program_stats_table.sql`

**Step 1: Write the migration file**

```sql
/*
  # Program Stats Table

  Creates table for cached user statistics:
  - user_program_stats: Cached stats for fast Home screen loading
*/

-- User program stats (cached)
CREATE TABLE IF NOT EXISTS public.user_program_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  reading_current_streak int NOT NULL DEFAULT 0,
  reading_longest_streak int NOT NULL DEFAULT 0,
  reading_total_count int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_user_program_stats_updated_at
  BEFORE UPDATE ON public.user_program_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.user_program_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own program stats"
  ON public.user_program_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own program stats"
  ON public.user_program_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own program stats"
  ON public.user_program_stats FOR UPDATE
  USING (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000005_create_program_stats_table.sql
git commit -m "feat(db): add user program stats table and RLS policies"
```

---

### Task 1.6: Rename Profile Column for Program Visibility

**Files:**

- Create: `supabase/migrations/20260124000006_rename_show_program_content.sql`

**Step 1: Write the migration file**

```sql
/*
  # Rename show_twelve_step_content to show_program_content

  Updates the profile column name to reflect the expanded Program section.
*/

ALTER TABLE public.profiles
  RENAME COLUMN show_twelve_step_content TO show_program_content;

COMMENT ON COLUMN public.profiles.show_program_content IS
  'Whether to show 12-step program content (Program tab). Default true. When false, the Program tab is hidden from navigation.';
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260124000006_rename_show_program_content.sql
git commit -m "feat(db): rename show_twelve_step_content to show_program_content"
```

---

### Task 1.7: Add TypeScript Types for New Tables

**Files:**

- Modify: `types/database.ts`

**Step 1: Add new type definitions after existing types**

Add after the `UserStepProgress` interface (around line 170):

```typescript
// =============================================================================
// Program Section Types
// =============================================================================

export type ProgramType = 'aa' | 'na';
export type PrayerCategory = 'step' | 'common' | 'aa' | 'na';
export type MeetingType = 'aa' | 'na' | 'other';
export type ReadingPreference = 'aa' | 'na' | 'both';

/**
 * Daily reading content (fallback for external APIs).
 */
export interface DailyReading {
  id: string;
  program: ProgramType;
  month: number;
  day: number;
  title: string;
  content: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User's preferred reading program.
 */
export interface UserReadingPreferences {
  id: string;
  user_id: string;
  preferred_program: ReadingPreference;
  created_at: string;
  updated_at: string;
}

/**
 * Record of a user viewing a daily reading.
 */
export interface UserReadingHistory {
  id: string;
  user_id: string;
  reading_date: string;
  program: ProgramType;
  viewed_at: string;
}

/**
 * Prayer content.
 */
export interface Prayer {
  id: string;
  title: string;
  content: string;
  category: PrayerCategory;
  step_number?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * User's favorited prayer.
 */
export interface UserPrayerFavorite {
  id: string;
  user_id: string;
  prayer_id: string;
  created_at: string;
  prayer?: Prayer;
}

/**
 * Record of a user viewing a prayer.
 */
export interface UserPrayerHistory {
  id: string;
  user_id: string;
  prayer_id: string;
  viewed_at: string;
}

/**
 * Literature book metadata.
 */
export interface LiteratureBook {
  id: string;
  title: string;
  program: ProgramType;
  chapter_count: number;
  external_url?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  chapters?: LiteratureChapter[];
}

/**
 * Literature book chapter.
 */
export interface LiteratureChapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  page_range?: string;
  created_at: string;
}

/**
 * User's added/visible book.
 */
export interface UserLiteratureBook {
  id: string;
  user_id: string;
  book_id: string;
  is_visible: boolean;
  added_at: string;
  book?: LiteratureBook;
}

/**
 * User's chapter completion.
 */
export interface UserLiteratureProgress {
  id: string;
  user_id: string;
  chapter_id: string;
  completed_at: string;
}

/**
 * User's logged meeting.
 */
export interface UserMeeting {
  id: string;
  user_id: string;
  meeting_name: string;
  meeting_type: MeetingType;
  location?: string;
  attended_at: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Cached user program statistics.
 */
export interface UserProgramStats {
  id: string;
  user_id: string;
  reading_current_streak: number;
  reading_longest_streak: number;
  reading_total_count: number;
  updated_at: string;
}
```

**Step 2: Update Profile interface**

Change line 90 from:

```typescript
  show_twelve_step_content?: boolean;
```

To:

```typescript
  /**
   * Whether to show 12-step program content (Program tab).
   * Default true. When false, the Program tab is hidden from navigation
   * and related Home screen cards are hidden.
   * Existing users (null/undefined) are treated as true.
   */
  show_program_content?: boolean;
```

**Step 3: Run typecheck to verify**

```bash
pnpm typecheck
```

Expected: PASS (or only unrelated errors)

**Step 4: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add Program section types and rename show_program_content"
```

---

## Phase 2: Navigation Structure

### Task 2.1: Create Program Tab Layout with Top Tabs

**Files:**

- Create: `app/(app)/(tabs)/program/_layout.tsx`

**Step 1: Write the layout file**

```typescript
// =============================================================================
// Imports
// =============================================================================
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Sun, Heart, BookMarked, Users } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import SettingsButton from '@/components/navigation/SettingsButton';

// =============================================================================
// Types
// =============================================================================
interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

// =============================================================================
// Constants
// =============================================================================
const TAB_ITEMS: TabItem[] = [
  { name: 'steps', label: 'Steps', icon: BookOpen },
  { name: 'daily', label: 'Daily', icon: Sun },
  { name: 'prayers', label: 'Prayers', icon: Heart },
  { name: 'literature', label: 'Lit', icon: BookMarked },
  { name: 'meetings', label: 'Meet', icon: Users },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Layout for the Program section with horizontal top tabs.
 */
export default function ProgramLayout(): React.ReactElement {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from pathname
  const activeTab = useMemo(() => {
    const path = pathname.replace('/program/', '').split('/')[0];
    return TAB_ITEMS.find((t) => t.name === path)?.name || 'steps';
  }, [pathname]);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const handleTabPress = (tabName: string) => {
    if (tabName === 'steps') {
      router.push('/program/steps');
    } else {
      router.push(`/program/${tabName}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Program</Text>
          {Platform.OS !== 'web' && <SettingsButton />}
        </View>

        {/* Top Tab Bar */}
        <View style={styles.tabBar}>
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.name;
            const Icon = tab.icon;
            return (
              <Pressable
                key={tab.name}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabPress(tab.name)}
              >
                <Icon
                  size={18}
                  color={isActive ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="steps" />
        <Tabs.Screen name="daily" />
        <Tabs.Screen name="prayers" />
        <Tabs.Screen name="literature" />
        <Tabs.Screen name="meetings" />
      </Tabs>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors, insets: { top: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.card,
      paddingTop: insets.top,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      gap: 4,
    },
    tabActive: {
      backgroundColor: theme.primaryLight,
    },
    tabLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: theme.primary,
      fontWeight: '600',
    },
  });
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/_layout.tsx
git commit -m "feat(nav): add Program section layout with top tabs"
```

---

### Task 2.2: Create Program Index (Redirect to Steps)

**Files:**

- Create: `app/(app)/(tabs)/program/index.tsx`

**Step 1: Write the index file**

```typescript
import { Redirect } from 'expo-router';

/**
 * Redirects /program to /program/steps (default tab).
 */
export default function ProgramIndex() {
  return <Redirect href="/program/steps" />;
}
```

**Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/index.tsx
git commit -m "feat(nav): add Program index redirect to steps"
```

---

### Task 2.3: Move Steps Screens to Program Section

**Files:**

- Move: `app/(app)/(tabs)/steps/` → `app/(app)/(tabs)/program/steps/`
- Modify: `app/(app)/(tabs)/program/steps/_layout.tsx`
- Modify: `app/(app)/(tabs)/program/steps/index.tsx`

**Step 1: Move the steps directory**

```bash
mv app/\(app\)/\(tabs\)/steps app/\(app\)/\(tabs\)/program/steps
```

**Step 2: Update steps/\_layout.tsx**

Remove the header and redirect logic (handled by parent layout now). Update the file to:

```typescript
import { Stack } from 'expo-router';

/**
 * Stack navigator for the Steps tab within Program section.
 */
export default function StepsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
```

**Step 3: Update steps/index.tsx**

Remove the header section since it's now in the parent layout. Keep the list content.

Remove lines 112-122 (the header View) and update container padding.

**Step 4: Update route references in steps/index.tsx**

Change line 107:

```typescript
router.push(`/steps/${step.id}`);
```

To:

```typescript
router.push(`/program/steps/${step.id}`);
```

**Step 5: Update route references in steps/[id].tsx**

Change line 156:

```typescript
router.push(`/steps/${prevStep.id}`);
```

To:

```typescript
router.push(`/program/steps/${prevStep.id}`);
```

Change line 163:

```typescript
router.push(`/steps/${nextStep.id}`);
```

To:

```typescript
router.push(`/program/steps/${nextStep.id}`);
```

**Step 6: Run typecheck**

```bash
pnpm typecheck
```

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor(nav): move steps screens to program section"
```

---

### Task 2.4: Update Bottom Tab Navigation

**Files:**

- Modify: `app/(app)/(tabs)/_layout.tsx`

**Step 1: Update tab route configuration**

Change the 'steps' entry in `tabRoutes` array (lines 52-58) to:

```typescript
  {
    name: 'program',
    title: 'Program',
    sfSymbol: 'heart.fill',
    androidIconKey: 'book',
    icon: Heart,
  },
```

**Step 2: Update imports**

Add `Heart` to the lucide-react-native import (line 7):

```typescript
import { Home, Heart, TrendingUp, CheckSquare, User } from 'lucide-react-native';
```

Remove `BookOpen` from imports.

**Step 3: Update show_program_content references**

Change line 97:

```typescript
const showSteps = profile?.show_twelve_step_content !== false;
```

To:

```typescript
const showProgram = profile?.show_program_content !== false;
```

Update line 102:

```typescript
return showProgram ? tabRoutes : tabRoutes.filter((route) => route.name !== 'program');
```

Update line 161:

```typescript
tabBarItemHidden: route.name === 'program' && !showProgram,
```

**Step 4: Run typecheck and tests**

```bash
pnpm typecheck && pnpm test
```

**Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/_layout.tsx
git commit -m "feat(nav): update bottom tab from Steps to Program"
```

---

### Task 2.5: Update Settings to Use show_program_content

**Files:**

- Modify: `app/(app)/settings.tsx`

**Step 1: Find and replace show_twelve_step_content**

Search for `show_twelve_step_content` and replace with `show_program_content`.

Update the toggle label text to reflect the expanded scope:

- Label: "Show 12 Step Program"
- Description: "Display the Program tab with steps, daily readings, prayers, literature, and meeting tracker"

**Step 2: Run tests**

```bash
pnpm test -- __tests__/app/settings.test.tsx
```

**Step 3: Commit**

```bash
git add app/\(app\)/settings.tsx
git commit -m "feat(settings): update to use show_program_content"
```

---

## Phase 3: Placeholder Screens

### Task 3.1: Create Daily Readings Placeholder Screen

**Files:**

- Create: `app/(app)/(tabs)/program/daily.tsx`

**Step 1: Write placeholder screen**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * Daily Readings screen - displays AA/NA daily meditations.
 */
export default function DailyReadingsScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Daily Readings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
```

**Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/daily.tsx
git commit -m "feat(program): add daily readings placeholder screen"
```

---

### Task 3.2: Create Prayers Placeholder Screen

**Files:**

- Create: `app/(app)/(tabs)/program/prayers.tsx`

**Step 1: Write placeholder screen**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * Prayers screen - displays categorized prayer library.
 */
export default function PrayersScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Prayers</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
```

**Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/prayers.tsx
git commit -m "feat(program): add prayers placeholder screen"
```

---

### Task 3.3: Create Literature Placeholder Screen

**Files:**

- Create: `app/(app)/(tabs)/program/literature.tsx`

**Step 1: Write placeholder screen**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * Literature screen - displays book reading tracker.
 */
export default function LiteratureScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Literature</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
```

**Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/literature.tsx
git commit -m "feat(program): add literature placeholder screen"
```

---

### Task 3.4: Create Meetings Placeholder Screen

**Files:**

- Create: `app/(app)/(tabs)/program/meetings.tsx`

**Step 1: Write placeholder screen**

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * Meetings screen - displays meeting attendance tracker.
 */
export default function MeetingsScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Meetings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
```

**Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/program/meetings.tsx
git commit -m "feat(program): add meetings placeholder screen"
```

---

## Phase 4: Update Tests

### Task 4.1: Update Step Detail Tests for New Routes

**Files:**

- Modify: `__tests__/app/step-detail.test.tsx`

**Step 1: Update route references**

Find all `/steps/` references and change to `/program/steps/`.

**Step 2: Run tests**

```bash
pnpm test -- __tests__/app/step-detail.test.tsx
```

Expected: PASS

**Step 3: Commit**

```bash
git add __tests__/app/step-detail.test.tsx
git commit -m "test: update step detail tests for program routes"
```

---

### Task 4.2: Update Tab Layout Tests

**Files:**

- Modify: `__tests__/app/tabs/index.test.tsx` (if exists)

**Step 1: Update references from 'steps' to 'program'**

**Step 2: Update profile mock from `show_twelve_step_content` to `show_program_content`**

**Step 3: Run tests**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add __tests__/
git commit -m "test: update tests for program section rename"
```

---

## Phase 5: Run Full Quality Suite

### Task 5.1: Run All Quality Checks

**Step 1: Run format, lint, typecheck, build, test**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

Expected: All pass

**Step 2: Fix any issues that arise**

**Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve quality check issues"
```

---

## Phase 6: Update CHANGELOG

### Task 6.1: Update CHANGELOG.md

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add entries under [Unreleased]**

```markdown
### Added

- Add Program section replacing Steps tab with 5 sub-sections: Steps, Daily, Prayers, Literature, Meetings
- Add horizontal top tabs navigation within Program section
- Add database tables for daily readings, prayers, literature, meetings, and program stats
- Add TypeScript types for all new Program section entities

### Changed

- Rename `show_twelve_step_content` to `show_program_content` in profiles
- Move Steps screens from `/steps` to `/program/steps`
- Update Settings toggle label to reflect expanded Program section
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for Program section"
```

---

## Summary

**Total Tasks:** 21

**Phase 1 (Database):** 7 tasks - migrations and types
**Phase 2 (Navigation):** 5 tasks - routing structure
**Phase 3 (Screens):** 4 tasks - placeholder screens
**Phase 4 (Tests):** 2 tasks - test updates
**Phase 5 (Quality):** 1 task - full quality suite
**Phase 6 (Docs):** 1 task - changelog

**After completing this plan:**

- Program section is navigable with all 5 tabs
- Steps functionality works in new location
- Database schema ready for content
- Placeholder screens ready for implementation
- All tests passing

**Next steps (future plans):**

- Implement Daily Readings screen with API integration
- Seed prayers content and implement Prayers screen
- Seed literature content and implement Literature screen
- Implement Meetings screen with CRUD operations
- Add Home screen integration (Daily Reflection card, Program Activity card)
