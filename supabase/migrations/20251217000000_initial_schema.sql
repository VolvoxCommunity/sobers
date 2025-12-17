/*
  # Sobers - Initial Schema

  This consolidated migration creates the complete database schema including:
  - User profiles with display_name, timezone, and preferences
  - Sponsor-sponsee relationships
  - Invite codes for connecting users
  - 12-step content and progress tracking
  - Tasks and task templates
  - Slip-ups tracking
  - Messages and notifications

  All RLS policies are included for secure data access.
*/

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to allow users to delete their own account
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
COMMENT ON FUNCTION public.delete_user_account() IS 'Allows authenticated users to delete their own account.';

-- =============================================================================
-- Tables
-- =============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  sobriety_date date,
  bio text,
  timezone text,
  notification_preferences jsonb DEFAULT '{"tasks": true, "messages": true, "milestones": true, "daily": true}'::jsonb,
  terms_accepted_at timestamptz,
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

-- User step progress table
CREATE TABLE IF NOT EXISTS public.user_step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number >= 1 AND step_number <= 12),
  completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_number)
);

-- Task templates table
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number integer NOT NULL CHECK (step_number >= 1 AND step_number <= 12),
  title text NOT NULL,
  description text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_number integer CHECK (step_number IS NULL OR (step_number >= 1 AND step_number <= 12)),
  title text NOT NULL,
  description text NOT NULL,
  due_date date,
  status text NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')) DEFAULT 'assigned',
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Slip-ups table
CREATE TABLE IF NOT EXISTS public.slip_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slip_up_date date NOT NULL,
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

-- =============================================================================
-- Indexes
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_user_step_progress_user_id ON public.user_step_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_step_progress_step_number ON public.user_step_progress(step_number);
CREATE INDEX IF NOT EXISTS idx_task_templates_step ON public.task_templates(step_number);

-- =============================================================================
-- Triggers
-- =============================================================================

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

DROP TRIGGER IF EXISTS update_task_templates_updated_at ON public.task_templates;
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_step_progress_updated_at ON public.user_step_progress;
CREATE TRIGGER update_user_step_progress_updated_at
  BEFORE UPDATE ON public.user_step_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_sponsee_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slip_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies: profiles
-- =============================================================================

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

-- =============================================================================
-- RLS Policies: sponsor_sponsee_relationships
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their own relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can view their own relationships"
  ON public.sponsor_sponsee_relationships FOR SELECT TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can create relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Sponsors can create relationships"
  ON public.sponsor_sponsee_relationships FOR INSERT TO authenticated
  WITH CHECK (sponsor_id = auth.uid());

DROP POLICY IF EXISTS "Sponsees can create relationships for themselves" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Sponsees can create relationships for themselves"
  ON public.sponsor_sponsee_relationships FOR INSERT TO authenticated
  WITH CHECK (sponsee_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their relationships" ON public.sponsor_sponsee_relationships;
CREATE POLICY "Users can update their relationships"
  ON public.sponsor_sponsee_relationships FOR UPDATE TO authenticated
  USING (sponsor_id = auth.uid() OR sponsee_id = auth.uid())
  WITH CHECK (sponsor_id = auth.uid() OR sponsee_id = auth.uid());

-- =============================================================================
-- RLS Policies: invite_codes
-- =============================================================================

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

DROP POLICY IF EXISTS "Enable update for claiming invite codes" ON public.invite_codes;
CREATE POLICY "Enable update for claiming invite codes"
  ON public.invite_codes FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (used_by = auth.uid());

-- =============================================================================
-- RLS Policies: steps_content
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view steps content" ON public.steps_content;
CREATE POLICY "Anyone can view steps content"
  ON public.steps_content FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- RLS Policies: user_step_progress
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own step progress" ON public.user_step_progress;
CREATE POLICY "Users can view own step progress"
  ON public.user_step_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sponsors can view sponsees' step progress" ON public.user_step_progress;
CREATE POLICY "Sponsors can view sponsees' step progress"
  ON public.user_step_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsor_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsee_id = user_step_progress.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert own step progress" ON public.user_step_progress;
CREATE POLICY "Users can insert own step progress"
  ON public.user_step_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own step progress" ON public.user_step_progress;
CREATE POLICY "Users can update own step progress"
  ON public.user_step_progress FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own step progress" ON public.user_step_progress;
CREATE POLICY "Users can delete own step progress"
  ON public.user_step_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- RLS Policies: task_templates
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view task templates" ON public.task_templates;
CREATE POLICY "Anyone can view task templates"
  ON public.task_templates FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- RLS Policies: tasks
-- =============================================================================

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

-- =============================================================================
-- RLS Policies: slip_ups
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own slip ups" ON public.slip_ups;
CREATE POLICY "Users can view own slip ups"
  ON public.slip_ups FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own slip ups" ON public.slip_ups;
CREATE POLICY "Users can insert own slip ups"
  ON public.slip_ups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own slip ups" ON public.slip_ups;
CREATE POLICY "Users can update own slip ups"
  ON public.slip_ups FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own slip ups" ON public.slip_ups;
CREATE POLICY "Users can delete own slip ups"
  ON public.slip_ups FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Sponsors can view their sponsees' slip ups" ON public.slip_ups;
CREATE POLICY "Sponsors can view their sponsees' slip ups"
  ON public.slip_ups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsor_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsee_id = slip_ups.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Sponsees can view their sponsors' slip ups" ON public.slip_ups;
CREATE POLICY "Sponsees can view their sponsors' slip ups"
  ON public.slip_ups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_sponsee_relationships
      WHERE sponsor_sponsee_relationships.sponsee_id = auth.uid()
        AND sponsor_sponsee_relationships.sponsor_id = slip_ups.user_id
        AND sponsor_sponsee_relationships.status = 'active'
    )
  );

-- =============================================================================
-- RLS Policies: messages
-- =============================================================================

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

-- =============================================================================
-- RLS Policies: notifications
-- =============================================================================

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

-- =============================================================================
-- Seed Data: 12 Steps Content
-- =============================================================================

INSERT INTO public.steps_content (step_number, title, description, detailed_content, reflection_prompts) VALUES
(1, 'Admit Powerlessness', 'We admitted we were powerless over alcohol—that our lives had become unmanageable.',
'The first step is about honesty and acceptance. It requires acknowledging that addiction has taken control and that attempts to manage it on our own have failed. This is not about weakness, but about recognizing the reality of the situation.

Key concepts:
- Powerlessness means recognizing that willpower alone cannot overcome addiction
- Unmanageability refers to the chaos addiction brings to all areas of life
- This step is the foundation for all other steps
- Acceptance opens the door to recovery',
'["What examples from my life show that my addiction has become unmanageable?", "When have I tried to control my drinking/using and failed?", "What areas of my life have been affected by my addiction?", "What does powerlessness mean to me?"]'::jsonb),

(2, 'Believe in a Higher Power', 'Came to believe that a Power greater than ourselves could restore us to sanity.',
'Step 2 introduces the concept of hope and opens us to the possibility of help from a source beyond ourselves. The "Higher Power" can be understood in many ways - it could be God, nature, the recovery group, or simply the power of human connection.

Key concepts:
- Sanity means sound thinking and reasonable behavior
- The Higher Power is personally defined
- This step is about hope and possibility
- Faith begins as willingness to believe',
'["What does sanity mean to me in the context of my recovery?", "What might a Higher Power look like for me?", "When have I experienced moments of clarity or peace?", "What gives me hope that recovery is possible?"]'::jsonb),

(3, 'Turn Over Your Will', 'Made a decision to turn our will and our lives over to the care of God as we understood Him.',
'Step 3 is about making a decision - choosing to let go of self-will and trusting in something greater. This doesn''t mean giving up responsibility, but rather aligning our actions with recovery principles.

Key concepts:
- This is a decision, not a completed action
- "God as we understood Him" allows for personal interpretation
- Turning over means trusting the recovery process
- Self-will often led us into addiction',
'["What does turning over my will mean to me?", "In what areas of my life do I struggle with control?", "How might my life be different if I trusted the process?", "What fears come up when I think about letting go?"]'::jsonb),

(4, 'Make a Moral Inventory', 'Made a searching and fearless moral inventory of ourselves.',
'Step 4 involves honest self-examination. It''s about looking at our patterns, behaviors, resentments, and fears. This inventory is meant to be thorough but not punishing.

Key concepts:
- Moral inventory examines character traits and behaviors
- Include both strengths and areas for growth
- Resentments, fears, and harmful behaviors are examined
- Honesty is essential',
'["What resentments am I holding onto?", "What fears have driven my behavior?", "How have my actions harmed myself and others?", "What patterns do I notice in my relationships?"]'::jsonb),

(5, 'Admit Wrongs', 'Admitted to God, to ourselves, and to another human being the exact nature of our wrongs.',
'Step 5 is about confession and connection. Sharing our inventory with another person helps break the isolation of addiction and brings relief from carrying secrets.

Key concepts:
- Sharing brings relief and connection
- Choose a trustworthy person to hear your inventory
- Honesty includes admitting our part in situations
- This step reduces shame and guilt',
'["Who might be a good person to share my inventory with?", "What feelings come up when I think about sharing my wrongs?", "What am I most reluctant to admit?", "How might sharing bring me relief?"]'::jsonb),

(6, 'Become Ready for Change', 'Were entirely ready to have God remove all these defects of character.',
'Step 6 is about willingness. After identifying our shortcomings, we prepare ourselves mentally and spiritually to let them go.

Key concepts:
- Character defects are patterns that no longer serve us
- Readiness means being willing to change
- This is preparation, not the change itself
- Some defects may have felt protective',
'["Which character defects am I ready to let go of?", "Which ones am I still attached to?", "What might life look like without these defects?", "What fears do I have about changing?"]'::jsonb),

(7, 'Ask for Removal of Shortcomings', 'Humbly asked Him to remove our shortcomings.',
'Step 7 is about humility and asking for help. We recognize that we cannot change ourselves through willpower alone and humbly request assistance.

Key concepts:
- Humility is an accurate view of ourselves
- Asking means being open to help
- Change is a process, not an event
- Our Higher Power works through many sources',
'["What does humility mean to me?", "How comfortable am I asking for help?", "Which shortcomings do I most want removed?", "How have I already begun to change?"]'::jsonb),

(8, 'List People Harmed', 'Made a list of all persons we had harmed, and became willing to make amends to them all.',
'Step 8 involves taking responsibility for the harm we''ve caused. We create a list of people we''ve hurt and prepare ourselves emotionally to make things right.

Key concepts:
- Focus on our part, not others'' actions
- Include ourselves on the list
- Willingness is the goal at this stage
- Making amends comes in Step 9',
'["Who have I harmed through my addiction?", "How have I harmed myself?", "What resistances do I have to making amends?", "What does willingness mean in this context?"]'::jsonb),

(9, 'Make Amends', 'Made direct amends to such people wherever possible, except when to do so would injure them or others.',
'Step 9 is about taking action to repair the damage we''ve caused. Amends can be direct, indirect, or living - depending on the situation.

Key concepts:
- Direct amends involve face-to-face acknowledgment
- Some amends are best made through changed behavior
- Consider the impact on others before making amends
- This step brings freedom and peace',
'["Which amends can I make directly?", "Which might cause more harm?", "How can I make living amends through changed behavior?", "What do I hope to gain from making amends?"]'::jsonb),

(10, 'Continue Personal Inventory', 'Continued to take personal inventory and when we were wrong promptly admitted it.',
'Step 10 is about maintenance. We continue the self-examination process daily, quickly addressing problems as they arise.

Key concepts:
- Daily reflection prevents buildup
- Prompt admission prevents resentments
- This step keeps us honest
- Regular inventory supports long-term recovery',
'["What does a daily inventory look like for me?", "How quickly do I usually admit when I am wrong?", "What patterns tend to resurface?", "How has regular self-examination helped me?"]'::jsonb),

(11, 'Seek Spiritual Connection', 'Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out.',
'Step 11 deepens our spiritual practice. Through prayer and meditation, we strengthen our connection to our Higher Power and seek guidance.

Key concepts:
- Prayer and meditation can take many forms
- The goal is conscious contact, not perfection
- We seek guidance, not specific outcomes
- This practice supports daily recovery',
'["What spiritual practices resonate with me?", "How do I experience conscious contact?", "What does seeking guidance mean in my life?", "How can I deepen my spiritual practice?"]'::jsonb),

(12, 'Help Others', 'Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.',
'Step 12 is about service and living the principles. We share our experience with others and apply recovery principles to every area of our lives.

Key concepts:
- Spiritual awakening is the result of working the steps
- Helping others strengthens our own recovery
- These principles apply to all of life
- Recovery is a way of living, not just abstinence',
'["What does spiritual awakening mean to me?", "How can I carry the message to others?", "In what areas of my life can I practice these principles?", "How has helping others helped my recovery?"]'::jsonb)

ON CONFLICT (step_number) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  detailed_content = EXCLUDED.detailed_content,
  reflection_prompts = EXCLUDED.reflection_prompts,
  updated_at = now();

-- =============================================================================
-- Seed Data: Task Templates
-- =============================================================================

INSERT INTO public.task_templates (step_number, title, description, is_default) VALUES
-- Step 1 templates
(1, 'Write Your Story', 'Write about your journey with addiction - when it started, how it progressed, and what brought you to recovery.', true),
(1, 'List Unmanageability Examples', 'Make a list of 10 ways your life became unmanageable due to addiction.', true),
(1, 'Powerlessness Reflection', 'Write about a time you tried to control your addiction and failed.', true),

-- Step 2 templates
(2, 'Define Your Higher Power', 'Write about what your Higher Power means to you. It can be God, nature, the group, or any power greater than yourself.', true),
(2, 'Moments of Hope', 'List 5 moments when you felt hope that recovery was possible.', true),

-- Step 3 templates
(3, 'Daily Surrender Practice', 'Each morning for a week, practice turning over your will. Write about the experience.', true),
(3, 'Control vs Trust', 'List areas where you struggle with control and how you might practice trust instead.', true),

-- Step 4 templates
(4, 'Resentment Inventory', 'Create a detailed list of your resentments - who, what happened, how it affected you, and your part in it.', true),
(4, 'Fear Inventory', 'List your fears and examine how they have driven your behavior.', true),
(4, 'Character Assets and Defects', 'Make two columns: list your character strengths and your areas for growth.', true),

-- Step 5 templates
(5, 'Prepare for Sharing', 'Review your Step 4 inventory and prepare to share it with your sponsor.', true),
(5, 'Post-Sharing Reflection', 'After sharing your inventory, write about the experience and how you feel.', true),

-- Step 6 templates
(6, 'Defect Deep Dive', 'Choose one character defect and write about how it has affected your life and relationships.', true),
(6, 'Readiness Assessment', 'For each defect you identified, rate your readiness to let it go on a scale of 1-10.', true),

-- Step 7 templates
(7, 'Humility Reflection', 'Write about what humility means to you and how it differs from humiliation.', true),
(7, 'Daily Asking Practice', 'Each day for a week, consciously ask your Higher Power to remove one shortcoming.', true),

-- Step 8 templates
(8, 'Complete Amends List', 'Make a comprehensive list of all people you have harmed.', true),
(8, 'Willingness Assessment', 'For each person on your list, honestly assess your willingness to make amends.', true),

-- Step 9 templates
(9, 'Plan Direct Amends', 'Choose one person and write a plan for making direct amends to them.', true),
(9, 'Living Amends Commitment', 'Identify one person you cannot make direct amends to and describe how you will make living amends.', true),

-- Step 10 templates
(10, 'Evening Inventory Practice', 'Each evening for two weeks, review your day and note where you were wrong or could improve.', true),
(10, 'Prompt Admission Practice', 'When you notice you are wrong, practice admitting it promptly. Journal about this experience.', true),

-- Step 11 templates
(11, 'Morning Meditation', 'Establish a morning meditation practice. Start with 5 minutes and document your experience.', true),
(11, 'Prayer/Intention Practice', 'Write your own prayer or daily intention focused on guidance and service.', true),

-- Step 12 templates
(12, 'Service Commitment', 'Identify one way you can be of service to others in recovery this week.', true),
(12, 'Principles in Practice', 'Choose one recovery principle and consciously apply it to a situation outside of recovery.', true),
(12, 'Carry the Message', 'Share your experience, strength, and hope with someone new to recovery.', true)

ON CONFLICT DO NOTHING;

-- =============================================================================
-- Schema Cleanup (for existing databases)
-- =============================================================================

-- Remove deprecated columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
