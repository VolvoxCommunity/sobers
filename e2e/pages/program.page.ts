import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Program tab navigation.
 */
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

/**
 * Page object for Program placeholder screens.
 */
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

/**
 * Page object for the Program > Prayers tab.
 */
export class PrayersPage extends BasePage {
  readonly prayersList: Locator;
  readonly filterAll: Locator;
  readonly filterFavorites: Locator;
  readonly filterStep: Locator;
  readonly filterCommon: Locator;
  readonly prayerCards: Locator;

  constructor(page: Page) {
    super(page);
    this.prayersList = page.getByTestId('prayers-list');
    this.filterAll = page.getByTestId('filter-all');
    this.filterFavorites = page.getByTestId('filter-favorites');
    this.filterStep = page.getByTestId('filter-step');
    this.filterCommon = page.getByTestId('filter-common');
    this.prayerCards = page.getByTestId(/^prayer-card-/);
  }

  async goto(): Promise<void> {
    await this.page.goto('/program/prayers');
    await this.waitForPageLoad();
  }

  async expectOnPrayersPage(): Promise<void> {
    await expect(this.prayersList).toBeVisible();
  }

  async selectFilter(filter: 'all' | 'favorites' | 'step' | 'common'): Promise<void> {
    await this.page.getByTestId(`filter-${filter}`).click();
  }

  getPrayerCard(prayerId: string): Locator {
    return this.page.getByTestId(`prayer-card-${prayerId}`);
  }

  getFavoriteButton(prayerId: string): Locator {
    return this.page.getByTestId(`prayer-favorite-${prayerId}`);
  }
}

/**
 * Page object for the Program > Meetings tab.
 */
export class MeetingsPage extends BasePage {
  readonly meetingItems: Locator;

  constructor(page: Page) {
    super(page);
    this.meetingItems = page.getByTestId(/^meeting-item-/);
  }

  async goto(): Promise<void> {
    await this.page.goto('/program/meetings');
    await this.waitForPageLoad();
  }

  async expectOnMeetingsPage(): Promise<void> {
    const today = new Date().getDate();
    await expect(this.getCalendarDay(today)).toBeVisible();
  }

  getCalendarDay(day: number): Locator {
    return this.page.getByTestId(`calendar-day-${day}`);
  }

  getMeetingItem(meetingId: string): Locator {
    return this.page.getByTestId(`meeting-item-${meetingId}`);
  }
}

/**
 * Factory for Daily Readings placeholder page object.
 */
export const createDailyReadingsPage = (page: Page) => new PlaceholderPage(page, 'daily-readings');

/**
 * Factory for Literature placeholder page object.
 */
export const createLiteraturePage = (page: Page) => new PlaceholderPage(page, 'literature');
