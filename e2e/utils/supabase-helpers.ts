import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized client to avoid errors when listing tests without env vars
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.E2E_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'E2E tests require EXPO_PUBLIC_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY environment variables'
      );
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

export async function resetTestData(): Promise<void> {
  const client = getSupabaseAdmin();

  // Reset task completions for test users
  const testUserIds = [
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
  ];

  await client.from('task_completions').delete().in('user_id', testUserIds);

  // Reset onboarding user profile
  await client.from('profiles').delete().eq('email', 'e2e-onboarding@sobers-test.com');
}

export async function cleanupSignupUsers(): Promise<void> {
  const client = getSupabaseAdmin();

  // Delete dynamically created signup test users
  const { data: users } = await client.auth.admin.listUsers();

  const signupUsers = users?.users.filter((u) => u.email?.startsWith('e2e-signup-')) || [];

  for (const user of signupUsers) {
    await client.auth.admin.deleteUser(user.id);
  }
}

export async function createTestUser(email: string, password: string): Promise<string> {
  const client = getSupabaseAdmin();

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user.id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  const client = getSupabaseAdmin();
  await client.auth.admin.deleteUser(userId);
}
