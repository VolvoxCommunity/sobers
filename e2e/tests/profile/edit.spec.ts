import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Profile Edit', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  // Skipped: requires profile-edit-name-button testID to be added to ProfileContent
  test.skip('should open edit display name sheet', async () => {
    await profilePage.openEditDisplayName();
  });

  // Skipped: requires profile-edit-name-button testID to be added to ProfileContent
  test.skip('should update display name', async () => {
    await profilePage.openEditDisplayName();
  });

  test('should display log slip-up button', async () => {
    await expect(profilePage.logSlipUpButton).toBeVisible();
  });

  test('should display edit sobriety date button', async () => {
    await expect(profilePage.editSobrietyDateButton).toBeVisible();
  });
});
