-- Migration: Add type column to whats_new_features
-- Description: Adds a type field to categorize features as 'feature' or 'fix'

-- Add type column with default 'feature'
ALTER TABLE public.whats_new_features
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'feature'
  CHECK (type IN ('feature', 'fix'));

-- Add comment for documentation
COMMENT ON COLUMN public.whats_new_features.type IS 'Type of feature: feature (new functionality) or fix (bug fix/improvement)';
