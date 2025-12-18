# E2E Test Suite Design - Playwright for Web

**Date:** 2025-12-17
**Status:** Approved

## Overview

Comprehensive E2E test suite using Playwright for the Sobers web application. Covers all screens and user flows with real Supabase authentication against a staging environment.

## Goals

1. **Regression safety** - Catch bugs before they reach production
2. **Critical path validation** - Ensure core user flows always work
3. **CI/CD gating** - Block deployments if E2E tests fail
4. **Visual regression** - Deferred for future implementation

## Key Decisions

| Aspect         | Decision                                     |
| -------------- | -------------------------------------------- |
| Scope          | Full app coverage (~65-80 tests)             |
| Auth           | Real Supabase auth against staging project   |
| Test Data      | Pre-seeded accounts + dynamic signup tests   |
| CI/CD          | Run on every PR with 4-shard parallelization |
| Visual Testing | Deferred for later                           |
| Browsers       | Chromium in CI, all browsers locally         |
| Structure      | Page Object Model with `testID` attributes   |

## Directory Structure

```
e2e/
├── playwright.config.ts      # Main Playwright configuration
├── global-setup.ts           # Auth state setup, test account seeding
├── global-teardown.ts        # Cleanup orphaned test data
├── auth.setup.ts             # Generate authenticated storage state
├── fixtures/
│   ├── test-fixtures.ts      # Custom fixtures (authenticated page, test user)
│   ├── test-data.ts          # Test user credentials, seed data
│   └── seed-test-data.sql    # SQL script for database seeding
├── pages/                    # Page Object Models
│   ├── base.page.ts
│   ├── login.page.ts
│   ├── signup.page.ts
│   ├── onboarding.page.ts
│   ├── home.page.ts
│   ├── steps.page.ts
│   ├── journey.page.ts
│   ├── tasks.page.ts
│   ├── profile.page.ts
│   └── settings.page.ts
├── tests/
│   ├── auth/                 # Auth flow tests
│   ├── onboarding/           # Onboarding tests
│   ├── home/                 # Home screen tests
│   ├── steps/                # 12-step content tests
│   ├── journey/              # Journey/milestones tests
│   ├── tasks/                # Task management tests
│   ├── profile/              # Profile & relationships tests
│   └── settings/             # Settings tests
└── utils/
    ├── supabase-helpers.ts   # Direct Supabase calls for setup/teardown
    └── test-helpers.ts       # Common test utilities
```

## Test Accounts

Pre-seeded in staging Supabase:

```typescript
export const TEST_USERS = {
  primary: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'e2e-primary@sobers-test.com',
    displayName: 'E2E Primary User',
    sobrietyDate: '2024-01-15',
  },
  sponsor: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'e2e-sponsor@sobers-test.com',
    displayName: 'E2E Sponsor User',
    sobrietyDate: '2020-06-01',
  },
  sponsee: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'e2e-sponsee@sobers-test.com',
    displayName: 'E2E Sponsee User',
    sobrietyDate: '2024-10-01',
  },
  onboarding: {
    email: 'e2e-onboarding@sobers-test.com',
    // No profile - created fresh during onboarding tests
  },
};
```

Password stored in `E2E_TEST_PASSWORD` environment variable.

## Test Coverage

| Suite                           | Tests | Purpose                                                |
| ------------------------------- | ----- | ------------------------------------------------------ |
| `auth/login.spec.ts`            | 6-8   | Email login, validation errors, forgot password link   |
| `auth/signup.spec.ts`           | 5-7   | Account creation, validation, duplicate email handling |
| `auth/social.spec.ts`           | 2-3   | Google OAuth flow                                      |
| `onboarding/flow.spec.ts`       | 4-5   | Complete onboarding, skip steps, validation            |
| `home/dashboard.spec.ts`        | 5-6   | Days sober display, quick actions, navigation          |
| `steps/list.spec.ts`            | 3-4   | View all steps, step completion status                 |
| `steps/detail.spec.ts`          | 4-5   | Read step content, mark complete, navigation           |
| `journey/milestones.spec.ts`    | 4-5   | View milestones, earned vs upcoming                    |
| `tasks/view.spec.ts`            | 5-6   | Task list, filters, completion status                  |
| `tasks/manage.spec.ts`          | 6-8   | Create, edit, delete, assign tasks                     |
| `profile/view.spec.ts`          | 4-5   | Profile display, stats, relationships                  |
| `profile/edit.spec.ts`          | 5-6   | Edit name, sobriety date, log slip-up                  |
| `profile/relationships.spec.ts` | 6-8   | Invite codes, connect sponsor/sponsee                  |
| `settings/preferences.spec.ts`  | 4-5   | Theme toggle, notifications, logout                    |

**Smoke Test Suite:** ~5 tests for quick PR feedback (<2 min)

## Playwright Configuration

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['blob'], ['github']] : [['html', { open: 'never' }]],

  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/primary-state.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'pnpm web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## CI/CD Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4]
        shardTotal: [4]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.26.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium --with-deps

      - name: Start web server
        run: pnpm web &
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}

      - name: Wait for server
        run: npx wait-on http://localhost:8081 --timeout 60000

      - name: Run E2E tests (shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
        run: pnpm test:e2e --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        env:
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload blob report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: e2e/blob-report/
          retention-days: 1

  merge-reports:
    if: always()
    needs: e2e
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          pattern: blob-report-*
          path: all-blob-reports
          merge-multiple: true

      - name: Merge reports
        run: pnpm exec playwright merge-reports --reporter html ./all-blob-reports

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## Required Secrets

| Secret                  | Description                       |
| ----------------------- | --------------------------------- |
| `E2E_SUPABASE_URL`      | Staging Supabase project URL      |
| `E2E_SUPABASE_ANON_KEY` | Staging anon key                  |
| `E2E_TEST_PASSWORD`     | Shared password for test accounts |

## SQL Seeding Script

```sql
-- e2e/fixtures/seed-test-data.sql

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
```

## Page Object Model

```typescript
// e2e/pages/base.page.ts
export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToast(message: string) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}

// e2e/pages/login.page.ts
export class LoginPage extends BasePage {
  readonly emailInput = this.page.getByTestId('login-email-input');
  readonly passwordInput = this.page.getByTestId('login-password-input');
  readonly loginButton = this.page.getByTestId('login-submit-button');
  readonly signupLink = this.page.getByTestId('login-signup-link');
  readonly googleButton = this.page.getByTestId('login-google-button');
  readonly errorMessage = this.page.getByTestId('login-error-message');

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

## Package.json Scripts

```json
{
  "scripts": {
    "test:e2e": "playwright test --project=chromium",
    "test:e2e:all": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## TestID Naming Convention

Format: `{screen}-{element}` or `{component}-{element}`

Examples:

- `login-email-input`
- `login-submit-button`
- `profile-edit-button`
- `task-card-title`
- `onboarding-next-button`

## Implementation Requirements

1. **Install Playwright:** `pnpm add -D @playwright/test`
2. **Add testID attributes:** ~50-100 across app components
3. **Create staging Supabase project** for E2E tests
4. **Set up GitHub secrets** for CI
5. **Seed test data** using SQL script

## Future Enhancements

- Visual regression testing with Playwright snapshots
- Mobile viewport testing
- Accessibility testing with `@axe-core/playwright`
- Performance metrics collection
