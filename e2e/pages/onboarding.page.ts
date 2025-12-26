import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class OnboardingPage extends BasePage {
  readonly displayNameInput: Locator;
  readonly sobrietyDateInput: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;
  readonly backButton: Locator;
  readonly progressIndicator: Locator;
  // Savings tracking locators
  readonly savingsToggle: Locator;
  readonly savingsAmountInput: Locator;
  readonly frequencyDaily: Locator;
  readonly frequencyWeekly: Locator;
  readonly frequencyMonthly: Locator;
  readonly frequencyYearly: Locator;

  constructor(page: Page) {
    super(page);
    this.displayNameInput = page.getByTestId('onboarding-display-name-input');
    this.sobrietyDateInput = page.getByTestId('onboarding-sobriety-date-input');
    this.nextButton = page.getByTestId('onboarding-next-button');
    this.skipButton = page.getByTestId('onboarding-skip-button');
    this.backButton = page.getByTestId('onboarding-back-button');
    this.progressIndicator = page.getByTestId('onboarding-progress');
    // Savings tracking inputs
    this.savingsToggle = page.getByTestId('savings-toggle');
    this.savingsAmountInput = page.getByTestId('savings-amount-input');
    this.frequencyDaily = page.getByTestId('frequency-daily');
    this.frequencyWeekly = page.getByTestId('frequency-weekly');
    this.frequencyMonthly = page.getByTestId('frequency-monthly');
    this.frequencyYearly = page.getByTestId('frequency-yearly');
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

  /**
   * Enable savings tracking by clicking the toggle.
   */
  async enableSavingsTracking(): Promise<void> {
    await this.savingsToggle.click();
  }

  /**
   * Fill the spending amount input field.
   *
   * @param amount - The spending amount to enter
   */
  async fillSpendingAmount(amount: string): Promise<void> {
    await this.savingsAmountInput.fill(amount);
  }

  /**
   * Select a spending frequency.
   *
   * @param freq - The frequency to select (daily, weekly, monthly, yearly)
   */
  async selectFrequency(freq: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    const button = this.page.getByTestId(`frequency-${freq}`);
    await button.click();
  }

  /**
   * Complete onboarding with savings tracking enabled.
   *
   * @param displayName - User's display name
   * @param sobrietyDate - Sobriety start date
   * @param spendingAmount - Historical spending amount
   * @param frequency - Spending frequency
   */
  async completeOnboardingWithSavings(
    displayName: string,
    sobrietyDate: string,
    spendingAmount: string,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<void> {
    await this.fillDisplayName(displayName);
    await this.enableSavingsTracking();
    await this.fillSpendingAmount(spendingAmount);
    await this.selectFrequency(frequency);
    await this.next();
    await this.selectSobrietyDate(sobrietyDate);
    await this.next();
  }
}
