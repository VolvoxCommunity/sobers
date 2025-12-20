-- E2E Test Data Seeding Script
-- Run against staging Supabase to set up E2E test accounts and data
-- Prerequisites: Test users must be created via Supabase Auth API first

-- ============================================
-- 1. SEED PROFILES
-- ============================================

INSERT INTO public.profiles (id, email, display_name, sobriety_date, created_at, updated_at)
VALUES (
  'b81936a6-125f-420a-a736-eeb5943c28b1',
  'e2e-primary@sobers-test.com',
  'E2E Primary User',
  '2024-01-15',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sobriety_date = EXCLUDED.sobriety_date,
  updated_at = NOW();

INSERT INTO public.profiles (id, email, display_name, sobriety_date, created_at, updated_at)
VALUES (
  '3a28e197-e07d-4cba-b7e4-01804e7cca73',
  'e2e-sponsor@sobers-test.com',
  'E2E Sponsor User',
  '2020-06-01',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sobriety_date = EXCLUDED.sobriety_date,
  updated_at = NOW();

INSERT INTO public.profiles (id, email, display_name, sobriety_date, created_at, updated_at)
VALUES (
  '80f409b9-db2d-4c84-aa41-ad90ba1b212a',
  'e2e-sponsee@sobers-test.com',
  'E2E Sponsee User',
  '2024-10-01',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  sobriety_date = EXCLUDED.sobriety_date,
  updated_at = NOW();

-- ============================================
-- 2. SEED SPONSOR/SPONSEE RELATIONSHIPS
-- ============================================

INSERT INTO public.sponsor_sponsee_relationships (
  id, sponsor_id, sponsee_id, status, created_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '3a28e197-e07d-4cba-b7e4-01804e7cca73',
  '80f409b9-db2d-4c84-aa41-ad90ba1b212a',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sponsor_sponsee_relationships (
  id, sponsor_id, sponsee_id, status, created_at
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '3a28e197-e07d-4cba-b7e4-01804e7cca73',
  'b81936a6-125f-420a-a736-eeb5943c28b1',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. SEED TASKS
-- ============================================
-- Note: Tasks table schema requires sponsor_id, sponsee_id, step_number, status
-- Tasks are assigned by sponsors to sponsees

INSERT INTO public.tasks (id, sponsor_id, sponsee_id, step_number, title, description, status, created_at)
VALUES
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3a28e197-e07d-4cba-b7e4-01804e7cca73', 'b81936a6-125f-420a-a736-eeb5943c28b1',
   1, 'Morning meditation', 'Start day with 10 minutes of meditation', 'assigned', NOW()),
  ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3a28e197-e07d-4cba-b7e4-01804e7cca73', 'b81936a6-125f-420a-a736-eeb5943c28b1',
   2, 'Call sponsor', 'Weekly check-in call with sponsor', 'assigned', NOW()),
  ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3a28e197-e07d-4cba-b7e4-01804e7cca73', 'b81936a6-125f-420a-a736-eeb5943c28b1',
   3, 'Attend meeting', 'Attend AA/NA meeting', 'assigned', NOW()),
  ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3a28e197-e07d-4cba-b7e4-01804e7cca73', 'b81936a6-125f-420a-a736-eeb5943c28b1',
   4, 'Journal entry', 'Write daily gratitude journal', 'assigned', NOW()),
  ('55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '3a28e197-e07d-4cba-b7e4-01804e7cca73', 'b81936a6-125f-420a-a736-eeb5943c28b1',
   5, 'Completed task', 'This task has been completed', 'completed', NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- ============================================
-- 4. SEED USER STEP PROGRESS (Milestones are tracked via step completion)
-- ============================================
-- Note: The app tracks step progress via user_step_progress table, not a separate milestones table

INSERT INTO public.user_step_progress (id, user_id, step_number, completed, completed_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'b81936a6-125f-420a-a736-eeb5943c28b1', 1, true, '2024-01-20', NOW(), NOW()),
  (gen_random_uuid(), 'b81936a6-125f-420a-a736-eeb5943c28b1', 2, true, '2024-02-15', NOW(), NOW()),
  (gen_random_uuid(), 'b81936a6-125f-420a-a736-eeb5943c28b1', 3, false, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. SEED INVITE CODES
-- ============================================

INSERT INTO public.invite_codes (code, sponsor_id, created_at, expires_at)
VALUES (
  'SPONSOR123',
  '3a28e197-e07d-4cba-b7e4-01804e7cca73',
  NOW(),
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (code) DO UPDATE SET
  expires_at = NOW() + INTERVAL '30 days';

-- ============================================
-- 6. CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reset_e2e_test_data()
RETURNS void AS $$
BEGIN
  -- Reset tasks to assigned status
  UPDATE public.tasks
  SET status = 'assigned', completed_at = NULL, completion_notes = NULL
  WHERE sponsee_id = 'b81936a6-125f-420a-a736-eeb5943c28b1'
    AND id != '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Keep one task as completed for testing
  UPDATE public.tasks
  SET status = 'completed', completed_at = NOW()
  WHERE id = '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Clean up onboarding test user if exists
  DELETE FROM public.profiles WHERE email = 'e2e-onboarding@sobers-test.com';
END;
$$ LANGUAGE plpgsql;
