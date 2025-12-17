/*
  # Add Sponsee Insert Policy
*/
DROP POLICY IF EXISTS "Sponsees can create relationships for themselves" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Sponsees can create relationships for themselves"
  ON public.sponsor_sponsee_relationships FOR INSERT TO authenticated
  WITH CHECK (sponsee_id = auth.uid());
