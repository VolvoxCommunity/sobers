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

  test('should open settings sheet', async ({ page }) => {
    // Settings is a bottom sheet, not a separate route
    await profilePage.openSettings();
    // Verify settings sheet is visible by checking for theme toggle
    await expect(page.getByTestId('settings-theme-toggle')).toBeVisible();
  });

  test('should display display name', async () => {
    await expect(profilePage.displayName).toBeVisible();
  });
});
