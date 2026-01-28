import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class StepsPage extends BasePage {
  readonly stepsList: Locator;
  readonly stepCards: Locator;

  constructor(page: Page) {
    super(page);
    this.stepsList = page.getByTestId('steps-list');
    this.stepCards = page.getByTestId(/^step-card-\d+$/);
  }

  async goto(): Promise<void> {
    await this.page.goto('/program/steps');
    await this.waitForPageLoad();
  }

  async expectOnStepsPage(): Promise<void> {
    await expect(this.stepsList).toBeVisible();
  }

  async getStepCount(): Promise<number> {
    return await this.stepCards.count();
  }

  async clickStep(stepNumber: number): Promise<void> {
    await this.page.getByTestId(`step-card-${stepNumber}`).click();
  }

  async expectStepCompleted(stepNumber: number): Promise<void> {
    const stepCard = this.page.getByTestId(`step-card-${stepNumber}`);
    await expect(stepCard.getByTestId('step-completed-icon')).toBeVisible();
  }
}

export class StepDetailPage extends BasePage {
  readonly stepTitle: Locator;
  readonly stepContent: Locator;
  readonly markCompleteButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    super(page);
    this.stepTitle = page.getByTestId('step-detail-title');
    this.stepContent = page.getByTestId('step-detail-content');
    this.markCompleteButton = page.getByTestId('step-detail-complete-button');
    this.backButton = page.getByTestId('step-detail-back-button');
  }

  async expectOnStepDetailPage(): Promise<void> {
    // Steps use UUID-based URLs, not numeric step numbers
    await expect(this.page).toHaveURL(/\/program\/steps\/[a-f0-9-]+$/);
    await expect(this.stepTitle).toBeVisible();
  }

  async markComplete(): Promise<void> {
    await this.markCompleteButton.click();
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
  }
}
