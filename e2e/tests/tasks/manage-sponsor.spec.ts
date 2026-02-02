import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages';
import { TEST_USERS } from '../../fixtures/test-data';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Manage Tasks (Sponsor)', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(TEST_USERS.sponsor.email, TEST_USERS.sponsor.password);
    await expect(page).toHaveURL(/.*\/(app)?$/);

    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await page.getByText('Manage').click();
  });

  test('should show manage tasks list and create button', async ({ page }) => {
    await expect(page.getByTestId('manage-tasks-list')).toBeVisible();
    await expect(page.getByTestId('manage-tasks-create-button')).toBeVisible();
  });

  test('should open and close task creation sheet', async ({ page }) => {
    await page.getByTestId('manage-tasks-create-button').click();
    await expect(page.getByText('Assign New Task')).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).first().click();
    await expect(page.getByText('Assign New Task')).not.toBeVisible({ timeout: 5000 });
  });
});
