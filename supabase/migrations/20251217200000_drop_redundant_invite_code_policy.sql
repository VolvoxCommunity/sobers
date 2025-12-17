/*
  # Drop Redundant Invite Code Update Policy

  The "Enable update for claiming invite codes" policy uses USING (true) which
  is overly permissive and a security anti-pattern. This policy is also redundant
  because the "Users can update invite codes when using them" policy already
  handles the legitimate use case of claiming invite codes with proper row filtering:

  - USING (expires_at > now() AND used_by IS NULL) - Only valid, unused codes
  - WITH CHECK (used_by = auth.uid()) - Can only claim for themselves

  The redundant policy with USING (true) allows update attempts on ANY invite code
  row, which while the WITH CHECK prevents actual data corruption, it's still
  unnecessarily permissive and confusing.
*/

DROP POLICY IF EXISTS "Enable update for claiming invite codes" ON public.invite_codes;
