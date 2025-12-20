import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Profile View', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test('should display sobriety stats section', async () => {
    await profilePage.expectOnProfilePage();
    await expect(profilePage.sobrietyStats).toBeVisible();
  });

  test('should display days sober count', async () => {
    const daysSober = await profilePage.getDaysSober();
    expect(daysSober).toBeGreaterThanOrEqual(0);
  });

  test('should display invite code sections', async () => {
    // Sponsor section (Generate Invite Code)
    await expect(profilePage.sponsorInviteCodeSection).toBeVisible();
    // Sponsee section (Enter Invite Code)
    await expect(profilePage.sponseeInviteCodeSection).toBeVisible();
  });

  // Skipped: requires profile-settings-button testID to be added to ProfileContent
  test.skip('should navigate to settings', async ({ page }) => {
    await profilePage.openSettings();
    await expect(page).toHaveURL(/.*settings/);
  });
});
