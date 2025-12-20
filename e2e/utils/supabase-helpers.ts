import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized client to avoid errors when listing tests without env vars
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns the Supabase admin client with service role permissions.
 *
 * Uses lazy initialization to avoid errors when Playwright lists tests without
 * environment variables set. The error will only be thrown during actual test
 * execution (when the client is first accessed), not during test discovery.
 *
 * @throws {Error} If EXPO_PUBLIC_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY
 *   environment variables are not set when the function is called.
 * @returns The configured Supabase admin client
 */
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
    'b81936a6-125f-420a-a736-eeb5943c28b1',
    '3a28e197-e07d-4cba-b7e4-01804e7cca73',
    '80f409b9-db2d-4c84-aa41-ad90ba1b212a',
  ];

  await client.from('task_completions').delete().in('user_id', testUserIds);

  // Reset onboarding user profile
  await client.from('profiles').delete().eq('email', 'e2e-onboarding@sobers-test.com');

  // Ensure primary user profile exists (required for login to complete successfully)
  const { error: profileError } = await client.from('profiles').upsert({
    id: 'b81936a6-125f-420a-a736-eeb5943c28b1',
    email: 'e2e-primary@sobers-test.com',
    display_name: 'E2E Primary User',
    sobriety_date: '2024-01-15',
  });

  if (profileError) {
    throw new Error(`Failed to ensure test profile: ${profileError.message}`);
  }
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

/**
 * Ensures a test user exists with the specified ID, email, and password.
 * Creates the user if they don't exist, or updates their password if they do.
 */
export async function ensureTestUserExists(
  id: string,
  email: string,
  password: string
): Promise<void> {
  const client = getSupabaseAdmin();

  // Try to get the user first
  const { data: existingUser } = await client.auth.admin.getUserById(id);

  if (existingUser?.user) {
    // User exists, update their password to ensure it matches
    await client.auth.admin.updateUserById(id, { password });
    return;
  }

  // User doesn't exist, create with specific ID
  const { error } = await client.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
  });

  if (error && !error.message.includes('already been registered')) {
    throw error;
  }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const client = getSupabaseAdmin();
  await client.auth.admin.deleteUser(userId);
}
