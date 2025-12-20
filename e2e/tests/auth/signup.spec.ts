import { test, expect } from '@playwright/test';
import { SignupPage } from '../../pages';
import { generateSignupEmail } from '../../fixtures/test-data';
import { cleanupSignupUsers } from '../../utils/supabase-helpers';

// Signup tests must run without authentication
test.use({ storageState: { cookies: [], origins: [] } });

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
    // Email validation is handled by Supabase - expect backend error
    await signupPage.expectError('invalid');
  });

  test('should show error for weak password', async () => {
    await signupPage.signup('test@example.com', '123');
    // Password validation shows toast for requirements not met
    await signupPage.expectError('Password must be at least');
  });

  test('should show error for password mismatch', async () => {
    await signupPage.signup('test@example.com', 'Password123!', 'DifferentPassword!');
    // Password mismatch shows toast
    await signupPage.expectError('Passwords do not match');
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
