import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class SignupPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly signupButton: Locator;
  readonly loginLink: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('signup-email-input');
    this.passwordInput = page.getByTestId('signup-password-input');
    this.confirmPasswordInput = page.getByTestId('signup-confirm-password-input');
    this.signupButton = page.getByTestId('signup-submit-button');
    this.loginLink = page.getByTestId('signup-login-link');
    this.googleButton = page.getByTestId('signup-google-button');
    this.appleButton = page.getByTestId('signup-apple-button');
    this.errorMessage = page.getByTestId('signup-error-message');
    this.emailError = page.getByTestId('signup-email-error');
    this.passwordError = page.getByTestId('signup-password-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
    await this.waitForPageLoad();
  }

  async signup(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // Check if confirm password field is visible before filling
    // (Locator objects are always truthy, so we need to check visibility)
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword ?? password);
    }
    await this.signupButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectEmailError(message: string): Promise<void> {
    await expect(this.emailError).toContainText(message);
  }

  async expectPasswordError(message: string): Promise<void> {
    await expect(this.passwordError).toContainText(message);
  }
}
