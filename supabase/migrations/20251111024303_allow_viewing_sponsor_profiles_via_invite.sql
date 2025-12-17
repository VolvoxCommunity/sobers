/*
  # Allow Viewing Sponsor Profiles via Invite
*/
DROP POLICY IF EXISTS "Users can view profiles with valid invite codes" ON public.profiles;
CREATE POLICY "Users can view profiles with valid invite codes"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invite_codes
      WHERE invite_codes.sponsor_id = profiles.id
        AND invite_codes.expires_at > NOW()
        AND invite_codes.used_by IS NULL
    )
  );
