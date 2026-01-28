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
    const closeButton = page.getByTestId('whats-new-close-button');
    const emptyStateToast = page
      .getByTestId('toast-message')
      .filter({ hasText: "You're all caught up! No new updates." });

    const hasSheet = await closeButton
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (hasSheet) {
      await closeButton.click();
      await expect(closeButton).not.toBeVisible({ timeout: 5000 });
    } else {
      await expect(emptyStateToast).toBeVisible();
    }
  });
});
