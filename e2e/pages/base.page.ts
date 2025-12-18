import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async expectToast(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 10_000 });
  }

  async expectNoErrors(): Promise<void> {
    const errorMessages = this.page.locator('[data-testid*="error"]');
    await expect(errorMessages).toHaveCount(0);
  }
}
