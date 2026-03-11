-- Migration: Seed What's New data for v1.3.0
-- Description: Inserts release and feature entries for version 1.3.0

-- Insert the release
INSERT INTO public.whats_new_releases (id, version, title)
VALUES (
  'b1c3d5e7-1300-4000-a000-000000000130',
  '1.3.0',
  'Settings, Steps Toggle & More'
)
ON CONFLICT (version) DO NOTHING;

-- Insert features
INSERT INTO public.whats_new_features (release_id, title, description, type, display_order)
VALUES
  -- New features
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    '12-Step Content Toggle',
    'Show or hide the Steps tab via onboarding and settings preferences.',
    'feature',
    1
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Redesigned What''s New',
    'Full release history view with collapsible sections so you can catch up on everything.',
    'feature',
    2
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Quick Settings Access',
    'Settings cogwheel added to Home, Journey, Tasks, and Steps screens.',
    'feature',
    3
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Password Visibility Toggle',
    'See what you''re typing on Login and Signup screens.',
    'feature',
    4
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Streamlined Onboarding',
    'Simplified onboarding flow from 3 cards to 2 for a faster setup.',
    'feature',
    5
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Unified Settings',
    'Account and Journey sections merged into a single "Your Journey" section in Settings.',
    'feature',
    6
  ),
  -- Bug fixes
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Steps Tab Visibility',
    'Steps tab now properly hides when 12-step content toggle is disabled.',
    'fix',
    7
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Task Creation Dropdown',
    'Dropdown options in task creation are now clickable.',
    'fix',
    8
  ),
  (
    'b1c3d5e7-1300-4000-a000-000000000130',
    'Savings Edit Keyboard',
    'Keyboard no longer pushes content up in the savings edit sheet.',
    'fix',
    9
  );
