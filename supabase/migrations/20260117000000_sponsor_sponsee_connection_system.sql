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

-- Allow users to update invite codes when claiming them (must not be revoked)
DROP POLICY IF EXISTS "Users can update invite codes when using them" ON public.invite_codes;
CREATE POLICY "Users can update invite codes when using them"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (expires_at > now() AND used_by IS NULL AND revoked_at IS NULL)
  WITH CHECK (used_by = auth.uid() AND revoked_at IS NULL);

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

-- =============================================================================
-- Opt-in Matching System (connection_matches table)
-- =============================================================================

-- Create enum type for match status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status_type') THEN
    CREATE TYPE match_status_type AS ENUM (
      'pending',
      'accepted',
      'rejected',
      'expired'
    );
  END IF;
END$$;

-- Create connection_matches table for opt-in matching
-- System proposes matches based on mutual opposite needs (seeking_sponsor ↔ open_to_sponsoring)
-- Both parties must accept to create a relationship
CREATE TABLE IF NOT EXISTS public.connection_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- The user seeking a sponsor
  seeker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- The potential sponsor/provider
  provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Bilateral acceptance (null = pending, true = accepted, false = rejected)
  seeker_accepted boolean DEFAULT NULL,
  provider_accepted boolean DEFAULT NULL,
  -- Overall match status
  status match_status_type DEFAULT 'pending' NOT NULL,
  -- Relationship created when both accept
  relationship_id uuid REFERENCES public.sponsor_sponsee_relationships(id) ON DELETE SET NULL,
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  resolved_at timestamptz DEFAULT NULL,
  -- Prevent duplicate active matches between same users
  CONSTRAINT unique_active_match UNIQUE(seeker_id, provider_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.connection_matches IS
  'Stores system-proposed matches between users seeking sponsors and those open to sponsoring. Both parties must accept.';

COMMENT ON COLUMN public.connection_matches.seeker_id IS
  'User with intent seeking_sponsor or open_to_both who initiated the match request';

COMMENT ON COLUMN public.connection_matches.provider_id IS
  'User with intent open_to_sponsoring or open_to_both proposed as potential sponsor';

COMMENT ON COLUMN public.connection_matches.seeker_accepted IS
  'Seeker acceptance: null=pending, true=accepted, false=rejected';

COMMENT ON COLUMN public.connection_matches.provider_accepted IS
  'Provider acceptance: null=pending, true=accepted, false=rejected';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_connection_matches_seeker
  ON public.connection_matches(seeker_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_connection_matches_provider
  ON public.connection_matches(provider_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_connection_matches_status
  ON public.connection_matches(status)
  WHERE status = 'pending';

-- =============================================================================
-- Connection Matches RLS Policies
-- =============================================================================

ALTER TABLE public.connection_matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches where they are seeker or provider
DROP POLICY IF EXISTS "Users can view their own matches" ON public.connection_matches;
CREATE POLICY "Users can view their own matches"
  ON public.connection_matches FOR SELECT TO authenticated
  USING (seeker_id = auth.uid() OR provider_id = auth.uid());

-- Users can update matches where they are seeker or provider (for accepting/rejecting)
DROP POLICY IF EXISTS "Users can update their own matches" ON public.connection_matches;
CREATE POLICY "Users can update their own matches"
  ON public.connection_matches FOR UPDATE TO authenticated
  USING (seeker_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (seeker_id = auth.uid() OR provider_id = auth.uid());

-- Only authenticated users with seeking intent can create match requests
-- (In practice, this would be done via a server function, but policy allows it)
DROP POLICY IF EXISTS "Users can create match requests" ON public.connection_matches;
CREATE POLICY "Users can create match requests"
  ON public.connection_matches FOR INSERT TO authenticated
  WITH CHECK (seeker_id = auth.uid());

-- =============================================================================
-- Function to find potential matches
-- =============================================================================

-- Function to find users with complementary intents
CREATE OR REPLACE FUNCTION public.find_potential_matches(user_id uuid, max_results integer DEFAULT 5)
RETURNS TABLE (
  matched_user_id uuid,
  matched_intent connection_intent_type,
  display_name text
) AS $$
DECLARE
  user_intent connection_intent_type;
BEGIN
  -- Get the requesting user's intent
  SELECT connection_intent INTO user_intent
  FROM public.profiles
  WHERE id = user_id;

  -- Return empty if user has no intent set or is not looking
  IF user_intent IS NULL OR user_intent = 'not_looking' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id as matched_user_id,
    p.connection_intent as matched_intent,
    p.display_name
  FROM public.profiles p
  WHERE
    p.id != user_id
    -- Match complementary intents
    AND (
      -- User is seeking sponsor -> match with those open to sponsoring
      (user_intent IN ('seeking_sponsor', 'open_to_both')
        AND p.connection_intent IN ('open_to_sponsoring', 'open_to_both'))
      OR
      -- User is open to sponsoring -> match with those seeking sponsor
      (user_intent IN ('open_to_sponsoring', 'open_to_both')
        AND p.connection_intent IN ('seeking_sponsor', 'open_to_both'))
    )
    -- Exclude users with ACTIVE relationships only (allow re-matching after disconnect)
    AND NOT EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships r
      WHERE r.status = 'active'
        AND ((r.sponsor_id = user_id AND r.sponsee_id = p.id)
          OR (r.sponsor_id = p.id AND r.sponsee_id = user_id))
    )
    -- Exclude users with pending matches with this user
    AND NOT EXISTS (
      SELECT 1 FROM public.connection_matches m
      WHERE m.status = 'pending'
        AND ((m.seeker_id = user_id AND m.provider_id = p.id)
          OR (m.seeker_id = p.id AND m.provider_id = user_id))
    )
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.find_potential_matches(uuid, integer) TO authenticated;

-- =============================================================================
-- Function to handle match acceptance
-- =============================================================================

-- Function to accept a match and create relationship if both accepted
CREATE OR REPLACE FUNCTION public.accept_match(match_id uuid)
RETURNS public.connection_matches AS $$
DECLARE
  match_record public.connection_matches;
  new_relationship_id uuid;
  existing_relationship_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- Get and lock the match record
  SELECT * INTO match_record
  FROM public.connection_matches
  WHERE id = match_id
  FOR UPDATE;

  -- Verify user is part of this match
  IF match_record.seeker_id != current_user_id AND match_record.provider_id != current_user_id THEN
    RAISE EXCEPTION 'User is not part of this match';
  END IF;

  -- Verify match is still pending
  IF match_record.status != 'pending' THEN
    RAISE EXCEPTION 'Match is no longer pending';
  END IF;

  -- Verify match hasn't expired
  IF match_record.expires_at < now() THEN
    UPDATE public.connection_matches SET status = 'expired', resolved_at = now()
    WHERE id = match_id;
    RAISE EXCEPTION 'Match has expired';
  END IF;

  -- Update the appropriate acceptance field
  IF match_record.seeker_id = current_user_id THEN
    UPDATE public.connection_matches SET seeker_accepted = true WHERE id = match_id;
    match_record.seeker_accepted := true;
  ELSE
    UPDATE public.connection_matches SET provider_accepted = true WHERE id = match_id;
    match_record.provider_accepted := true;
  END IF;

  -- Check if both have now accepted
  IF match_record.seeker_accepted = true AND match_record.provider_accepted = true THEN
    -- Check for existing relationship (may be inactive from previous disconnect)
    SELECT id INTO existing_relationship_id
    FROM public.sponsor_sponsee_relationships
    WHERE sponsor_id = match_record.provider_id
      AND sponsee_id = match_record.seeker_id;

    IF existing_relationship_id IS NOT NULL THEN
      -- Reactivate existing relationship
      UPDATE public.sponsor_sponsee_relationships
      SET status = 'active', connected_at = now(), disconnected_at = NULL
      WHERE id = existing_relationship_id;
      new_relationship_id := existing_relationship_id;
    ELSE
      -- Create new sponsor-sponsee relationship
      INSERT INTO public.sponsor_sponsee_relationships (
        sponsor_id,
        sponsee_id,
        status,
        connected_at
      ) VALUES (
        match_record.provider_id,  -- Provider becomes sponsor
        match_record.seeker_id,    -- Seeker becomes sponsee
        'active',
        now()
      ) RETURNING id INTO new_relationship_id;
    END IF;

    -- Update match as accepted with relationship reference
    UPDATE public.connection_matches
    SET
      status = 'accepted',
      relationship_id = new_relationship_id,
      resolved_at = now()
    WHERE id = match_id;

    match_record.status := 'accepted';
    match_record.relationship_id := new_relationship_id;
    match_record.resolved_at := now();
  END IF;

  RETURN match_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_match(uuid) TO authenticated;

-- =============================================================================
-- Function to reject a match
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reject_match(match_id uuid)
RETURNS public.connection_matches AS $$
DECLARE
  match_record public.connection_matches;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  -- Get and lock the match record
  SELECT * INTO match_record
  FROM public.connection_matches
  WHERE id = match_id
  FOR UPDATE;

  -- Verify user is part of this match
  IF match_record.seeker_id != current_user_id AND match_record.provider_id != current_user_id THEN
    RAISE EXCEPTION 'User is not part of this match';
  END IF;

  -- Verify match is still pending
  IF match_record.status != 'pending' THEN
    RAISE EXCEPTION 'Match is no longer pending';
  END IF;

  -- Update the match as rejected
  IF match_record.seeker_id = current_user_id THEN
    UPDATE public.connection_matches
    SET seeker_accepted = false, status = 'rejected', resolved_at = now()
    WHERE id = match_id;
    match_record.seeker_accepted := false;
  ELSE
    UPDATE public.connection_matches
    SET provider_accepted = false, status = 'rejected', resolved_at = now()
    WHERE id = match_id;
    match_record.provider_accepted := false;
  END IF;

  match_record.status := 'rejected';
  match_record.resolved_at := now();

  RETURN match_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reject_match(uuid) TO authenticated;
