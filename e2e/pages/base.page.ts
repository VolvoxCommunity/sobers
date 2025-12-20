import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToast(message: string): Promise<void> {
    // Use the toast testID to target the visible toast container,
    // then verify it contains the expected message text
    const toast = this.page.getByTestId('toast-message').filter({ hasText: message });
    await expect(toast).toBeVisible({ timeout: 10_000 });
  }

  async expectNoErrors(): Promise<void> {
    const errorMessages = this.page.locator('[data-testid*="error"]');
    await expect(errorMessages).toHaveCount(0);
  }
}
