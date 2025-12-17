/*
  # Rename Relapses to Slip Ups
*/
ALTER TABLE IF EXISTS public.relapses RENAME TO slip_ups;
ALTER TABLE IF EXISTS public.slip_ups RENAME COLUMN relapse_date TO slip_up_date;

DROP POLICY IF EXISTS "Users can view own relapses" ON public.slip_ups;
DROP POLICY IF EXISTS "Users can insert own relapses" ON public.slip_ups;
DROP POLICY IF EXISTS "Users can update own relapses" ON public.slip_ups;
DROP POLICY IF EXISTS "Users can delete own relapses" ON public.slip_ups;
DROP POLICY IF EXISTS "Sponsors can view their sponsees' relapses" ON public.slip_ups;

DROP POLICY IF EXISTS "Users can view own slip ups" ON public.slip_ups;
CREATE POLICY "Users can view own slip ups"
  ON public.slip_ups FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own slip ups" ON public.slip_ups;
CREATE POLICY "Users can insert own slip ups"
  ON public.slip_ups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own slip ups" ON public.slip_ups;
CREATE POLICY "Users can update own slip ups"
  ON public.slip_ups FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own slip ups" ON public.slip_ups;
CREATE POLICY "Users can delete own slip ups"
  ON public.slip_ups FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can view their sponsees' slip ups" ON public.slip_ups;
CREATE POLICY "Sponsors can view their sponsees' slip ups"
  ON public.slip_ups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsor_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsee_id = slip_ups.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );
