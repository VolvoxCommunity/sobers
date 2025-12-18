import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly daysSoberCount: Locator;
  readonly daysSoberLabel: Locator;
  readonly tasksSection: Locator;
  readonly viewTasksButton: Locator;
  readonly quickActionButtons: Locator;
  readonly milestonesPreview: Locator;

  constructor(page: Page) {
    super(page);
    this.daysSoberCount = page.getByTestId('home-days-sober-count');
    this.daysSoberLabel = page.getByTestId('home-days-sober-label');
    this.tasksSection = page.getByTestId('home-tasks-section');
    this.viewTasksButton = page.getByTestId('home-view-tasks-button');
    this.quickActionButtons = page.getByTestId('home-quick-actions');
    this.milestonesPreview = page.getByTestId('home-milestones-preview');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async expectOnHomePage(): Promise<void> {
    await expect(this.daysSoberCount).toBeVisible();
  }

  async getDaysSober(): Promise<number> {
    const text = await this.daysSoberCount.textContent();
    return parseInt(text || '0', 10);
  }

  async navigateToTasks(): Promise<void> {
    await this.viewTasksButton.click();
  }
}
