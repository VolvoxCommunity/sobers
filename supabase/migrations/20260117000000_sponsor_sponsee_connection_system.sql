/*
  # Sponsor/Sponsee Connection System

  Implements the connection system with intent & ownership as per issue #300.

  ## Changes

  ### Profile Enhancements
  - `connection_intent`: User's stated intent for connections
  - `external_handles`: JSONB storage for external platform handles (Discord, etc.)

  ### Relationship Enhancements
  - `sponsor_reveal_consent`: Sponsor's consent to reveal external handles
  - `sponsee_reveal_consent`: Sponsee's consent to reveal external handles

  ### Invite Code Enhancements
  - `revoked_at`: Timestamp when code was manually revoked
  - `intent`: The intent the sponsor had when creating the code
*/

-- Create enum type for connection intent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_intent_type') THEN
    CREATE TYPE connection_intent_type AS ENUM (
      'not_looking',
      'seeking_sponsor',
      'open_to_sponsoring',
      'open_to_both'
    );
  END IF;
END$$;

-- Add connection_intent to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS connection_intent connection_intent_type DEFAULT NULL;

-- Add external_handles JSONB to profiles
-- Structure: { "discord": "@handle", "telegram": "@handle", "phone": "+1...", ... }
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS external_handles jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.connection_intent IS
  'User intent for sponsor/sponsee connections: not_looking, seeking_sponsor, open_to_sponsoring, open_to_both';

COMMENT ON COLUMN public.profiles.external_handles IS
  'External platform handles stored privately. Only revealed with mutual consent per-connection.';

-- Add symmetric reveal consent fields to relationships
ALTER TABLE public.sponsor_sponsee_relationships
ADD COLUMN IF NOT EXISTS sponsor_reveal_consent boolean DEFAULT false;

ALTER TABLE public.sponsor_sponsee_relationships
ADD COLUMN IF NOT EXISTS sponsee_reveal_consent boolean DEFAULT false;

COMMENT ON COLUMN public.sponsor_sponsee_relationships.sponsor_reveal_consent IS
  'Whether sponsor has opted in to reveal their external handles to this sponsee';

COMMENT ON COLUMN public.sponsor_sponsee_relationships.sponsee_reveal_consent IS
  'Whether sponsee has opted in to reveal their external handles to this sponsor';

-- Add revoked_at and intent to invite_codes for persistent invite management
ALTER TABLE public.invite_codes
ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL;

ALTER TABLE public.invite_codes
ADD COLUMN IF NOT EXISTS intent connection_intent_type DEFAULT NULL;

COMMENT ON COLUMN public.invite_codes.revoked_at IS
  'Timestamp when the invite code was manually revoked by the sponsor';

COMMENT ON COLUMN public.invite_codes.intent IS
  'The connection intent the sponsor had when creating this invite code';

-- Create index for finding users by connection intent (for future matching)
CREATE INDEX IF NOT EXISTS idx_profiles_connection_intent
  ON public.profiles(connection_intent)
  WHERE connection_intent IS NOT NULL;

-- Update invite_codes policies to handle revocation
DROP POLICY IF EXISTS "Anyone can view valid invite codes" ON public.invite_codes;
CREATE POLICY "Anyone can view valid invite codes"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (expires_at > now() AND used_by IS NULL AND revoked_at IS NULL);

-- Allow sponsors to update their own invite codes (for revocation)
DROP POLICY IF EXISTS "Sponsors can update own invite codes" ON public.invite_codes;
CREATE POLICY "Sponsors can update own invite codes"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid());

-- Allow sponsors to delete their own invite codes
DROP POLICY IF EXISTS "Sponsors can delete own invite codes" ON public.invite_codes;
CREATE POLICY "Sponsors can delete own invite codes"
  ON public.invite_codes FOR DELETE TO authenticated
  USING (sponsor_id = auth.uid());

-- Allow sponsors to view their own invite codes (including used/expired)
DROP POLICY IF EXISTS "Sponsors can view their own invite codes" ON public.invite_codes;
CREATE POLICY "Sponsors can view their own invite codes"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid());

-- Allow users to update invite codes when claiming them
DROP POLICY IF EXISTS "Users can update invite codes when using them" ON public.invite_codes;
CREATE POLICY "Users can update invite codes when using them"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (expires_at > now() AND used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- =============================================================================
-- Profile RLS Policies for Connection Flow
-- =============================================================================

-- Allow users to view sponsor profiles when they have a valid invite code
DROP POLICY IF EXISTS "Users can view sponsor profile via invite code" ON public.profiles;
CREATE POLICY "Users can view sponsor profile via invite code"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invite_codes
      WHERE sponsor_id = profiles.id
        AND expires_at > now()
        AND used_by IS NULL
        AND revoked_at IS NULL
    )
  );

-- Allow sponsees to view their sponsor's profile
DROP POLICY IF EXISTS "Users can view their sponsor's profile" ON public.profiles;
CREATE POLICY "Users can view their sponsor's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsee_id = auth.uid()
        AND sponsor_id = profiles.id
        AND status = 'active'
    )
  );

-- Allow sponsors to view their sponsees' profiles
DROP POLICY IF EXISTS "Users can view their sponsees' profiles" ON public.profiles;
CREATE POLICY "Users can view their sponsees' profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_id = auth.uid()
        AND sponsee_id = profiles.id
        AND status = 'active'
    )
  );

-- =============================================================================
-- Sponsor-Sponsee Relationships RLS Policies
-- =============================================================================

-- Allow users to view their own relationships (as sponsor or sponsee)
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can view their own relationships"
  ON public.sponsor_sponsee_relationships FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid());

-- Allow sponsees to create relationships when using an invite code
DROP POLICY IF EXISTS "Sponsees can create relationships via invite code" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Sponsees can create relationships via invite code"
  ON public.sponsor_sponsee_relationships FOR INSERT TO authenticated
  WITH CHECK (sponsee_id = auth.uid());

-- Allow users to update their relationships (for status changes, reveal consent)
DROP POLICY IF EXISTS "Users can update their relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can update their relationships"
  ON public.sponsor_sponsee_relationships FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid() OR sponsee_id = auth.uid());
