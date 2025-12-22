import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the Edit Savings Sheet component.
 *
 * This sheet allows users to modify their savings tracking settings
 * including spending amount, frequency, and clearing all tracking data.
 */
export class EditSavingsSheet extends BasePage {
  readonly amountInput: Locator;
  readonly saveButton: Locator;
  readonly clearButton: Locator;
  readonly frequencyDaily: Locator;
  readonly frequencyWeekly: Locator;
  readonly frequencyMonthly: Locator;
  readonly frequencyYearly: Locator;

  constructor(page: Page) {
    super(page);
    this.amountInput = page.getByTestId('edit-savings-amount-input');
    this.saveButton = page.getByTestId('edit-savings-save-button');
    this.clearButton = page.getByTestId('edit-savings-clear-button');
    this.frequencyDaily = page.getByTestId('edit-frequency-daily');
    this.frequencyWeekly = page.getByTestId('edit-frequency-weekly');
    this.frequencyMonthly = page.getByTestId('edit-frequency-monthly');
    this.frequencyYearly = page.getByTestId('edit-frequency-yearly');
  }

  /**
   * Fill the spending amount input field.
   *
   * @param amount - The amount to enter
   */
  async fillAmount(amount: string): Promise<void> {
    await this.amountInput.fill(amount);
  }

  /**
   * Select a spending frequency.
   *
   * @param freq - The frequency to select (daily, weekly, monthly, yearly)
   */
  async selectFrequency(freq: 'daily' | 'weekly' | 'monthly' | 'yearly'): Promise<void> {
    const button = this.page.getByTestId(`edit-frequency-${freq}`);
    await button.click();
  }

  /**
   * Save the current changes.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Clear all tracking data (opens confirmation dialog).
   */
  async clearData(): Promise<void> {
    await this.clearButton.click();
  }
}
