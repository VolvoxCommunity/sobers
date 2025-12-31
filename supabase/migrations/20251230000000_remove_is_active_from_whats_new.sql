-- Migration: Remove is_active column from whats_new_releases
-- Description: Simplify schema - all releases are now visible, latest by version triggers popup

-- Drop the partial index on is_active
DROP INDEX IF EXISTS idx_whats_new_releases_active;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can read active releases" ON public.whats_new_releases;
DROP POLICY IF EXISTS "Anyone can read features of active releases" ON public.whats_new_features;

-- Create new permissive RLS policies
CREATE POLICY "Anyone can read releases"
  ON public.whats_new_releases FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read features"
  ON public.whats_new_features FOR SELECT
  USING (true);

-- Remove is_active column (do this last to avoid policy errors)
ALTER TABLE public.whats_new_releases DROP COLUMN IF EXISTS is_active;
