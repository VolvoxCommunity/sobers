import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Profile Relationships', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
    await profilePage.goto();
  });

  test('should display sponsor invite code section', async () => {
    await expect(profilePage.sponsorInviteCodeSection).toBeVisible();
  });

  test('should display sponsee invite code section', async () => {
    await expect(profilePage.sponseeInviteCodeSection).toBeVisible();
  });

  test('should display generate invite code button', async () => {
    await expect(profilePage.generateInviteCodeButton).toBeVisible();
  });

  test('should display enter invite code button', async () => {
    await expect(profilePage.enterInviteCodeButton).toBeVisible();
  });

  // Skipped: requires profile-my-invite-code testID to be added
  test.skip('should display user invite code', async () => {
    await expect(profilePage.myInviteCode).toBeVisible();
  });

  // Skipped: requires profile-copy-invite-code testID to be added
  test.skip('should copy invite code', async () => {
    await profilePage.copyInviteCode();
    await profilePage.expectToast('Copied');
  });

  // Skipped: requires enter-invite-code-input testID in sheet
  test.skip('should open enter invite code sheet', async () => {
    await profilePage.openEnterInviteCode();
  });

  // Skipped: requires profile-relationships-list testID to be added
  test.skip('should display relationships list', async () => {
    await expect(profilePage.relationshipsList).toBeVisible();
  });
});
