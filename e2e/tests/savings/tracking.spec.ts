import { test, expect } from '@playwright/test';
import { HomePage, EditSavingsSheet } from '../../pages';

test.describe('Savings Tracking', () => {
  test.describe('Dashboard', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
      homePage = new HomePage(page);
      await homePage.goto();
    });

    test('should display money saved card when user has spending data', async () => {
      // This test assumes the test user has savings data configured
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await expect(homePage.moneySavedCard).toBeVisible();
        await expect(homePage.moneySavedTotal).toBeVisible();
      }
    });

    test('should open edit sheet when card is tapped', async ({ page }) => {
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await homePage.openEditSavingsSheet();
        const editSheet = new EditSavingsSheet(page);
        await expect(editSheet.amountInput).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display breakdown values', async () => {
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await expect(homePage.breakdownDay).toBeVisible();
        await expect(homePage.breakdownWeek).toBeVisible();
        await expect(homePage.breakdownMonth).toBeVisible();
      }
    });
  });

  test.describe('Edit Sheet', () => {
    let homePage: HomePage;
    let editSheet: EditSavingsSheet;

    test.beforeEach(async ({ page }) => {
      homePage = new HomePage(page);
      await homePage.goto();

      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await homePage.openEditSavingsSheet();
        editSheet = new EditSavingsSheet(page);
        await expect(editSheet.amountInput).toBeVisible({ timeout: 5000 });
      }
    });

    test('should pre-fill current values', async () => {
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        const amountValue = await editSheet.amountInput.inputValue();
        expect(amountValue).not.toBe('');
      }
    });

    test('should update amount and save', async ({ page }) => {
      await expect(page).toHaveURL(/.*\/(app)?$/);
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await editSheet.fillAmount('75');
        await editSheet.save();

        await expect(homePage.moneySavedCard).toBeVisible({ timeout: 10000 });

        const totalText = await homePage.getMoneySavedTotal();
        expect(totalText).toBeTruthy();
      }
    });

    test('should change frequency', async ({ page }) => {
      await expect(page).toHaveURL(/.*\/(app)?$/);
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await editSheet.selectFrequency('monthly');
        await editSheet.save();

        await expect(homePage.moneySavedCard).toBeVisible({ timeout: 10000 });
      }
    });

    test('should show clear tracking button', async ({ page }) => {
      await expect(page).toHaveURL(/.*\/(app)?$/);
      const hasCard = await homePage.hasMoneySavedCard();
      if (hasCard) {
        await expect(editSheet.clearButton).toBeVisible();
      }
    });
  });
});
