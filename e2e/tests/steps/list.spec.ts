import { test, expect } from '@playwright/test';
import { StepsPage } from '../../pages';

test.describe('Steps List', () => {
  let stepsPage: StepsPage;

  test.beforeEach(async ({ page }) => {
    stepsPage = new StepsPage(page);
    await stepsPage.goto();
  });

  test('should display all 12 steps', async () => {
    await stepsPage.expectOnStepsPage();
    const stepCount = await stepsPage.getStepCount();
    expect(stepCount).toBe(12);
  });

  test('should navigate to step detail on click', async ({ page }) => {
    await stepsPage.clickStep(1);
    // Steps use UUID-based URLs, not numeric step numbers
    await expect(page).toHaveURL(/.*steps\/[a-f0-9-]+$/);
  });

  test('should display step cards with titles', async ({ page }) => {
    const firstStep = page.getByTestId('step-card-1');
    await expect(firstStep).toBeVisible();
    // Step cards show the number in a badge and the step content
    // First step is about admitting powerlessness over alcohol
    await expect(firstStep).toContainText('powerless over alcohol');
  });
});
