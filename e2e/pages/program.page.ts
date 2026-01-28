import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProgramPage extends BasePage {
  readonly tabBar: Locator;
  readonly stepsTab: Locator;
  readonly dailyTab: Locator;
  readonly prayersTab: Locator;
  readonly literatureTab: Locator;
  readonly meetingsTab: Locator;

  constructor(page: Page) {
    super(page);
    this.tabBar = page.getByTestId('program-tab-bar');
    this.stepsTab = page.getByTestId('program-tab-steps');
    this.dailyTab = page.getByTestId('program-tab-daily');
    this.prayersTab = page.getByTestId('program-tab-prayers');
    this.literatureTab = page.getByTestId('program-tab-literature');
    this.meetingsTab = page.getByTestId('program-tab-meetings');
  }

  async goto(): Promise<void> {
    await this.page.goto('/program');
    await this.waitForPageLoad();
  }

  async expectOnProgramPage(): Promise<void> {
    await expect(this.tabBar).toBeVisible();
  }

  async navigateToSteps(): Promise<void> {
    await this.stepsTab.click();
  }

  async navigateToDaily(): Promise<void> {
    await this.dailyTab.click();
  }

  async navigateToPrayers(): Promise<void> {
    await this.prayersTab.click();
  }

  async navigateToLiterature(): Promise<void> {
    await this.literatureTab.click();
  }

  async navigateToMeetings(): Promise<void> {
    await this.meetingsTab.click();
  }

  async navigateToTab(
    tabName: 'steps' | 'daily' | 'prayers' | 'literature' | 'meetings'
  ): Promise<void> {
    const tab = this.page.getByTestId(`program-tab-${tabName}`);
    await tab.click();
  }
}

export class PlaceholderPage extends BasePage {
  readonly screen: Locator;
  readonly title: Locator;
  readonly subtitle: Locator;

  constructor(page: Page, screenName: string) {
    super(page);
    this.screen = page.getByTestId(`${screenName}-screen`);
    this.title = page.getByTestId(`${screenName}-title`);
    this.subtitle = page.getByTestId(`${screenName}-subtitle`);
  }

  async expectOnPlaceholderScreen(): Promise<void> {
    await expect(this.screen).toBeVisible();
  }

  async getTitle(): Promise<string> {
    return (await this.title.textContent()) ?? '';
  }

  async getSubtitle(): Promise<string> {
    return (await this.subtitle.textContent()) ?? '';
  }

  async expectComingSoon(): Promise<void> {
    await expect(this.subtitle).toContainText('Coming soon');
  }
}

export const createDailyReadingsPage = (page: Page) => new PlaceholderPage(page, 'daily-readings');
export const createPrayersPage = (page: Page) => new PlaceholderPage(page, 'prayers');
export const createLiteraturePage = (page: Page) => new PlaceholderPage(page, 'literature');
export const createMeetingsPage = (page: Page) => new PlaceholderPage(page, 'meetings');
