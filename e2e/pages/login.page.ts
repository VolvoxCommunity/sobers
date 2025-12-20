import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.signupLink = page.getByTestId('login-signup-link');
    this.googleButton = page.getByTestId('login-google-button');
    this.appleButton = page.getByTestId('login-apple-button');
    this.forgotPasswordLink = page.getByTestId('login-forgot-password-link');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Assert that a login error is displayed.
   *
   * Login-specific error assertion. Currently, login errors are displayed via toast messages,
   * so this delegates to expectToast. Keeping this wrapper allows tests to use a semantic
   * "expectError" API and isolates them from how errors are rendered, making it easy to change
   * the underlying implementation (e.g., inline messages instead of toasts) in one place.
   */
  async expectError(message: string): Promise<void> {
    await this.expectToast(message);
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
