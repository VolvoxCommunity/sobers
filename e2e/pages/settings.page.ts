import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SettingsPage extends BasePage {
  readonly themeToggle: Locator;
  readonly notificationsToggle: Locator;
  readonly logoutButton: Locator;
  readonly deleteAccountButton: Locator;
  readonly versionText: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.themeToggle = page.getByTestId('settings-theme-toggle');
    this.notificationsToggle = page.getByTestId('settings-notifications-toggle');
    this.logoutButton = page.getByTestId('settings-logout-button');
    this.deleteAccountButton = page.getByTestId('settings-delete-account-button');
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

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
