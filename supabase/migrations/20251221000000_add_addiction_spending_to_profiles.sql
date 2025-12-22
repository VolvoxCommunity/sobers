-- Add addiction spending tracking to profiles
-- Both fields are nullable (feature is optional during onboarding)
-- Amount must be non-negative, frequency must be a valid enum value

ALTER TABLE public.profiles
ADD COLUMN addiction_spending_amount DECIMAL(10,2) NULL
  CONSTRAINT addiction_spending_amount_non_negative CHECK (addiction_spending_amount >= 0);

ALTER TABLE public.profiles
ADD COLUMN addiction_spending_frequency TEXT NULL
  CONSTRAINT addiction_spending_frequency_valid CHECK (
    addiction_spending_frequency IN ('daily', 'weekly', 'monthly', 'yearly')
  );

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.addiction_spending_amount IS 'Historical spending amount on addiction (USD). Nullable for optional tracking.';
COMMENT ON COLUMN public.profiles.addiction_spending_frequency IS 'Frequency of spending: daily, weekly, monthly, or yearly.';
