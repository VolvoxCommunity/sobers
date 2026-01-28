/*
  # Add show_program_content column to profiles

  Adds the show_program_content column to control Program tab visibility.

  This migration handles four scenarios:
  1. Both columns exist: backfill new from old, then drop old column
  2. Only old column exists: rename old to new column
  3. Neither column exists: add new column with default
  4. Only new column exists: no action needed (already migrated)
*/

DO $$
BEGIN
  -- Case 1: Both columns exist (partial migration or manual addition)
  -- Backfill new column from old and drop old column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_twelve_step_content'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_program_content'
  ) THEN
    -- Backfill any NULL values in new column from old column
    UPDATE public.profiles
      SET show_program_content = show_twelve_step_content
      WHERE show_program_content IS NULL AND show_twelve_step_content IS NOT NULL;
    -- Drop the old column
    ALTER TABLE public.profiles
      DROP COLUMN show_twelve_step_content;
  -- Case 2: Only old column exists (existing database)
  -- Rename old column to new
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_twelve_step_content'
  ) THEN
    ALTER TABLE public.profiles
      RENAME COLUMN show_twelve_step_content TO show_program_content;
  -- Case 3: Neither column exists (fresh database)
  -- Add new column
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_program_content'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN show_program_content BOOLEAN DEFAULT true;
  END IF;
  -- Case 4: Only new column exists - no action needed (migration already complete)
END $$;

COMMENT ON COLUMN public.profiles.show_program_content IS
  'Whether to show 12-step program content (Program tab). Default true. When false, the Program tab is hidden from navigation.';
