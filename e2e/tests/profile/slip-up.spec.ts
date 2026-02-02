import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Profile Slip Up', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test('should open and close slip-up sheet', async ({ page }) => {
    await profilePage.openLogSlipUp();

    await expect(page.getByText(/Recovery includes setbacks/i)).toBeVisible();
    await page.getByTestId('close-icon-button').click();
    await expect(page.getByText(/Recovery includes setbacks/i)).not.toBeVisible({ timeout: 5000 });
  });
});
