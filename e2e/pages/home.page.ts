import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class HomePage extends BasePage {
  readonly daysSoberCount: Locator;
  readonly daysSoberLabel: Locator;
  readonly tasksSection: Locator;
  readonly viewTasksButton: Locator;
  readonly quickActionButtons: Locator;
  readonly milestonesPreview: Locator;
  readonly manageTasksQuickAction: Locator;
  readonly moneySavedCard: Locator;
  readonly moneySavedTotal: Locator;
  readonly breakdownDay: Locator;
  readonly breakdownWeek: Locator;
  readonly breakdownMonth: Locator;

  constructor(page: Page) {
    super(page);
    this.daysSoberCount = page.getByTestId('home-days-sober-count');
    this.daysSoberLabel = page.getByTestId('home-days-sober-label');
    this.tasksSection = page.getByTestId('home-tasks-section');
    this.viewTasksButton = page.getByTestId('home-view-tasks-button');
    this.quickActionButtons = page.getByTestId('home-quick-actions');
    this.milestonesPreview = page.getByTestId('home-milestones-preview');
    // Quick action for navigating to tasks (always visible)
    this.manageTasksQuickAction = page.getByRole('button', {
      name: /manage tasks/i,
    });
    // Money saved card (only visible when user has spending data)
    this.moneySavedCard = page.getByTestId('money-saved-card');
    this.moneySavedTotal = page.getByTestId('money-saved-total');
    this.breakdownDay = page.getByTestId('breakdown-day');
    this.breakdownWeek = page.getByTestId('breakdown-week');
    this.breakdownMonth = page.getByTestId('breakdown-month');
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

  /**
   * Navigate to tasks page using the view tasks button if available,
   * otherwise use the quick action which is always visible.
   */
  async navigateToTasks(): Promise<void> {
    // Try the view tasks button first (only visible when tasks exist)
    const viewTasksVisible = await this.viewTasksButton.isVisible().catch(() => false);
    if (viewTasksVisible) {
      await this.viewTasksButton.click();
    } else {
      // Fall back to the quick action which is always available
      await this.manageTasksQuickAction.click();
    }
  }

  /**
   * Check if there are any assigned tasks displayed on the home page.
   */
  async hasAssignedTasks(): Promise<boolean> {
    return this.tasksSection.isVisible().catch(() => false);
  }

  /**
   * Check if the money saved card is visible on the home page.
   * Only visible when user has spending data configured.
   */
  async hasMoneySavedCard(): Promise<boolean> {
    return this.moneySavedCard.isVisible().catch(() => false);
  }

  /**
   * Get the total money saved amount displayed on the card.
   *
   * @returns The formatted currency string (e.g., "$1,234.56")
   */
  async getMoneySavedTotal(): Promise<string> {
    return (await this.moneySavedTotal.textContent()) ?? '';
  }

  /**
   * Open the edit savings sheet by clicking on the money saved card.
   */
  async openEditSavingsSheet(): Promise<void> {
    await this.moneySavedCard.click();
  }
}
