import { test, expect } from '@playwright/test';
import { StepsPage, StepDetailPage } from '../../pages';

test.describe('Step Detail', () => {
  let stepsPage: StepsPage;
  let stepDetailPage: StepDetailPage;

  test.beforeEach(async ({ page }) => {
    stepsPage = new StepsPage(page);
    stepDetailPage = new StepDetailPage(page);
    await stepsPage.goto();
    await stepsPage.clickStep(1);
  });

  test('should display step content', async () => {
    await stepDetailPage.expectOnStepDetailPage();
    await expect(stepDetailPage.stepTitle).toBeVisible();
    await expect(stepDetailPage.stepContent).toBeVisible();
  });

  test('should show mark complete button', async () => {
    await expect(stepDetailPage.markCompleteButton).toBeVisible();
  });

  test('should navigate back to steps list', async ({ page }) => {
    await stepDetailPage.goBack();
    await expect(page).toHaveURL(/.*steps$/);
  });

  test('should show mark complete button with correct text', async ({ page }) => {
    // The button should show either "Mark as Complete" or "Marked as Complete"
    // depending on the current completion state
    const buttonText = await stepDetailPage.markCompleteButton.textContent();
    expect(buttonText).toMatch(/Mark(ed)? as Complete/i);
  });
});
