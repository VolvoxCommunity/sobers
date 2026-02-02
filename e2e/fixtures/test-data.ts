export const TEST_USERS = {
  primary: {
    id: 'b81936a6-125f-420a-a736-eeb5943c28b1',
    email: 'e2e-primary@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'E2E-Password1!',
    displayName: 'E2E Primary User',
    sobrietyDate: '2024-01-15',
    /** Spending amount for savings tracking E2E tests (USD per week) */
    spendAmount: 50.0,
    /** Spending frequency for savings tracking E2E tests */
    spendFrequency: 'weekly' as const,
  },
  sponsor: {
    id: '3a28e197-e07d-4cba-b7e4-01804e7cca73',
    email: 'e2e-sponsor@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'E2E-Password1!',
    displayName: 'E2E Sponsor User',
    sobrietyDate: '2020-06-01',
  },
  sponsee: {
    id: '80f409b9-db2d-4c84-aa41-ad90ba1b212a',
    email: 'e2e-sponsee@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'E2E-Password1!',
    displayName: 'E2E Sponsee User',
    sobrietyDate: '2024-10-01',
  },
  onboarding: {
    email: 'e2e-onboarding@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'E2E-Password1!',
  },
} as const;

export const TEST_INVITE_CODES = {
  sponsor: 'SPONSOR123',
} as const;

/**
 * Test tasks matching the seed-test-data.sql definitions.
 * Task IDs use valid 8-4-4-4-12 UUID format from the seed script.
 * Tasks use step_number (1-12) and status ('assigned'|'in_progress'|'completed')
 * fields consistent with the current schema.
 */
export const TEST_TASKS = {
  meditation: {
    id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Morning meditation',
    description: 'Start day with 10 minutes of meditation',
    stepNumber: 1,
    status: 'assigned',
  },
  callSponsor: {
    id: '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Call sponsor',
    description: 'Weekly check-in call with sponsor',
    stepNumber: 2,
    status: 'assigned',
  },
  completed: {
    id: '55555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Completed task',
    description: 'This task has been completed',
    stepNumber: 5,
    status: 'completed',
  },
} as const;

/**
 * Test prayers seeded for Program > Prayers E2E coverage.
 */
export const TEST_PRAYERS = {
  step: {
    id: '66666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Step Three Prayer',
    content: 'Guide me to turn my will and my life over to your care.',
    category: 'step' as const,
    stepNumber: 3,
    sortOrder: 10,
  },
  common: {
    id: '77777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: 'Serenity Prayer',
    content: 'Grant me the serenity to accept the things I cannot change.',
    category: 'common' as const,
    sortOrder: 20,
  },
} as const;

/**
 * Test meetings seeded for Program > Meetings E2E coverage.
 */
export const TEST_MEETINGS = {
  today: {
    id: '88888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'E2E Morning Meeting',
    location: 'Online',
  },
} as const;

/**
 * Create a unique signup email address for end-to-end tests.
 *
 * @returns An email address in the format `e2e-signup-<timestamp>@sobers-test.com`, where `<timestamp>` is the number of milliseconds since the Unix epoch.
 */
export function generateSignupEmail(): string {
  return `e2e-signup-${Date.now()}@sobers-test.com`;
}
