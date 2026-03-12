/*
  # Create AI Buddy tables

  Creates the database schema for the Sobers Buddy AI companion feature.

  Tables:
  - ai_buddy_conversations: Chat conversation sessions between user and AI
  - ai_buddy_messages: Individual messages within conversations

  Also adds `ai_buddy_enabled` column to profiles for feature gating.

  Part of Epic #412: Sobers Buddy — AI-Powered Accountability Partner
*/

-- =============================================================================
-- Add ai_buddy_enabled feature flag to profiles
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'ai_buddy_enabled'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN ai_buddy_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN ai_buddy_enabled SET DEFAULT true;

COMMENT ON COLUMN public.profiles.ai_buddy_enabled IS
  'Whether the AI Buddy feature is enabled for this user. Default true (enabled for all new users). When false, the Buddy tab is hidden from navigation.';

-- =============================================================================
-- AI Buddy Conversations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_buddy_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ai_buddy_conversations IS
  'Chat conversation sessions between a user and the Sobers Buddy AI companion.';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_buddy_conversations_updated_at ON public.ai_buddy_conversations;
CREATE TRIGGER update_ai_buddy_conversations_updated_at
  BEFORE UPDATE ON public.ai_buddy_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- AI Buddy Messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_buddy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_buddy_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.ai_buddy_messages IS
  'Individual messages within an AI Buddy conversation. Messages are from the user or the AI assistant.';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_buddy_messages_updated_at ON public.ai_buddy_messages;
CREATE TRIGGER update_ai_buddy_messages_updated_at
  BEFORE UPDATE ON public.ai_buddy_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_buddy_conversations_user
  ON public.ai_buddy_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_buddy_conversations_updated
  ON public.ai_buddy_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_buddy_messages_conversation
  ON public.ai_buddy_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_buddy_messages_user
  ON public.ai_buddy_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_buddy_messages_created
  ON public.ai_buddy_messages(created_at DESC);

-- =============================================================================
-- Enable RLS
-- =============================================================================

ALTER TABLE public.ai_buddy_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_buddy_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies: ai_buddy_conversations
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_buddy_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.ai_buddy_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own conversations" ON public.ai_buddy_conversations;
CREATE POLICY "Users can create own conversations"
  ON public.ai_buddy_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_buddy_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.ai_buddy_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_buddy_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.ai_buddy_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- RLS Policies: ai_buddy_messages
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own messages" ON public.ai_buddy_messages;
CREATE POLICY "Users can view own messages"
  ON public.ai_buddy_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own messages" ON public.ai_buddy_messages;
CREATE POLICY "Users can create own messages"
  ON public.ai_buddy_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON public.ai_buddy_messages;
CREATE POLICY "Users can delete own messages"
  ON public.ai_buddy_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid());
