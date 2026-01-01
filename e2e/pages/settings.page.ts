import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Settings page object.
 *
 * Available testIDs in the app (SettingsContent.tsx):
 * - settings-theme-toggle ✅ (line 727, wraps theme options)
 * - settings-logout-button ✅ (line 939)
 * - settings-delete-account-button ✅ (line 976)
 * - settings-journey-date-row ✅ (line 890, edit sobriety date)
 *
 * Missing testIDs (need to be added to SettingsContent.tsx):
 * - settings-notifications-toggle - no notifications toggle in current UI
 * - settings-version - app version display not currently exposed
 * - settings-back-button - navigation handled by Expo Router, not a custom button
 */
export class SettingsPage extends BasePage {
  // Available locators (existing testIDs)
  readonly themeToggle: Locator;
  readonly logoutButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly editSobrietyDateButton: Locator;

  // Locators needing testIDs to be added to components
  readonly notificationsToggle: Locator;
  readonly versionText: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    // Existing testIDs
    this.themeToggle = page.getByTestId('settings-theme-toggle');
    this.logoutButton = page.getByTestId('settings-logout-button');
    this.deleteAccountButton = page.getByTestId('settings-delete-account-button');
    this.editSobrietyDateButton = page.getByTestId('settings-journey-date-row');

    // Missing testIDs - these locators will fail until testIDs are added to components
    this.notificationsToggle = page.getByTestId('settings-notifications-toggle');
    this.versionText = page.getByTestId('settings-version');
    this.backButton = page.getByTestId('settings-back-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForPageLoad();
  }

  async expectOnSettingsPage(): Promise<void> {
    await expect(this.logoutButton).toBeVisible();
  }

  async toggleTheme(): Promise<void> {
    await this.themeToggle.click();
  }

  async toggleNotifications(): Promise<void> {
    await this.notificationsToggle.click();
  }

  /**
   * Click the logout button and accept the confirmation dialog.
   * The app uses window.confirm on web which creates a native browser dialog.
   */
  async logout(): Promise<void> {
    // Set up dialog handler before clicking (window.confirm)
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.logoutButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
