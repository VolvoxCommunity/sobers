import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Settings Features', () => {
  test.beforeEach(async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.openSettings();
  });

  test('should display feature toggles', async ({ page }) => {
    const programToggle = page.getByTestId('settings-twelve-step-toggle');
    const savingsToggle = page.getByTestId('settings-show-savings-toggle');

    await expect(programToggle).toBeVisible();
    await expect(programToggle).toContainText(/ON|OFF/);
    await expect(savingsToggle).toBeVisible();
    await expect(savingsToggle).toContainText(/ON|OFF/);
  });

  test('should open and close whats new sheet', async ({ page }) => {
    await page.getByTestId('settings-whats-new-row').click();
    await expect(page.getByTestId('whats-new-close-button')).toBeVisible();
    await page.getByTestId('whats-new-close-button').click();
    await expect(page.getByTestId('whats-new-close-button')).not.toBeVisible({ timeout: 5000 });
  });
});
