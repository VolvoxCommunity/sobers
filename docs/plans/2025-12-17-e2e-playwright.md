# E2E Playwright Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive E2E tests using Playwright for web, covering all user flows with real Supabase authentication.

**Architecture:** Page Object Model pattern with centralized fixtures. Tests run against Expo web dev server with real Supabase staging backend. 4-shard parallelization in CI.

**Tech Stack:** Playwright, TypeScript, Supabase, GitHub Actions

---

## Phase 1: Infrastructure Setup

### Task 1: Install Playwright

**Files:**

- Modify: `package.json`

**Step 1: Install Playwright as dev dependency**

Run:

```bash
cd /Users/billchirico/Developer/Volvox/sobers/.worktrees/e2e-playwright
pnpm add -D @playwright/test
```

**Step 2: Install Chromium browser**

Run:

```bash
pnpm exec playwright install chromium
```

**Step 3: Add E2E scripts to package.json**

Add to `scripts` section in `package.json`:

```json
"test:e2e": "playwright test --project=chromium",
"test:e2e:all": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug"
```

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add Playwright for E2E testing"
```

---

### Task 2: Create E2E Directory Structure

**Files:**

- Create: `e2e/` directory structure

**Step 1: Create directory structure**

Run:

```bash
mkdir -p e2e/{fixtures,pages,tests/{auth,onboarding,home,steps,journey,tasks,profile,settings},utils,.auth}
touch e2e/.auth/.gitkeep
```

**Step 2: Add .auth to .gitignore**

Add to `.gitignore`:

```
# E2E auth state
e2e/.auth/
!e2e/.auth/.gitkeep
```

**Step 3: Commit**

```bash
git add e2e/.auth/.gitkeep .gitignore
git commit -m "chore(e2e): create directory structure"
```

---

### Task 3: Create Playwright Configuration

**Files:**

- Create: `e2e/playwright.config.ts`

**Step 1: Create Playwright config**

Create `e2e/playwright.config.ts`:

```typescript
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

**Step 2: Verify config is valid**

Run:

```bash
cd e2e && pnpm exec playwright test --list 2>&1 | head -5
```

Expected: Should show "Listing tests" or similar (no syntax errors)

**Step 3: Commit**

```bash
git add e2e/playwright.config.ts
git commit -m "chore(e2e): add Playwright configuration"
```

---

### Task 4: Create Test Data Fixtures

**Files:**

- Create: `e2e/fixtures/test-data.ts`

**Step 1: Create test data file**

Create `e2e/fixtures/test-data.ts`:

```typescript
export const TEST_USERS = {
  primary: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'e2e-primary@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'test-password-change-me',
    displayName: 'E2E Primary User',
    sobrietyDate: '2024-01-15',
  },
  sponsor: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'e2e-sponsor@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'test-password-change-me',
    displayName: 'E2E Sponsor User',
    sobrietyDate: '2020-06-01',
  },
  sponsee: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'e2e-sponsee@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'test-password-change-me',
    displayName: 'E2E Sponsee User',
    sobrietyDate: '2024-10-01',
  },
  onboarding: {
    email: 'e2e-onboarding@sobers-test.com',
    password: process.env.E2E_TEST_PASSWORD || 'test-password-change-me',
  },
} as const;

export const TEST_INVITE_CODES = {
  sponsor: 'SPONSOR123',
} as const;

export function generateSignupEmail(): string {
  return `e2e-signup-${Date.now()}@sobers-test.com`;
}
```

**Step 2: Commit**

```bash
git add e2e/fixtures/test-data.ts
git commit -m "chore(e2e): add test data fixtures"
```

---

### Task 5: Create Supabase Helpers

**Files:**

- Create: `e2e/utils/supabase-helpers.ts`

**Step 1: Create Supabase helpers**

Create `e2e/utils/supabase-helpers.ts`:

```typescript
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
```

**Step 2: Commit**

```bash
git add e2e/utils/supabase-helpers.ts
git commit -m "chore(e2e): add Supabase helper utilities"
```

---

### Task 6: Create Auth Setup

**Files:**

- Create: `e2e/auth.setup.ts`

**Step 1: Create auth setup file**

Create `e2e/auth.setup.ts`:

```typescript
import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';
import { resetTestData } from './utils/supabase-helpers';

const authFile = 'e2e/.auth/primary-state.json';

setup('authenticate', async ({ page }) => {
  // Reset test data before running tests
  await resetTestData();

  // Navigate to login page
  await page.goto('/login');

  // Fill login form
  await page.getByTestId('login-email-input').fill(TEST_USERS.primary.email);
  await page.getByTestId('login-password-input').fill(TEST_USERS.primary.password);
  await page.getByTestId('login-submit-button').click();

  // Wait for redirect to home page
  await expect(page).toHaveURL(/.*\/(app)?$/);

  // Save storage state
  await page.context().storageState({ path: authFile });
});
```

**Step 2: Commit**

```bash
git add e2e/auth.setup.ts
git commit -m "chore(e2e): add authentication setup"
```

---

### Task 7: Create SQL Seeding Script

**Files:**

- Create: `e2e/fixtures/seed-test-data.sql`

**Step 1: Create SQL seeding script**

Create `e2e/fixtures/seed-test-data.sql`:

```sql
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
```

**Step 2: Commit**

```bash
git add e2e/fixtures/seed-test-data.sql
git commit -m "chore(e2e): add SQL seeding script"
```

---

## Phase 2: Page Object Models

### Task 8: Create Base Page

**Files:**

- Create: `e2e/pages/base.page.ts`

**Step 1: Create base page class**

Create `e2e/pages/base.page.ts`:

```typescript
import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 10_000 });
  }

  async expectNoErrors(): Promise<void> {
    const errorMessages = this.page.locator('[data-testid*="error"]');
    await expect(errorMessages).toHaveCount(0);
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/base.page.ts
git commit -m "feat(e2e): add base page object"
```

---

### Task 9: Create Login Page Object

**Files:**

- Create: `e2e/pages/login.page.ts`

**Step 1: Create login page object**

Create `e2e/pages/login.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.signupLink = page.getByTestId('login-signup-link');
    this.googleButton = page.getByTestId('login-google-button');
    this.appleButton = page.getByTestId('login-apple-button');
    this.errorMessage = page.getByTestId('login-error-message');
    this.forgotPasswordLink = page.getByTestId('login-forgot-password-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/login.page.ts
git commit -m "feat(e2e): add login page object"
```

---

### Task 10: Create Signup Page Object

**Files:**

- Create: `e2e/pages/signup.page.ts`

**Step 1: Create signup page object**

Create `e2e/pages/signup.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly signupButton: Locator;
  readonly loginLink: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('signup-email-input');
    this.passwordInput = page.getByTestId('signup-password-input');
    this.confirmPasswordInput = page.getByTestId('signup-confirm-password-input');
    this.signupButton = page.getByTestId('signup-submit-button');
    this.loginLink = page.getByTestId('signup-login-link');
    this.googleButton = page.getByTestId('signup-google-button');
    this.appleButton = page.getByTestId('signup-apple-button');
    this.errorMessage = page.getByTestId('signup-error-message');
    this.emailError = page.getByTestId('signup-email-error');
    this.passwordError = page.getByTestId('signup-password-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
    await this.waitForPageLoad();
  }

  async signup(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (this.confirmPasswordInput) {
      await this.confirmPasswordInput.fill(confirmPassword ?? password);
    }
    await this.signupButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectEmailError(message: string): Promise<void> {
    await expect(this.emailError).toContainText(message);
  }

  async expectPasswordError(message: string): Promise<void> {
    await expect(this.passwordError).toContainText(message);
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/signup.page.ts
git commit -m "feat(e2e): add signup page object"
```

---

### Task 11: Create Onboarding Page Object

**Files:**

- Create: `e2e/pages/onboarding.page.ts`

**Step 1: Create onboarding page object**

Create `e2e/pages/onboarding.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardingPage extends BasePage {
  readonly displayNameInput: Locator;
  readonly sobrietyDateInput: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;
  readonly backButton: Locator;
  readonly progressIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.displayNameInput = page.getByTestId('onboarding-display-name-input');
    this.sobrietyDateInput = page.getByTestId('onboarding-sobriety-date-input');
    this.nextButton = page.getByTestId('onboarding-next-button');
    this.skipButton = page.getByTestId('onboarding-skip-button');
    this.backButton = page.getByTestId('onboarding-back-button');
    this.progressIndicator = page.getByTestId('onboarding-progress');
  }

  async goto(): Promise<void> {
    await this.page.goto('/onboarding');
    await this.waitForPageLoad();
  }

  async fillDisplayName(name: string): Promise<void> {
    await this.displayNameInput.fill(name);
  }

  async selectSobrietyDate(date: string): Promise<void> {
    await this.sobrietyDateInput.click();
    await this.sobrietyDateInput.fill(date);
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async skip(): Promise<void> {
    await this.skipButton.click();
  }

  async expectOnOnboardingPage(): Promise<void> {
    await expect(this.page).toHaveURL(/.*onboarding/);
  }

  async completeOnboarding(displayName: string, sobrietyDate: string): Promise<void> {
    await this.fillDisplayName(displayName);
    await this.next();
    await this.selectSobrietyDate(sobrietyDate);
    await this.next();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/onboarding.page.ts
git commit -m "feat(e2e): add onboarding page object"
```

---

### Task 12: Create Home Page Object

**Files:**

- Create: `e2e/pages/home.page.ts`

**Step 1: Create home page object**

Create `e2e/pages/home.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly daysSoberCount: Locator;
  readonly daysSoberLabel: Locator;
  readonly tasksSection: Locator;
  readonly viewTasksButton: Locator;
  readonly quickActionButtons: Locator;
  readonly milestonesPreview: Locator;

  constructor(page: Page) {
    super(page);
    this.daysSoberCount = page.getByTestId('home-days-sober-count');
    this.daysSoberLabel = page.getByTestId('home-days-sober-label');
    this.tasksSection = page.getByTestId('home-tasks-section');
    this.viewTasksButton = page.getByTestId('home-view-tasks-button');
    this.quickActionButtons = page.getByTestId('home-quick-actions');
    this.milestonesPreview = page.getByTestId('home-milestones-preview');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async expectOnHomePage(): Promise<void> {
    await expect(this.daysSoberCount).toBeVisible();
  }

  async getDaysSober(): Promise<number> {
    const text = await this.daysSoberCount.textContent();
    return parseInt(text || '0', 10);
  }

  async navigateToTasks(): Promise<void> {
    await this.viewTasksButton.click();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/home.page.ts
git commit -m "feat(e2e): add home page object"
```

---

### Task 13: Create Steps Page Object

**Files:**

- Create: `e2e/pages/steps.page.ts`

**Step 1: Create steps page object**

Create `e2e/pages/steps.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class StepsPage extends BasePage {
  readonly stepsList: Locator;
  readonly stepCards: Locator;

  constructor(page: Page) {
    super(page);
    this.stepsList = page.getByTestId('steps-list');
    this.stepCards = page.getByTestId(/^step-card-\d+$/);
  }

  async goto(): Promise<void> {
    await this.page.goto('/steps');
    await this.waitForPageLoad();
  }

  async expectOnStepsPage(): Promise<void> {
    await expect(this.stepsList).toBeVisible();
  }

  async getStepCount(): Promise<number> {
    return await this.stepCards.count();
  }

  async clickStep(stepNumber: number): Promise<void> {
    await this.page.getByTestId(`step-card-${stepNumber}`).click();
  }

  async expectStepCompleted(stepNumber: number): Promise<void> {
    const stepCard = this.page.getByTestId(`step-card-${stepNumber}`);
    await expect(stepCard.getByTestId('step-completed-icon')).toBeVisible();
  }
}

export class StepDetailPage extends BasePage {
  readonly stepTitle: Locator;
  readonly stepContent: Locator;
  readonly markCompleteButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.stepTitle = page.getByTestId('step-detail-title');
    this.stepContent = page.getByTestId('step-detail-content');
    this.markCompleteButton = page.getByTestId('step-detail-complete-button');
    this.backButton = page.getByTestId('step-detail-back-button');
  }

  async expectOnStepDetailPage(stepNumber: number): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/steps/${stepNumber}`));
    await expect(this.stepTitle).toBeVisible();
  }

  async markComplete(): Promise<void> {
    await this.markCompleteButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/steps.page.ts
git commit -m "feat(e2e): add steps page objects"
```

---

### Task 14: Create Journey Page Object

**Files:**

- Create: `e2e/pages/journey.page.ts`

**Step 1: Create journey page object**

Create `e2e/pages/journey.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class JourneyPage extends BasePage {
  readonly milestonesList: Locator;
  readonly earnedMilestones: Locator;
  readonly upcomingMilestones: Locator;
  readonly currentMilestoneProgress: Locator;

  constructor(page: Page) {
    super(page);
    this.milestonesList = page.getByTestId('journey-milestones-list');
    this.earnedMilestones = page.getByTestId(/^milestone-earned-/);
    this.upcomingMilestones = page.getByTestId(/^milestone-upcoming-/);
    this.currentMilestoneProgress = page.getByTestId('journey-current-progress');
  }

  async goto(): Promise<void> {
    await this.page.goto('/journey');
    await this.waitForPageLoad();
  }

  async expectOnJourneyPage(): Promise<void> {
    await expect(this.milestonesList).toBeVisible();
  }

  async getEarnedMilestoneCount(): Promise<number> {
    return await this.earnedMilestones.count();
  }

  async getUpcomingMilestoneCount(): Promise<number> {
    return await this.upcomingMilestones.count();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/journey.page.ts
git commit -m "feat(e2e): add journey page object"
```

---

### Task 15: Create Tasks Page Object

**Files:**

- Create: `e2e/pages/tasks.page.ts`

**Step 1: Create tasks page object**

Create `e2e/pages/tasks.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TasksPage extends BasePage {
  readonly tasksList: Locator;
  readonly taskCards: Locator;
  readonly filterAll: Locator;
  readonly filterDaily: Locator;
  readonly filterWeekly: Locator;
  readonly addTaskButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tasksList = page.getByTestId('tasks-list');
    this.taskCards = page.getByTestId(/^task-card-/);
    this.filterAll = page.getByTestId('tasks-filter-all');
    this.filterDaily = page.getByTestId('tasks-filter-daily');
    this.filterWeekly = page.getByTestId('tasks-filter-weekly');
    this.addTaskButton = page.getByTestId('tasks-add-button');
    this.emptyState = page.getByTestId('tasks-empty-state');
  }

  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.waitForPageLoad();
  }

  async expectOnTasksPage(): Promise<void> {
    await expect(this.tasksList).toBeVisible();
  }

  async getTaskCount(): Promise<number> {
    return await this.taskCards.count();
  }

  async clickTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`task-card-${taskId}`).click();
  }

  async completeTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`task-complete-${taskId}`).click();
  }

  async filterByFrequency(frequency: 'all' | 'daily' | 'weekly'): Promise<void> {
    switch (frequency) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'daily':
        await this.filterDaily.click();
        break;
      case 'weekly':
        await this.filterWeekly.click();
        break;
    }
  }

  async openAddTaskModal(): Promise<void> {
    await this.addTaskButton.click();
  }
}

export class ManageTasksPage extends BasePage {
  readonly tasksList: Locator;
  readonly createTaskButton: Locator;
  readonly taskTitleInput: Locator;
  readonly taskDescriptionInput: Locator;
  readonly taskFrequencySelect: Locator;
  readonly saveTaskButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteTaskButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tasksList = page.getByTestId('manage-tasks-list');
    this.createTaskButton = page.getByTestId('manage-tasks-create-button');
    this.taskTitleInput = page.getByTestId('task-form-title-input');
    this.taskDescriptionInput = page.getByTestId('task-form-description-input');
    this.taskFrequencySelect = page.getByTestId('task-form-frequency-select');
    this.saveTaskButton = page.getByTestId('task-form-save-button');
    this.cancelButton = page.getByTestId('task-form-cancel-button');
    this.deleteTaskButton = page.getByTestId('task-form-delete-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/manage-tasks');
    await this.waitForPageLoad();
  }

  async createTask(
    title: string,
    description: string,
    frequency: 'daily' | 'weekly'
  ): Promise<void> {
    await this.createTaskButton.click();
    await this.taskTitleInput.fill(title);
    await this.taskDescriptionInput.fill(description);
    await this.taskFrequencySelect.selectOption(frequency);
    await this.saveTaskButton.click();
  }

  async editTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`manage-task-edit-${taskId}`).click();
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.editTask(taskId);
    await this.deleteTaskButton.click();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/tasks.page.ts
git commit -m "feat(e2e): add tasks page objects"
```

---

### Task 16: Create Profile Page Object

**Files:**

- Create: `e2e/pages/profile.page.ts`

**Step 1: Create profile page object**

Create `e2e/pages/profile.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  readonly displayName: Locator;
  readonly sobrietyStats: Locator;
  readonly daysSober: Locator;
  readonly editDisplayNameButton: Locator;
  readonly editSobrietyDateButton: Locator;
  readonly logSlipUpButton: Locator;
  readonly inviteCodeSection: Locator;
  readonly myInviteCode: Locator;
  readonly copyInviteCodeButton: Locator;
  readonly enterInviteCodeButton: Locator;
  readonly relationshipsList: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.displayName = page.getByTestId('profile-display-name');
    this.sobrietyStats = page.getByTestId('profile-sobriety-stats');
    this.daysSober = page.getByTestId('profile-days-sober');
    this.editDisplayNameButton = page.getByTestId('profile-edit-name-button');
    this.editSobrietyDateButton = page.getByTestId('profile-edit-date-button');
    this.logSlipUpButton = page.getByTestId('profile-log-slip-up-button');
    this.inviteCodeSection = page.getByTestId('profile-invite-code-section');
    this.myInviteCode = page.getByTestId('profile-my-invite-code');
    this.copyInviteCodeButton = page.getByTestId('profile-copy-invite-code');
    this.enterInviteCodeButton = page.getByTestId('profile-enter-invite-code-button');
    this.relationshipsList = page.getByTestId('profile-relationships-list');
    this.settingsButton = page.getByTestId('profile-settings-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await this.waitForPageLoad();
  }

  async expectOnProfilePage(): Promise<void> {
    await expect(this.displayName).toBeVisible();
  }

  async getDisplayName(): Promise<string> {
    return (await this.displayName.textContent()) || '';
  }

  async getDaysSober(): Promise<number> {
    const text = await this.daysSober.textContent();
    return parseInt(text || '0', 10);
  }

  async openEditDisplayName(): Promise<void> {
    await this.editDisplayNameButton.click();
  }

  async openEditSobrietyDate(): Promise<void> {
    await this.editSobrietyDateButton.click();
  }

  async openLogSlipUp(): Promise<void> {
    await this.logSlipUpButton.click();
  }

  async openEnterInviteCode(): Promise<void> {
    await this.enterInviteCodeButton.click();
  }

  async getMyInviteCode(): Promise<string> {
    return (await this.myInviteCode.textContent()) || '';
  }

  async copyInviteCode(): Promise<void> {
    await this.copyInviteCodeButton.click();
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }
}

export class EditDisplayNameSheet extends BasePage {
  readonly displayNameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.displayNameInput = page.getByTestId('edit-name-input');
    this.saveButton = page.getByTestId('edit-name-save-button');
    this.cancelButton = page.getByTestId('edit-name-cancel-button');
  }

  async updateDisplayName(name: string): Promise<void> {
    await this.displayNameInput.clear();
    await this.displayNameInput.fill(name);
    await this.saveButton.click();
  }
}

export class EnterInviteCodeSheet extends BasePage {
  readonly inviteCodeInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.inviteCodeInput = page.getByTestId('enter-invite-code-input');
    this.submitButton = page.getByTestId('enter-invite-code-submit-button');
    this.cancelButton = page.getByTestId('enter-invite-code-cancel-button');
    this.errorMessage = page.getByTestId('enter-invite-code-error');
  }

  async enterCode(code: string): Promise<void> {
    await this.inviteCodeInput.fill(code);
    await this.submitButton.click();
  }
}

export class LogSlipUpSheet extends BasePage {
  readonly dateInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dateInput = page.getByTestId('log-slip-up-date-input');
    this.confirmButton = page.getByTestId('log-slip-up-confirm-button');
    this.cancelButton = page.getByTestId('log-slip-up-cancel-button');
  }

  async logSlipUp(date: string): Promise<void> {
    await this.dateInput.fill(date);
    await this.confirmButton.click();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/profile.page.ts
git commit -m "feat(e2e): add profile page objects"
```

---

### Task 17: Create Settings Page Object

**Files:**

- Create: `e2e/pages/settings.page.ts`

**Step 1: Create settings page object**

Create `e2e/pages/settings.page.ts`:

```typescript
import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SettingsPage extends BasePage {
  readonly themeToggle: Locator;
  readonly notificationsToggle: Locator;
  readonly logoutButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly versionText: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.themeToggle = page.getByTestId('settings-theme-toggle');
    this.notificationsToggle = page.getByTestId('settings-notifications-toggle');
    this.logoutButton = page.getByTestId('settings-logout-button');
    this.deleteAccountButton = page.getByTestId('settings-delete-account-button');
    this.versionText = page.getByTestId('settings-version');
    this.backButton = page.getByTestId('settings-back-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForPageLoad();
  }

  async expectOnSettingsPage(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
  }

  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  async toggleNotifications(): Promise<void> {
    await this.notificationsToggle.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
```

**Step 2: Commit**

```bash
git add e2e/pages/settings.page.ts
git commit -m "feat(e2e): add settings page object"
```

---

### Task 18: Create Page Objects Index

**Files:**

- Create: `e2e/pages/index.ts`

**Step 1: Create index file**

Create `e2e/pages/index.ts`:

```typescript
export { BasePage } from './base.page';
export { LoginPage } from './login.page';
export { SignupPage } from './signup.page';
export { OnboardingPage } from './onboarding.page';
export { HomePage } from './home.page';
export { StepsPage, StepDetailPage } from './steps.page';
export { JourneyPage } from './journey.page';
export { TasksPage, ManageTasksPage } from './tasks.page';
export {
  ProfilePage,
  EditDisplayNameSheet,
  EnterInviteCodeSheet,
  LogSlipUpSheet,
} from './profile.page';
export { SettingsPage } from './settings.page';
```

**Step 2: Commit**

```bash
git add e2e/pages/index.ts
git commit -m "feat(e2e): add page objects index"
```

---

## Phase 3: Test Suites

### Task 19: Create Auth Login Tests

**Files:**

- Create: `e2e/tests/auth/login.spec.ts`

**Step 1: Create login test suite**

Create `e2e/tests/auth/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should show error for invalid email format', async () => {
    await loginPage.login('invalid-email', 'password123');
    await loginPage.expectError('Invalid email');
  });

  test('should show error for wrong credentials', async () => {
    await loginPage.login('wrong@email.com', 'wrongpassword');
    await loginPage.expectError('Invalid login credentials');
  });

  test('should show error for empty fields', async () => {
    await loginPage.loginButton.click();
    await loginPage.expectError('Email is required');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginPage.login(TEST_USERS.primary.email, TEST_USERS.primary.password);
    await expect(page).toHaveURL(/.*\/(app)?$/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await loginPage.signupLink.click();
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should show social login buttons', async () => {
    await expect(loginPage.googleButton).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add e2e/tests/auth/login.spec.ts
git commit -m "test(e2e): add login test suite"
```

---

### Task 20: Create Auth Signup Tests

**Files:**

- Create: `e2e/tests/auth/signup.spec.ts`

**Step 1: Create signup test suite**

Create `e2e/tests/auth/signup.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { SignupPage } from '../../pages';
import { generateSignupEmail } from '../../fixtures/test-data';
import { deleteTestUser, cleanupSignupUsers } from '../../utils/supabase-helpers';

test.describe('Signup', () => {
  let signupPage: SignupPage;

  test.beforeEach(async ({ page }) => {
    signupPage = new SignupPage(page);
    await signupPage.goto();
  });

  test.afterAll(async () => {
    await cleanupSignupUsers();
  });

  test('should display signup form', async () => {
    await expect(signupPage.emailInput).toBeVisible();
    await expect(signupPage.passwordInput).toBeVisible();
    await expect(signupPage.signupButton).toBeVisible();
  });

  test('should show error for invalid email format', async () => {
    await signupPage.signup('invalid-email', 'Password123!');
    await signupPage.expectEmailError('Invalid email');
  });

  test('should show error for weak password', async () => {
    await signupPage.signup('test@example.com', '123');
    await signupPage.expectPasswordError('Password must be at least');
  });

  test('should show error for password mismatch', async () => {
    await signupPage.signup('test@example.com', 'Password123!', 'DifferentPassword!');
    await signupPage.expectPasswordError('Passwords do not match');
  });

  test('should signup successfully and redirect to onboarding', async ({ page }) => {
    const email = generateSignupEmail();
    await signupPage.signup(email, 'TestPassword123!');
    await expect(page).toHaveURL(/.*onboarding/);
  });

  test('should show error for existing email', async () => {
    await signupPage.signup('e2e-primary@sobers-test.com', 'Password123!');
    await signupPage.expectError('already registered');
  });

  test('should navigate to login page', async ({ page }) => {
    await signupPage.loginLink.click();
    await expect(page).toHaveURL(/.*login/);
  });
});
```

**Step 2: Commit**

```bash
git add e2e/tests/auth/signup.spec.ts
git commit -m "test(e2e): add signup test suite"
```

---

### Task 21: Create Home Dashboard Tests

**Files:**

- Create: `e2e/tests/home/dashboard.spec.ts`

**Step 1: Create home dashboard test suite**

Create `e2e/tests/home/dashboard.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages';

test.describe('Home Dashboard', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display days sober count', async () => {
    await expect(homePage.daysSoberCount).toBeVisible();
    const days = await homePage.getDaysSober();
    expect(days).toBeGreaterThanOrEqual(0);
  });

  test('should display tasks section', async () => {
    await expect(homePage.tasksSection).toBeVisible();
  });

  test('should navigate to tasks page', async ({ page }) => {
    await homePage.navigateToTasks();
    await expect(page).toHaveURL(/.*tasks/);
  });

  test('should display quick action buttons', async () => {
    await expect(homePage.quickActionButtons).toBeVisible();
  });

  test('should display milestones preview', async () => {
    await expect(homePage.milestonesPreview).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add e2e/tests/home/dashboard.spec.ts
git commit -m "test(e2e): add home dashboard test suite"
```

---

### Task 22: Create Steps Tests

**Files:**

- Create: `e2e/tests/steps/list.spec.ts`
- Create: `e2e/tests/steps/detail.spec.ts`

**Step 1: Create steps list test suite**

Create `e2e/tests/steps/list.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { StepsPage } from '../../pages';

test.describe('Steps List', () => {
  let stepsPage: StepsPage;

  test.beforeEach(async ({ page }) => {
    stepsPage = new StepsPage(page);
    await stepsPage.goto();
  });

  test('should display all 12 steps', async () => {
    await stepsPage.expectOnStepsPage();
    const stepCount = await stepsPage.getStepCount();
    expect(stepCount).toBe(12);
  });

  test('should navigate to step detail on click', async ({ page }) => {
    await stepsPage.clickStep(1);
    await expect(page).toHaveURL(/.*steps\/1/);
  });

  test('should display step cards with titles', async ({ page }) => {
    const firstStep = page.getByTestId('step-card-1');
    await expect(firstStep).toBeVisible();
    await expect(firstStep).toContainText('Step 1');
  });
});
```

**Step 2: Create steps detail test suite**

Create `e2e/tests/steps/detail.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { StepsPage, StepDetailPage } from '../../pages';

test.describe('Step Detail', () => {
  let stepsPage: StepsPage;
  let stepDetailPage: StepDetailPage;

  test.beforeEach(async ({ page }) => {
    stepsPage = new StepsPage(page);
    stepDetailPage = new StepDetailPage(page);
    await stepsPage.goto();
    await stepsPage.clickStep(1);
  });

  test('should display step content', async () => {
    await stepDetailPage.expectOnStepDetailPage(1);
    await expect(stepDetailPage.stepTitle).toBeVisible();
    await expect(stepDetailPage.stepContent).toBeVisible();
  });

  test('should show mark complete button', async () => {
    await expect(stepDetailPage.markCompleteButton).toBeVisible();
  });

  test('should navigate back to steps list', async ({ page }) => {
    await stepDetailPage.goBack();
    await expect(page).toHaveURL(/.*steps$/);
  });

  test('should mark step as complete', async ({ page }) => {
    await stepDetailPage.markComplete();
    await stepDetailPage.expectToast('Step completed');
  });
});
```

**Step 3: Commit**

```bash
git add e2e/tests/steps/
git commit -m "test(e2e): add steps test suites"
```

---

### Task 23: Create Journey Tests

**Files:**

- Create: `e2e/tests/journey/milestones.spec.ts`

**Step 1: Create journey milestones test suite**

Create `e2e/tests/journey/milestones.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { JourneyPage } from '../../pages';

test.describe('Journey Milestones', () => {
  let journeyPage: JourneyPage;

  test.beforeEach(async ({ page }) => {
    journeyPage = new JourneyPage(page);
    await journeyPage.goto();
  });

  test('should display milestones list', async () => {
    await journeyPage.expectOnJourneyPage();
    await expect(journeyPage.milestonesList).toBeVisible();
  });

  test('should show earned milestones', async () => {
    const earnedCount = await journeyPage.getEarnedMilestoneCount();
    expect(earnedCount).toBeGreaterThan(0);
  });

  test('should show upcoming milestones', async () => {
    const upcomingCount = await journeyPage.getUpcomingMilestoneCount();
    expect(upcomingCount).toBeGreaterThanOrEqual(0);
  });

  test('should display current progress', async () => {
    await expect(journeyPage.currentMilestoneProgress).toBeVisible();
  });
});
```

**Step 2: Commit**

```bash
git add e2e/tests/journey/milestones.spec.ts
git commit -m "test(e2e): add journey milestones test suite"
```

---

### Task 24: Create Tasks Tests

**Files:**

- Create: `e2e/tests/tasks/view.spec.ts`
- Create: `e2e/tests/tasks/manage.spec.ts`

**Step 1: Create tasks view test suite**

Create `e2e/tests/tasks/view.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { TasksPage } from '../../pages';

test.describe('Tasks View', () => {
  let tasksPage: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    await tasksPage.goto();
  });

  test('should display tasks list', async () => {
    await tasksPage.expectOnTasksPage();
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('should filter tasks by frequency', async () => {
    await tasksPage.filterByFrequency('daily');
    // Verify filter is applied
    await expect(tasksPage.filterDaily).toHaveAttribute('data-selected', 'true');
  });

  test('should complete a task', async ({ page }) => {
    await tasksPage.completeTask('task-1111-1111-1111-111111111111');
    await tasksPage.expectToast('Task completed');
  });

  test('should show add task button', async () => {
    await expect(tasksPage.addTaskButton).toBeVisible();
  });
});
```

**Step 2: Create tasks manage test suite**

Create `e2e/tests/tasks/manage.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { ManageTasksPage } from '../../pages';

test.describe('Manage Tasks', () => {
  let manageTasksPage: ManageTasksPage;

  test.beforeEach(async ({ page }) => {
    manageTasksPage = new ManageTasksPage(page);
    await manageTasksPage.goto();
  });

  test('should display tasks list', async () => {
    await expect(manageTasksPage.tasksList).toBeVisible();
  });

  test('should show create task button', async () => {
    await expect(manageTasksPage.createTaskButton).toBeVisible();
  });

  test('should create a new task', async () => {
    await manageTasksPage.createTask('E2E Test Task', 'Task created during E2E testing', 'daily');
    await manageTasksPage.expectToast('Task created');
  });

  test('should open task edit form', async ({ page }) => {
    await manageTasksPage.editTask('task-1111-1111-1111-111111111111');
    await expect(manageTasksPage.taskTitleInput).toBeVisible();
  });

  test('should cancel task creation', async () => {
    await manageTasksPage.createTaskButton.click();
    await manageTasksPage.cancelButton.click();
    await expect(manageTasksPage.taskTitleInput).not.toBeVisible();
  });
});
```

**Step 3: Commit**

```bash
git add e2e/tests/tasks/
git commit -m "test(e2e): add tasks test suites"
```

---

### Task 25: Create Profile Tests

**Files:**

- Create: `e2e/tests/profile/view.spec.ts`
- Create: `e2e/tests/profile/edit.spec.ts`
- Create: `e2e/tests/profile/relationships.spec.ts`

**Step 1: Create profile view test suite**

Create `e2e/tests/profile/view.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Profile View', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test('should display profile information', async () => {
    await profilePage.expectOnProfilePage();
    const displayName = await profilePage.getDisplayName();
    expect(displayName).toBe(TEST_USERS.primary.displayName);
  });

  test('should display sobriety stats', async () => {
    await expect(profilePage.sobrietyStats).toBeVisible();
    const daysSober = await profilePage.getDaysSober();
    expect(daysSober).toBeGreaterThan(0);
  });

  test('should display invite code section', async () => {
    await expect(profilePage.inviteCodeSection).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await profilePage.openSettings();
    await expect(page).toHaveURL(/.*settings/);
  });
});
```

**Step 2: Create profile edit test suite**

Create `e2e/tests/profile/edit.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { ProfilePage, EditDisplayNameSheet } from '../../pages';

test.describe('Profile Edit', () => {
  let profilePage: ProfilePage;
  let editSheet: EditDisplayNameSheet;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    editSheet = new EditDisplayNameSheet(page);
    await profilePage.goto();
  });

  test('should open edit display name sheet', async () => {
    await profilePage.openEditDisplayName();
    await expect(editSheet.displayNameInput).toBeVisible();
  });

  test('should update display name', async () => {
    await profilePage.openEditDisplayName();
    await editSheet.updateDisplayName('Updated E2E User');
    await profilePage.expectToast('Name updated');

    const newName = await profilePage.getDisplayName();
    expect(newName).toBe('Updated E2E User');
  });

  test('should open log slip-up sheet', async ({ page }) => {
    await profilePage.openLogSlipUp();
    await expect(page.getByTestId('log-slip-up-confirm-button')).toBeVisible();
  });
});
```

**Step 3: Create profile relationships test suite**

Create `e2e/tests/profile/relationships.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { ProfilePage, EnterInviteCodeSheet } from '../../pages';
import { TEST_INVITE_CODES } from '../../fixtures/test-data';

test.describe('Profile Relationships', () => {
  let profilePage: ProfilePage;
  let enterCodeSheet: EnterInviteCodeSheet;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    enterCodeSheet = new EnterInviteCodeSheet(page);
    await profilePage.goto();
  });

  test('should display user invite code', async () => {
    await expect(profilePage.myInviteCode).toBeVisible();
    const code = await profilePage.getMyInviteCode();
    expect(code).toBeTruthy();
  });

  test('should copy invite code', async () => {
    await profilePage.copyInviteCode();
    await profilePage.expectToast('Copied');
  });

  test('should open enter invite code sheet', async () => {
    await profilePage.openEnterInviteCode();
    await expect(enterCodeSheet.inviteCodeInput).toBeVisible();
  });

  test('should show error for invalid invite code', async () => {
    await profilePage.openEnterInviteCode();
    await enterCodeSheet.enterCode('INVALID123');
    await expect(enterCodeSheet.errorMessage).toBeVisible();
  });

  test('should display relationships list', async () => {
    await expect(profilePage.relationshipsList).toBeVisible();
  });
});
```

**Step 4: Commit**

```bash
git add e2e/tests/profile/
git commit -m "test(e2e): add profile test suites"
```

---

### Task 26: Create Settings Tests

**Files:**

- Create: `e2e/tests/settings/preferences.spec.ts`

**Step 1: Create settings preferences test suite**

Create `e2e/tests/settings/preferences.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { SettingsPage, LoginPage } from '../../pages';

test.describe('Settings Preferences', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.goto();
  });

  test('should display settings options', async () => {
    await settingsPage.expectOnSettingsPage();
    await expect(settingsPage.themeToggle).toBeVisible();
    await expect(settingsPage.logoutButton).toBeVisible();
  });

  test('should toggle theme', async ({ page }) => {
    await settingsPage.toggleTheme();
    // Verify theme changed (check for dark mode class or attribute)
    await expect(page.locator('html')).toHaveAttribute('data-theme', /(dark|light)/);
  });

  test('should display app version', async () => {
    await expect(settingsPage.versionText).toBeVisible();
    const version = await settingsPage.versionText.textContent();
    expect(version).toMatch(/\d+\.\d+\.\d+/);
  });

  test('should logout and redirect to login', async ({ page }) => {
    await settingsPage.logout();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should navigate back from settings', async ({ page }) => {
    await settingsPage.goBack();
    await expect(page).not.toHaveURL(/.*settings/);
  });
});
```

**Step 2: Commit**

```bash
git add e2e/tests/settings/preferences.spec.ts
git commit -m "test(e2e): add settings test suite"
```

---

## Phase 4: CI/CD Integration

### Task 27: Create GitHub Actions Workflow

**Files:**

- Create: `.github/workflows/e2e-tests.yml`

**Step 1: Create CI workflow**

Create `.github/workflows/e2e-tests.yml`:

```yaml
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
        run: npx wait-on http://localhost:8081 --timeout 120000

      - name: Run E2E tests (shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
        run: pnpm test:e2e --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        env:
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
          E2E_SUPABASE_SERVICE_KEY: ${{ secrets.E2E_SUPABASE_SERVICE_KEY }}

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
        with:
          version: 10.26.0

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

**Step 2: Commit**

```bash
git add .github/workflows/e2e-tests.yml
git commit -m "ci(e2e): add GitHub Actions workflow with sharding"
```

---

## Phase 5: Add testID Attributes

### Task 28: Add testID to Login Screen

**Files:**

- Modify: `app/login.tsx`

**Step 1: Add testID attributes to login components**

Add `testID` props to the following elements in `app/login.tsx`:

- Email input: `testID="login-email-input"`
- Password input: `testID="login-password-input"`
- Login button: `testID="login-submit-button"`
- Signup link: `testID="login-signup-link"`
- Google button: `testID="login-google-button"`
- Apple button: `testID="login-apple-button"`
- Error message: `testID="login-error-message"`
- Forgot password link: `testID="login-forgot-password-link"`

**Step 2: Verify typecheck passes**

Run:

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/login.tsx
git commit -m "feat(e2e): add testID attributes to login screen"
```

---

### Task 29: Add testID to Signup Screen

**Files:**

- Modify: `app/signup.tsx`

**Step 1: Add testID attributes to signup components**

Add `testID` props to the following elements in `app/signup.tsx`:

- Email input: `testID="signup-email-input"`
- Password input: `testID="signup-password-input"`
- Confirm password input: `testID="signup-confirm-password-input"`
- Signup button: `testID="signup-submit-button"`
- Login link: `testID="signup-login-link"`
- Google button: `testID="signup-google-button"`
- Apple button: `testID="signup-apple-button"`
- Error message: `testID="signup-error-message"`
- Email error: `testID="signup-email-error"`
- Password error: `testID="signup-password-error"`

**Step 2: Verify typecheck passes**

Run:

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/signup.tsx
git commit -m "feat(e2e): add testID attributes to signup screen"
```

---

### Task 30: Add testID to Remaining Screens

**Files:**

- Modify: `app/onboarding.tsx`
- Modify: `app/(app)/(tabs)/index.tsx`
- Modify: `app/(app)/(tabs)/steps/index.tsx`
- Modify: `app/(app)/(tabs)/steps/[id].tsx`
- Modify: `app/(app)/(tabs)/journey.tsx`
- Modify: `app/(app)/(tabs)/tasks.tsx`
- Modify: `app/(app)/(tabs)/manage-tasks.tsx`
- Modify: `app/(app)/(tabs)/profile.tsx`
- Modify: `app/(app)/settings.tsx`

**Step 1: Add testID attributes to each screen**

Follow the pattern established in login/signup for each screen. Key elements need testID:

- Interactive elements (buttons, inputs, links)
- Display elements that tests need to verify (counters, labels)
- Container elements for lists
- Error messages

**Step 2: Verify typecheck passes**

Run:

```bash
pnpm typecheck
```

**Step 3: Run unit tests to ensure no regressions**

Run:

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add app/
git commit -m "feat(e2e): add testID attributes to all screens"
```

---

## Phase 6: Final Integration

### Task 31: Update CHANGELOG

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add E2E entries to CHANGELOG**

Add under `[Unreleased]` section:

```markdown
### Added

- E2E test suite using Playwright for web
- Page Object Model pattern for test maintainability
- GitHub Actions workflow with 4-shard parallelization
- SQL seeding script for test data
- testID attributes across all screens for E2E targeting
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with E2E test suite"
```

---

### Task 32: Run Full E2E Test Suite

**Step 1: Start web server**

Run:

```bash
pnpm web &
```

**Step 2: Run E2E tests**

Run:

```bash
pnpm test:e2e
```

**Step 3: Review results**

Expected: All tests should pass (or have known issues documented)

**Step 4: Fix any failing tests**

If tests fail, debug and fix before proceeding.

---

### Task 33: Create Pull Request

**Step 1: Push branch**

Run:

```bash
git push -u origin feat/e2e-playwright
```

**Step 2: Create PR**

Run:

```bash
gh pr create --title "feat(e2e): add comprehensive Playwright E2E test suite" --body "$(cat <<'EOF'
## Summary

- Add Playwright E2E test suite for web with ~65 tests covering all user flows
- Implement Page Object Model pattern for maintainability
- Set up GitHub Actions workflow with 4-shard parallelization
- Add testID attributes to all screens
- Create SQL seeding script for test data

## Test Plan

- [ ] Verify `pnpm test:e2e` runs successfully locally
- [ ] Verify CI workflow passes on this PR
- [ ] Manual verification of key flows still work in browser

## Related

Design document: docs/plans/2025-12-17-e2e-playwright-design.md
EOF
)"
```

---

## Verification Checklist

Before marking complete:

- [ ] All E2E tests pass locally
- [ ] CI workflow succeeds
- [ ] TypeCheck passes
- [ ] Lint passes
- [ ] Unit tests still pass
- [ ] CHANGELOG updated
- [ ] PR created and reviewed
