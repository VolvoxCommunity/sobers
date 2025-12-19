import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../pages';

test.describe('Settings Preferences', () => {
  let settingsPage: SettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    await settingsPage.goto();
  });

  test('should display settings options', async () => {
    await settingsPage.expectOnSettingsPage();
    await expect(settingsPage.themeToggle).toBeVisible();
    await expect(settingsPage.logoutButton).toBeVisible();
  });

  // The theme toggle in settings is a visual control that opens an options list,
  // not a simple toggle. This test needs to be redesigned for the actual UI.
  test.skip('should toggle theme', async ({ page }) => {
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await settingsPage.toggleTheme();
    const newTheme = await html.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });

  // Skipped: requires settings-version testID to be added
  test.skip('should display app version', async () => {
    await expect(settingsPage.versionText).toBeVisible();
  });

  test('should logout and redirect to login', async ({ page }) => {
    await settingsPage.logout();
    await expect(page).toHaveURL(/.*login/);
  });

  // Skipped: requires settings-back-button testID (navigation handled by Expo Router)
  test.skip('should navigate back from settings', async ({ page }) => {
    await settingsPage.goBack();
    await expect(page).not.toHaveURL(/.*settings/);
  });

  test('should display delete account button', async () => {
    await expect(settingsPage.deleteAccountButton).toBeVisible();
  });
});
