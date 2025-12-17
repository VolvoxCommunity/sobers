/*
  # Initial Schema

  Creates the foundational database schema for Sobers.
*/

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  sobriety_date date,
  bio text,
  timezone text,
  role text CHECK (role IN ('sponsor', 'sponsee', 'both')) DEFAULT 'both',
  notification_preferences jsonb DEFAULT '{"tasks": true, "messages": true, "milestones": true, "daily": true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sponsor-sponsee relationships table
CREATE TABLE IF NOT EXISTS public.sponsor_sponsee_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'active',
  connected_at timestamptz DEFAULT now(),
  disconnected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sponsor_id, sponsee_id)
);

-- Invite codes table
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 12 Steps content table
CREATE TABLE IF NOT EXISTS public.steps_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number integer UNIQUE NOT NULL CHECK (step_number >= 1 AND step_number <= 12),
  title text NOT NULL,
  description text NOT NULL,
  detailed_content text NOT NULL,
  reflection_prompts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number >= 1 AND step_number <= 12),
  title text NOT NULL,
  description text NOT NULL,
  due_date date,
  status text NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')) DEFAULT 'assigned',
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Relapses table
CREATE TABLE IF NOT EXISTS public.relapses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relapse_date date NOT NULL,
  recovery_restart_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned', 'milestone', 'message', 'connection_request', 'task_completed')),
  title text NOT NULL,
  content text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relationships_sponsor ON public.sponsor_sponsee_relationships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_relationships_sponsee ON public.sponsor_sponsee_relationships(sponsee_id);
CREATE INDEX IF NOT EXISTS idx_relationships_status ON public.sponsor_sponsee_relationships(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sponsee ON public.tasks(sponsee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sponsor ON public.tasks(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_steps_content_updated_at ON public.steps_content;
CREATE TRIGGER update_steps_content_updated_at
  BEFORE UPDATE ON public.steps_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_sponsee_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relapses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

-- RLS Policies: sponsor_sponsee_relationships
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can view their own relationships"
  ON public.sponsor_sponsee_relationships FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can create relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Sponsors can create relationships"
  ON public.sponsor_sponsee_relationships FOR INSERT TO authenticated
  WITH CHECK (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can update their relationships"
  ON public.sponsor_sponsee_relationships FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid() OR sponsee_id = auth.uid());

-- RLS Policies: invite_codes
DROP POLICY IF EXISTS "Anyone can view valid invite codes" ON public.invite_codes;
CREATE POLICY "Anyone can view valid invite codes"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (expires_at > now() AND used_by IS NULL);

DROP POLICY IF EXISTS "Sponsors can view their own invite codes" ON public.invite_codes;
CREATE POLICY "Sponsors can view their own invite codes"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can create invite codes" ON public.invite_codes;
CREATE POLICY "Sponsors can create invite codes"
  ON public.invite_codes FOR INSERT TO authenticated
  WITH CHECK (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Users can update invite codes when using them" ON public.invite_codes;
CREATE POLICY "Users can update invite codes when using them"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (expires_at > now() AND used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- Note: Removed redundant "Enable update for claiming invite codes" policy
-- that used USING (true). The policy above properly handles claiming codes.

-- RLS Policies: steps_content
DROP POLICY IF EXISTS "Anyone can view steps content" ON public.steps_content;
CREATE POLICY "Anyone can view steps content"
  ON public.steps_content FOR SELECT TO authenticated
  USING (true);

-- RLS Policies: tasks
DROP POLICY IF EXISTS "Sponsees can view their own tasks" ON public.tasks;
CREATE POLICY "Sponsees can view their own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (sponsee_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can view tasks they assigned" ON public.tasks;
CREATE POLICY "Sponsors can view tasks they assigned"
  ON public.tasks FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can create tasks for their sponsees" ON public.tasks;
CREATE POLICY "Sponsors can create tasks for their sponsees"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    sponsor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_id = auth.uid()
        AND sponsee_id = tasks.sponsee_id
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Sponsors can update tasks they created" ON public.tasks;
CREATE POLICY "Sponsors can update tasks they created"
  ON public.tasks FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Sponsees can update their assigned tasks" ON public.tasks;
CREATE POLICY "Sponsees can update their assigned tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (sponsee_id = auth.uid())
  WITH CHECK (sponsee_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can delete tasks they created" ON public.tasks;
CREATE POLICY "Sponsors can delete tasks they created"
  ON public.tasks FOR DELETE TO authenticated
  USING (sponsor_id = auth.uid());

-- RLS Policies: relapses
DROP POLICY IF EXISTS "Users can view own relapses" ON public.relapses;
CREATE POLICY "Users can view own relapses"
  ON public.relapses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own relapses" ON public.relapses;
CREATE POLICY "Users can insert own relapses"
  ON public.relapses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own relapses" ON public.relapses;
CREATE POLICY "Users can update own relapses"
  ON public.relapses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own relapses" ON public.relapses;
CREATE POLICY "Users can delete own relapses"
  ON public.relapses FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can view their sponsees' relapses" ON public.relapses;
CREATE POLICY "Sponsors can view their sponsees' relapses"
  ON public.relapses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsor_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsee_id = relapses.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );

-- RLS Policies: messages
DROP POLICY IF EXISTS "Users can view messages they sent" ON public.messages;
CREATE POLICY "Users can view messages they sent"
  ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages they received" ON public.messages;
CREATE POLICY "Users can view messages they received"
  ON public.messages FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages to connected users" ON public.messages;
CREATE POLICY "Users can send messages to connected users"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE (sponsor_id = auth.uid() AND sponsee_id = recipient_id AND status = 'active')
         OR (sponsee_id = auth.uid() AND sponsor_id = recipient_id AND status = 'active')
    )
  );

DROP POLICY IF EXISTS "Recipients can update message read status" ON public.messages;
CREATE POLICY "Recipients can update message read status"
  ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- RLS Policies: notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
