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

-- Trigger for updated_at (idempotent)
DROP TRIGGER IF EXISTS update_user_program_stats_updated_at ON public.user_program_stats;
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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
