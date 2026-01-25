/*
  # Rename show_twelve_step_content to show_program_content

  Updates the profile column name to reflect the expanded Program section.
*/

ALTER TABLE public.profiles
  RENAME COLUMN show_twelve_step_content TO show_program_content;

COMMENT ON COLUMN public.profiles.show_program_content IS
  'Whether to show 12-step program content (Program tab). Default true. When false, the Program tab is hidden from navigation.';
