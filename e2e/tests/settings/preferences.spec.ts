import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages';

test.describe('Settings Preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Settings is accessed via Profile page
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.openSettings();
  });

  test('should display settings options', async ({ page }) => {
    await expect(page.getByTestId('settings-theme-toggle')).toBeVisible();
    await expect(page.getByTestId('settings-logout-button')).toBeVisible();
  });

  test('should display theme options', async ({ page }) => {
    // Theme toggle container should have Light, Dark, System options
    await expect(page.getByText('Light')).toBeVisible();
    await expect(page.getByText('Dark')).toBeVisible();
    await expect(page.getByText('System')).toBeVisible();
  });

  test('should display app version', async ({ page }) => {
    await expect(page.getByTestId('settings-version')).toBeVisible();
  });

  test('should display logout button', async ({ page }) => {
    // Logout button should be visible with Sign Out text
    const logoutButton = page.getByTestId('settings-logout-button');
    await expect(logoutButton).toBeVisible();
    await expect(page.getByText('Sign Out')).toBeVisible();
  });

  test('should close settings sheet', async ({ page }) => {
    await page.getByTestId('settings-back-button').click();
    // Sheet should close, theme toggle should not be visible
    await expect(page.getByTestId('settings-theme-toggle')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display delete account button in danger zone', async ({ page }) => {
    // Expand danger zone
    await page.getByText('DANGER ZONE').click();
    await expect(page.getByTestId('settings-delete-account-button')).toBeVisible();
  });
});
