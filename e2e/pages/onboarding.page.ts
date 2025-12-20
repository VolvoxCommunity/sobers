import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardingPage extends BasePage {
  readonly displayNameInput: Locator;
  readonly sobrietyDateInput: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;
  readonly backButton: Locator;
  readonly progressIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.displayNameInput = page.getByTestId('onboarding-display-name-input');
    this.sobrietyDateInput = page.getByTestId('onboarding-sobriety-date-input');
    this.nextButton = page.getByTestId('onboarding-next-button');
    this.skipButton = page.getByTestId('onboarding-skip-button');
    this.backButton = page.getByTestId('onboarding-back-button');
    this.progressIndicator = page.getByTestId('onboarding-progress');
  }

  async goto(): Promise<void> {
    await this.page.goto('/onboarding');
    await this.waitForPageLoad();
  }

  async fillDisplayName(name: string): Promise<void> {
    await this.displayNameInput.fill(name);
  }

  async selectSobrietyDate(date: string): Promise<void> {
    await this.sobrietyDateInput.click();
    await this.sobrietyDateInput.fill(date);
  }

  async next(): Promise<void> {
    await this.nextButton.click();
  }

  async skip(): Promise<void> {
    await this.skipButton.click();
  }

  async expectOnOnboardingPage(): Promise<void> {
    await expect(this.page).toHaveURL(/.*onboarding/);
  }

  async completeOnboarding(displayName: string, sobrietyDate: string): Promise<void> {
    await this.fillDisplayName(displayName);
    await this.next();
    await this.selectSobrietyDate(sobrietyDate);
    await this.next();
  }
}
