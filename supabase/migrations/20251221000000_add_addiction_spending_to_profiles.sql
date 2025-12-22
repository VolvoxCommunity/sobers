-- Add spending tracking to profiles for calculating money saved
-- Both fields are nullable (feature is optional during onboarding)
-- Amount must be non-negative, frequency must be a valid enum value

ALTER TABLE public.profiles
ADD COLUMN spend_amount DECIMAL(10,2) NULL
  CONSTRAINT spend_amount_non_negative CHECK (spend_amount >= 0);

ALTER TABLE public.profiles
ADD COLUMN spend_frequency TEXT NULL
  CONSTRAINT spend_frequency_valid CHECK (
    spend_frequency IN ('daily', 'weekly', 'monthly', 'yearly')
  );

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.spend_amount IS 'Historical spending amount on addiction (USD). Nullable for optional tracking.';
COMMENT ON COLUMN public.profiles.spend_frequency IS 'Frequency of spending: daily, weekly, monthly, or yearly.';
