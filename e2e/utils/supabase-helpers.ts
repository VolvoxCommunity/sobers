import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.E2E_SUPABASE_SERVICE_KEY!;

// Service role client for admin operations (test setup/teardown only)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function resetTestData(): Promise<void> {
  // Reset task completions for test users
  const testUserIds = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
  ];

  await supabaseAdmin.from('task_completions').delete().in('user_id', testUserIds);

  // Reset onboarding user profile
  await supabaseAdmin.from('profiles').delete().eq('email', 'e2e-onboarding@sobers-test.com');
}

export async function cleanupSignupUsers(): Promise<void> {
  // Delete dynamically created signup test users
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();

  const signupUsers = users?.users.filter((u) => u.email?.startsWith('e2e-signup-')) || [];

  for (const user of signupUsers) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}

export async function createTestUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user.id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
