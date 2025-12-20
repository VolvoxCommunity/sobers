import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class JourneyPage extends BasePage {
  readonly milestonesList: Locator;
  readonly earnedMilestones: Locator;
  readonly upcomingMilestones: Locator;
  readonly currentMilestoneProgress: Locator;

  constructor(page: Page) {
    super(page);
    this.milestonesList = page.getByTestId('journey-milestones-list');
    this.earnedMilestones = page.getByTestId(/^milestone-earned-/);
    this.upcomingMilestones = page.getByTestId(/^milestone-upcoming-/);
    this.currentMilestoneProgress = page.getByTestId('journey-current-progress');
  }

  async goto(): Promise<void> {
    await this.page.goto('/journey');
    await this.waitForPageLoad();
  }

  async expectOnJourneyPage(): Promise<void> {
    await expect(this.milestonesList).toBeVisible();
  }

  async getEarnedMilestoneCount(): Promise<number> {
    return await this.earnedMilestones.count();
  }

  async getUpcomingMilestoneCount(): Promise<number> {
    return await this.upcomingMilestones.count();
  }
}
