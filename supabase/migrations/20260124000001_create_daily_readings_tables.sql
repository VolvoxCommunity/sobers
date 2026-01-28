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
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
