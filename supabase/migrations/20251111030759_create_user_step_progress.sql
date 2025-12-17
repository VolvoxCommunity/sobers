/*
  # Create User Step Progress Table
*/
CREATE TABLE IF NOT EXISTS public.user_step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number >= 1 AND step_number <= 12),
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_user_step_progress_user_id ON public.user_step_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_step_progress_step_number ON public.user_step_progress(step_number);

DROP TRIGGER IF EXISTS update_user_step_progress_updated_at ON public.user_step_progress;
CREATE TRIGGER update_user_step_progress_updated_at
  BEFORE UPDATE ON public.user_step_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_step_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own step progress" ON public.user_step_progress;
CREATE POLICY "Users can view own step progress"
  ON public.user_step_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sponsors can view sponsees' step progress" ON public.user_step_progress;
CREATE POLICY "Sponsors can view sponsees' step progress"
  ON public.user_step_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsor_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsee_id = user_step_progress.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert own step progress" ON public.user_step_progress;
CREATE POLICY "Users can insert own step progress"
  ON public.user_step_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own step progress" ON public.user_step_progress;
CREATE POLICY "Users can update own step progress"
  ON public.user_step_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own step progress" ON public.user_step_progress;
CREATE POLICY "Users can delete own step progress"
  ON public.user_step_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
