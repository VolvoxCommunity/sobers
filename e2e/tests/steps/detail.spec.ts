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
    await stepDetailPage.expectOnStepDetailPage(1);
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

  test('should mark step as complete', async () => {
    await stepDetailPage.markComplete();
    await stepDetailPage.expectToast('Step completed');

    // Verify completion persists in UI by navigating back and checking the step card.
    // Note: Test data is reset before each test run via resetTestData() in auth setup,
    // so cross-session persistence is verified at the database/integration level rather
    // than through page reloads here.
    await stepDetailPage.goBack();
    await stepsPage.expectStepCompleted(1);
  });
});
