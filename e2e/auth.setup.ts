import { test as setup, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';
import { resetTestData, ensureTestUserExists } from './utils/supabase-helpers';

const authFile = 'e2e/.auth/primary-state.json';

setup('authenticate', async ({ page }) => {
  // Ensure test user exists in Supabase Auth
  await ensureTestUserExists(
    TEST_USERS.primary.id,
    TEST_USERS.primary.email,
    TEST_USERS.primary.password
  );

  // Reset test data before running tests
  await resetTestData();

  // Navigate to login page
  await page.goto('/login');

  // Wait for the submit button to be visible - this indicates the full form is rendered
  // and React hydration is complete. This is more reliable than waiting for individual
  // input elements which may briefly detach during hydration.
  const submitButton = page.getByTestId('login-submit-button');
  await submitButton.waitFor({ state: 'visible', timeout: 30000 });

  // Fill login form - elements should now be stable
  await page.getByTestId('login-email-input').fill(TEST_USERS.primary.email);
  await page.getByTestId('login-password-input').fill(TEST_USERS.primary.password);
  await submitButton.click();

  // Wait for redirect to home page
  // Add a longer timeout to ensure the authentication state is updated
  await expect(page).toHaveURL(/.*\/(app)?$/, { timeout: 10000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
