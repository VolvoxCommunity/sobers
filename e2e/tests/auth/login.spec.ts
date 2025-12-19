import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';
import { TEST_USERS } from '../../fixtures/test-data';

// Login tests must run without authentication
test.use({ storageState: { cookies: [], origins: [] } });

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
