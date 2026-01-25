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
