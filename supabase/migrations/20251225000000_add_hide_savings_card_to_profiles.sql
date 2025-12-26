-- Add hide_savings_card column to profiles for dashboard customization
-- Default to false (card visible by default)

ALTER TABLE public.profiles
ADD COLUMN hide_savings_card BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hide_savings_card IS 'Whether to hide the Money Saved card from dashboard. User preference.';
