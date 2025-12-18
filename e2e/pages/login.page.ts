import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.signupLink = page.getByTestId('login-signup-link');
    this.googleButton = page.getByTestId('login-google-button');
    this.appleButton = page.getByTestId('login-apple-button');
    this.errorMessage = page.getByTestId('login-error-message');
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

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}
