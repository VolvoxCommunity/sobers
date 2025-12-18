/*
  # Fix Invite Code Update Policy

  Recreate the update policy for invite_codes to ensure it's correctly configured.
  This fixes the RLS error when claiming invite codes.

  The policy allows authenticated users to update invite codes when:
  1. USING: The code is valid (not expired) and hasn't been used yet
  2. WITH CHECK: The user can only set themselves as the claimer

  Also adds a SELECT policy to allow users to see codes they've used.
*/

-- Drop existing update policy to recreate it
DROP POLICY IF EXISTS "Users can update invite codes when using them" ON public.invite_codes;

-- Recreate with explicit conditions
CREATE POLICY "Users can update invite codes when using them"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (
    -- Can only update valid, unused codes
    expires_at > now() AND used_by IS NULL
  )
  WITH CHECK (
    -- Can only set used_by to own user ID
    used_by = auth.uid()
  );

-- Add policy to allow users to see invite codes they've claimed
DROP POLICY IF EXISTS "Users can view invite codes they used" ON public.invite_codes;
CREATE POLICY "Users can view invite codes they used"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (used_by = auth.uid());
