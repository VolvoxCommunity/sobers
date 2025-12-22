import { test, expect } from '@playwright/test';
import { ProfilePage, EnterInviteCodeSheet } from '../../pages';

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

  test('should open enter invite code sheet', async ({ page }) => {
    await profilePage.openEnterInviteCode();
    const inviteCodeSheet = new EnterInviteCodeSheet(page);
    await expect(inviteCodeSheet.inviteCodeInput).toBeVisible();
  });

  test('should require 8-character invite code', async ({ page }) => {
    await profilePage.openEnterInviteCode();
    const inviteCodeSheet = new EnterInviteCodeSheet(page);
    // Enter invalid (too short) code
    await inviteCodeSheet.inviteCodeInput.fill('ABC');
    // Check that character count shows 3/8
    await expect(page.getByText('3/8 characters')).toBeVisible();
    // Enter full 8-character code
    await inviteCodeSheet.inviteCodeInput.fill('ABCD1234');
    // Check that character count shows 8/8
    await expect(page.getByText('8/8 characters')).toBeVisible();
  });

  test('should cancel invite code entry', async ({ page }) => {
    await profilePage.openEnterInviteCode();
    const inviteCodeSheet = new EnterInviteCodeSheet(page);
    await expect(inviteCodeSheet.inviteCodeInput).toBeVisible();
    await inviteCodeSheet.cancelButton.click();
    // Sheet should close
    await expect(inviteCodeSheet.inviteCodeInput).not.toBeVisible({ timeout: 5000 });
  });
});
