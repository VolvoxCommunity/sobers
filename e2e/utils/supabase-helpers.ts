import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS } from '../fixtures/test-data';

// Lazy-initialized client to avoid errors when listing tests without env vars
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get a singleton Supabase admin client configured with the service role key.
 *
 * Initializes the client on first call using EXPO_PUBLIC_SUPABASE_URL and
 * E2E_SUPABASE_SERVICE_KEY. Initialization is deferred so test discovery can
 * run without requiring those environment variables.
 *
 * @throws If EXPO_PUBLIC_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY are not set when called.
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

/**
 * Reset Supabase test data to a known state for end-to-end tests.
 *
 * Deletes task completion rows for the test users, removes the onboarding
 * profile by email, and ensures the primary test user profile exists with
 * the required fields.
 *
 * @throws Error if upserting the primary test user profile fails
 */
export async function resetTestData(): Promise<void> {
  const client = getSupabaseAdmin();

  // Reset task completions for test users (IDs from test-data.ts fixtures)
  const testUserIds = [
    TEST_USERS.primary.id,
    TEST_USERS.sponsor.id,
    TEST_USERS.sponsee.id,
  ];

  await client.from('task_completions').delete().in('user_id', testUserIds);

  // Reset onboarding user profile
  await client.from('profiles').delete().eq('email', TEST_USERS.onboarding.email);

  // Ensure primary user profile exists (required for login to complete successfully)
  const { error: profileError } = await client.from('profiles').upsert({
    id: TEST_USERS.primary.id,
    email: TEST_USERS.primary.email,
    display_name: TEST_USERS.primary.displayName,
    sobriety_date: TEST_USERS.primary.sobrietyDate,
  });

  if (profileError) {
    throw new Error(`Failed to ensure test profile: ${profileError.message}`);
  }
}

/**
 * Deletes Supabase users created for signup end-to-end tests.
 *
 * Removes all users whose email begins with `e2e-signup-` via the Supabase admin API.
 */
export async function cleanupSignupUsers(): Promise<void> {
  const client = getSupabaseAdmin();

  // Delete dynamically created signup test users
  const { data: users } = await client.auth.admin.listUsers();

  const signupUsers = users?.users.filter((u) => u.email?.startsWith('e2e-signup-')) || [];

  for (const user of signupUsers) {
    await client.auth.admin.deleteUser(user.id);
  }
}

/**
 * Create a new test user with the given email and password.
 *
 * @returns The newly created user's ID
 * @throws If user creation fails
 */
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
 * Ensure a test user exists with the given ID, email, and password.
 *
 * @param id - The desired user ID to create or validate
 * @param email - The user's email address
 * @param password - The user's password; if the user exists their password will be updated
 * @throws Rethrows the creation error if user creation fails for a reason other than "already been registered"
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

/**
 * Permanently deletes the Supabase user with the given user ID from the project.
 *
 * @param userId - The ID of the Supabase user to delete
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = getSupabaseAdmin();
  await client.auth.admin.deleteUser(userId);
}