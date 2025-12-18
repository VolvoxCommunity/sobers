-- E2E Test Data Seeding Script
-- Run against staging Supabase to set up E2E test accounts and data
-- Prerequisites: Test users must be created via Supabase Auth API first

-- ============================================
-- 1. SEED PROFILES
-- ============================================

INSERT INTO public.profiles (id, email, display_name, sobriety_date, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
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
  '22222222-2222-2222-2222-222222222222',
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
  '33333333-3333-3333-3333-333333333333',
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
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sponsor_sponsee_relationships (
  id, sponsor_id, sponsee_id, status, created_at
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'active',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. SEED TASKS
-- ============================================

INSERT INTO public.tasks (id, user_id, title, description, frequency, is_active, created_at)
VALUES
  ('task-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Morning meditation', 'Start day with 10 minutes of meditation', 'daily', true, NOW()),
  ('task-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Call sponsor', 'Weekly check-in call with sponsor', 'weekly', true, NOW()),
  ('task-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Attend meeting', 'Attend AA/NA meeting', 'weekly', true, NOW()),
  ('task-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Journal entry', 'Write daily gratitude journal', 'daily', true, NOW()),
  ('task-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
   'Inactive task', 'This task is disabled', 'daily', false, NOW())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  frequency = EXCLUDED.frequency,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 4. SEED TASK COMPLETIONS
-- ============================================

DELETE FROM public.task_completions
WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO public.task_completions (id, task_id, user_id, completed_at)
VALUES
  (gen_random_uuid(), 'task-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'task-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'task-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'task-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days');

-- ============================================
-- 5. SEED MILESTONES
-- ============================================

INSERT INTO public.milestones (id, user_id, type, achieved_at, days_count)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '24_hours', '2024-01-16', 1),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '1_week', '2024-01-22', 7),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '30_days', '2024-02-14', 30),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '90_days', '2024-04-14', 90),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '6_months', '2024-07-15', 180)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. SEED INVITE CODES
-- ============================================

INSERT INTO public.invite_codes (code, user_id, created_at, expires_at)
VALUES (
  'SPONSOR123',
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (code) DO UPDATE SET
  expires_at = NOW() + INTERVAL '30 days';

-- ============================================
-- 7. CLEANUP FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reset_e2e_test_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.task_completions
  WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  );

  INSERT INTO public.task_completions (id, task_id, user_id, completed_at)
  VALUES
    (gen_random_uuid(), 'task-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'task-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day');

  DELETE FROM public.profiles WHERE email = 'e2e-onboarding@sobers-test.com';
END;
$$ LANGUAGE plpgsql;
