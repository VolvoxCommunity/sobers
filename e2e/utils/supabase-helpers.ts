import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TEST_USERS,
  TEST_TASKS,
  TEST_INVITE_CODES,
  TEST_PRAYERS,
  TEST_MEETINGS,
} from '../fixtures/test-data';

// Lazy-initialized client to avoid errors when listing tests without env vars
let adminClient: SupabaseClient | null = null;

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
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.E2E_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'E2E tests require EXPO_PUBLIC_SUPABASE_URL and E2E_SUPABASE_SERVICE_KEY environment variables'
      );
    }

    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
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
  const client = getAdminClient();
  const now = new Date().toISOString();
  const inviteExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentMeetingTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Reset task completions for test users (IDs from test-data.ts fixtures)
  const testUserIds = [TEST_USERS.primary.id, TEST_USERS.sponsor.id, TEST_USERS.sponsee.id];

  await client.from('task_completions').delete().in('user_id', testUserIds);

  await client.from('user_prayer_favorites').delete().eq('user_id', TEST_USERS.primary.id);
  await client.from('user_meeting_milestones').delete().eq('user_id', TEST_USERS.primary.id);
  await client.from('user_meetings').delete().eq('user_id', TEST_USERS.primary.id);

  // Reset onboarding user profile
  await client.from('profiles').delete().eq('email', TEST_USERS.onboarding.email);

  const { error: profileError } = await client.from('profiles').upsert([
    {
      id: TEST_USERS.primary.id,
      email: TEST_USERS.primary.email,
      display_name: TEST_USERS.primary.displayName,
      sobriety_date: TEST_USERS.primary.sobrietyDate,
      spend_amount: TEST_USERS.primary.spendAmount,
      spend_frequency: TEST_USERS.primary.spendFrequency,
      updated_at: now,
    },
    {
      id: TEST_USERS.sponsor.id,
      email: TEST_USERS.sponsor.email,
      display_name: TEST_USERS.sponsor.displayName,
      sobriety_date: TEST_USERS.sponsor.sobrietyDate,
      updated_at: now,
    },
    {
      id: TEST_USERS.sponsee.id,
      email: TEST_USERS.sponsee.email,
      display_name: TEST_USERS.sponsee.displayName,
      sobriety_date: TEST_USERS.sponsee.sobrietyDate,
      updated_at: now,
    },
  ]);

  if (profileError) {
    throw new Error(`Failed to ensure test profiles: ${profileError.message}`);
  }

  await client
    .from('sponsor_sponsee_relationships')
    .delete()
    .eq('sponsee_id', TEST_USERS.primary.id);

  const { error: relationshipsError } = await client.from('sponsor_sponsee_relationships').upsert([
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sponsor_id: TEST_USERS.sponsor.id,
      sponsee_id: TEST_USERS.sponsee.id,
      status: 'active',
      created_at: now,
    },
  ]);

  if (relationshipsError) {
    throw new Error(`Failed to seed relationships: ${relationshipsError.message}`);
  }

  const { error: prayersError } = await client.from('prayers').upsert(
    [
      {
        id: TEST_PRAYERS.step.id,
        title: TEST_PRAYERS.step.title,
        content: TEST_PRAYERS.step.content,
        category: TEST_PRAYERS.step.category,
        step_number: TEST_PRAYERS.step.stepNumber,
        sort_order: TEST_PRAYERS.step.sortOrder,
        created_at: now,
        updated_at: now,
      },
      {
        id: TEST_PRAYERS.common.id,
        title: TEST_PRAYERS.common.title,
        content: TEST_PRAYERS.common.content,
        category: TEST_PRAYERS.common.category,
        sort_order: TEST_PRAYERS.common.sortOrder,
        created_at: now,
        updated_at: now,
      },
    ],
    { onConflict: 'id' }
  );

  if (prayersError) {
    throw new Error(`Failed to seed prayers: ${prayersError.message}`);
  }

  const { error: tasksError } = await client.from('tasks').upsert([
    {
      id: TEST_TASKS.meditation.id,
      sponsor_id: TEST_USERS.sponsor.id,
      sponsee_id: TEST_USERS.primary.id,
      step_number: TEST_TASKS.meditation.stepNumber,
      title: TEST_TASKS.meditation.title,
      description: TEST_TASKS.meditation.description,
      status: TEST_TASKS.meditation.status,
      created_at: now,
    },
    {
      id: TEST_TASKS.callSponsor.id,
      sponsor_id: TEST_USERS.sponsor.id,
      sponsee_id: TEST_USERS.primary.id,
      step_number: TEST_TASKS.callSponsor.stepNumber,
      title: TEST_TASKS.callSponsor.title,
      description: TEST_TASKS.callSponsor.description,
      status: TEST_TASKS.callSponsor.status,
      created_at: now,
    },
    {
      id: TEST_TASKS.completed.id,
      sponsor_id: TEST_USERS.sponsor.id,
      sponsee_id: TEST_USERS.primary.id,
      step_number: TEST_TASKS.completed.stepNumber,
      title: TEST_TASKS.completed.title,
      description: TEST_TASKS.completed.description,
      status: TEST_TASKS.completed.status,
      created_at: now,
    },
  ]);

  if (tasksError) {
    throw new Error(`Failed to seed tasks: ${tasksError.message}`);
  }

  const { error: meetingsError } = await client.from('user_meetings').upsert(
    [
      {
        id: TEST_MEETINGS.today.id,
        user_id: TEST_USERS.primary.id,
        meeting_name: TEST_MEETINGS.today.name,
        meeting_type: 'other',
        location: TEST_MEETINGS.today.location,
        attended_at: recentMeetingTime,
        created_at: now,
        updated_at: now,
      },
    ],
    { onConflict: 'id' }
  );

  if (meetingsError) {
    throw new Error(`Failed to seed meetings: ${meetingsError.message}`);
  }

  const { error: inviteError } = await client.from('invite_codes').upsert(
    {
      code: TEST_INVITE_CODES.sponsor,
      sponsor_id: TEST_USERS.sponsor.id,
      created_at: now,
      expires_at: inviteExpiry,
    },
    { onConflict: 'code' }
  );

  if (inviteError) {
    throw new Error(`Failed to seed invite codes: ${inviteError.message}`);
  }
}

/**
 * Deletes Supabase users created for signup end-to-end tests.
 *
 * Removes all users whose email begins with `e2e-signup-` via the Supabase admin API.
 */
export async function cleanupSignupUsers(): Promise<void> {
  const client = getAdminClient();

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
  const client = getAdminClient();

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
  const client = getAdminClient();

  // Try to get the user first
  const { data: existingUser } = await client.auth.admin.getUserById(id);

  if (existingUser?.user) {
    // User exists, update their password to ensure it matches
    const { error: updateError } = await client.auth.admin.updateUserById(id, {
      email,
      password,
    });
    if (updateError) {
      throw updateError;
    }
    return;
  }

  // User doesn't exist, create with specific ID
  const { error } = await client.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      const { data: usersData, error: listError } = await client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        throw listError;
      }

      const existingByEmail = usersData?.users.find((user) => user.email === email);

      if (!existingByEmail) {
        throw new Error(`User with email ${email} already exists but was not found for reset`);
      }

      await client.auth.admin.deleteUser(existingByEmail.id);

      const { error: recreateError } = await client.auth.admin.createUser({
        id,
        email,
        password,
        email_confirm: true,
      });

      if (recreateError) {
        throw recreateError;
      }

      return;
    }

    throw error;
  }
}

/**
 * Permanently deletes the Supabase user with the given user ID from the project.
 *
 * @param userId - The ID of the Supabase user to delete
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = getAdminClient();
  await client.auth.admin.deleteUser(userId);
}
