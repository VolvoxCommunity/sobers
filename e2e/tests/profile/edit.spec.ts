import { test, expect } from '@playwright/test';
import { ProfilePage, EditDisplayNameSheet } from '../../pages';
import { SettingsPage } from '../../pages/settings.page';

test.describe('Profile Edit', () => {
  let profilePage: ProfilePage;
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    settingsPage = new SettingsPage(page);
    await profilePage.goto();
  });

  test('should open edit display name via settings', async ({ page }) => {
    // Open settings from profile
    await profilePage.openSettings();
    // Click account name row to open edit modal
    await page.getByTestId('account-name-row').click();
    // Verify edit modal is visible
    const editSheet = new EditDisplayNameSheet(page);
    await expect(editSheet.displayNameInput).toBeVisible();
  });

  test('should update display name', async ({ page }) => {
    // Open settings from profile
    await profilePage.openSettings();
    // Click account name row to open edit modal
    await page.getByTestId('account-name-row').click();
    // Update name
    const editSheet = new EditDisplayNameSheet(page);
    const newName = 'Test User Updated';
    await editSheet.updateDisplayName(newName);
    // Modal should close, verify name is updated
    await expect(editSheet.displayNameInput).not.toBeVisible({ timeout: 5000 });
  });

  test('should display log slip-up button', async () => {
    await expect(profilePage.logSlipUpButton).toBeVisible();
  });

  test('should display edit sobriety date button in settings', async () => {
    // Edit sobriety date was moved to settings
    await profilePage.openSettings();
    await expect(settingsPage.editSobrietyDateButton).toBeVisible();
  });
});
