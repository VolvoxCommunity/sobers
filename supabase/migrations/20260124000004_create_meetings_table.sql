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
