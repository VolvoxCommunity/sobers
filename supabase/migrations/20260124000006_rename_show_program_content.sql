/*
  # Add show_program_content column to profiles

  Adds the show_program_content column to control Program tab visibility.

  This migration handles two scenarios:
  1. Fresh database: adds show_program_content column directly
  2. Existing database with show_twelve_step_content: renames the column
*/

DO $$
BEGIN
  -- Check if the old column exists (existing database)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_twelve_step_content'
  ) THEN
    -- Rename existing column
    ALTER TABLE public.profiles
      RENAME COLUMN show_twelve_step_content TO show_program_content;
  -- Check if neither column exists (fresh database)
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'show_program_content'
  ) THEN
    -- Add new column
    ALTER TABLE public.profiles
      ADD COLUMN show_program_content BOOLEAN DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.show_program_content IS
  'Whether to show 12-step program content (Program tab). Default true. When false, the Program tab is hidden from navigation.';
