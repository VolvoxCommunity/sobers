/*
  # Fix Notifications INSERT Policy

  The original "System can create notifications" policy uses WITH CHECK (true)
  which is overly permissive. This allows any authenticated user to create
  notifications for any other user, which is a security vulnerability.

  This migration restricts notification creation to only allow users to
  create notifications for users they have an active relationship with
  (either as sponsor or sponsee).

  Legitimate notification use cases:
  - Sponsor assigns a task → notify sponsee
  - Sponsee completes a task → notify sponsor
  - User logs slip-up → notify sponsors
  - Connection requests and relationship changes → notify other party

  All of these are between users in an active sponsor-sponsee relationship.
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more restrictive policy that only allows creating notifications
-- for users in an active relationship with the authenticated user
CREATE POLICY "Users can create notifications for connected users"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    -- Can create notification for self (edge case, but safe)
    user_id = auth.uid()
    OR
    -- Can create notification for sponsor (if authenticated user is sponsee)
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsee_id = auth.uid()
        AND sponsor_id = notifications.user_id
        AND status = 'active'
    )
    OR
    -- Can create notification for sponsee (if authenticated user is sponsor)
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_id = auth.uid()
        AND sponsee_id = notifications.user_id
        AND status = 'active'
    )
  );
