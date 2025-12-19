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

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('signup-email-input');
    this.passwordInput = page.getByTestId('signup-password-input');
    this.confirmPasswordInput = page.getByTestId('signup-confirm-password-input');
    this.signupButton = page.getByTestId('signup-submit-button');
    this.loginLink = page.getByTestId('signup-login-link');
    this.googleButton = page.getByTestId('signup-google-button');
    this.appleButton = page.getByTestId('signup-apple-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
    await this.waitForPageLoad();
  }

  async signup(email: string, password: string, confirmPassword?: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    // The confirm password field is not shown in all signup variants (for example,
    // flows where a password is not required), so we only fill it when it is visible.
    // Note: Locator objects are always truthy, so we must explicitly check visibility here.
    if (await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword ?? password);
    }
    await this.signupButton.click();
  }

  async expectError(message: string): Promise<void> {
    // Signup errors are displayed via toast messages
    await this.expectToast(message);
  }
}
