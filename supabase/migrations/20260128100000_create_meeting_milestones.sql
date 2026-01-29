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
