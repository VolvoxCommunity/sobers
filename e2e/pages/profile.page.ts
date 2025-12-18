import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  readonly displayName: Locator;
  readonly sobrietyStats: Locator;
  readonly daysSober: Locator;
  readonly editDisplayNameButton: Locator;
  readonly editSobrietyDateButton: Locator;
  readonly logSlipUpButton: Locator;
  readonly inviteCodeSection: Locator;
  readonly myInviteCode: Locator;
  readonly copyInviteCodeButton: Locator;
  readonly enterInviteCodeButton: Locator;
  readonly relationshipsList: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.displayName = page.getByTestId('profile-display-name');
    this.sobrietyStats = page.getByTestId('profile-sobriety-stats');
    this.daysSober = page.getByTestId('profile-days-sober');
    this.editDisplayNameButton = page.getByTestId('profile-edit-name-button');
    this.editSobrietyDateButton = page.getByTestId('profile-edit-date-button');
    this.logSlipUpButton = page.getByTestId('profile-log-slip-up-button');
    this.inviteCodeSection = page.getByTestId('profile-invite-code-section');
    this.myInviteCode = page.getByTestId('profile-my-invite-code');
    this.copyInviteCodeButton = page.getByTestId('profile-copy-invite-code');
    this.enterInviteCodeButton = page.getByTestId('profile-enter-invite-code-button');
    this.relationshipsList = page.getByTestId('profile-relationships-list');
    this.settingsButton = page.getByTestId('profile-settings-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile');
    await this.waitForPageLoad();
  }

  async expectOnProfilePage(): Promise<void> {
    await expect(this.displayName).toBeVisible();
  }

  async getDisplayName(): Promise<string> {
    return (await this.displayName.textContent()) || '';
  }

  async getDaysSober(): Promise<number> {
    const text = await this.daysSober.textContent();
    return parseInt(text || '0', 10);
  }

  async openEditDisplayName(): Promise<void> {
    await this.editDisplayNameButton.click();
  }

  async openEditSobrietyDate(): Promise<void> {
    await this.editSobrietyDateButton.click();
  }

  async openLogSlipUp(): Promise<void> {
    await this.logSlipUpButton.click();
  }

  async openEnterInviteCode(): Promise<void> {
    await this.enterInviteCodeButton.click();
  }

  async getMyInviteCode(): Promise<string> {
    return (await this.myInviteCode.textContent()) || '';
  }

  async copyInviteCode(): Promise<void> {
    await this.copyInviteCodeButton.click();
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }
}

export class EditDisplayNameSheet extends BasePage {
  readonly displayNameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.displayNameInput = page.getByTestId('edit-name-input');
    this.saveButton = page.getByTestId('edit-name-save-button');
    this.cancelButton = page.getByTestId('edit-name-cancel-button');
  }

  async updateDisplayName(name: string): Promise<void> {
    await this.displayNameInput.clear();
    await this.displayNameInput.fill(name);
    await this.saveButton.click();
  }
}

export class EnterInviteCodeSheet extends BasePage {
  readonly inviteCodeInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.inviteCodeInput = page.getByTestId('enter-invite-code-input');
    this.submitButton = page.getByTestId('enter-invite-code-submit-button');
    this.cancelButton = page.getByTestId('enter-invite-code-cancel-button');
    this.errorMessage = page.getByTestId('enter-invite-code-error');
  }

  async enterCode(code: string): Promise<void> {
    await this.inviteCodeInput.fill(code);
    await this.submitButton.click();
  }
}

export class LogSlipUpSheet extends BasePage {
  readonly dateInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dateInput = page.getByTestId('log-slip-up-date-input');
    this.confirmButton = page.getByTestId('log-slip-up-confirm-button');
    this.cancelButton = page.getByTestId('log-slip-up-cancel-button');
  }

  async logSlipUp(date: string): Promise<void> {
    await this.dateInput.fill(date);
    await this.confirmButton.click();
  }
}
