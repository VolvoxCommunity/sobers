import { test, expect } from '@playwright/test';
import { StepsPage, StepDetailPage } from '../../pages';

test.describe('Step Navigation', () => {
  let stepsPage: StepsPage;
  let stepDetailPage: StepDetailPage;

  test.beforeEach(async ({ page }) => {
    stepsPage = new StepsPage(page);
    stepDetailPage = new StepDetailPage(page);
    await stepsPage.goto();
    await stepsPage.clickStep(1);
    await stepDetailPage.expectOnStepDetailPage();
  });

  test('should navigate to next and previous steps', async ({ page }) => {
    const firstUrl = page.url();

    await page
      .locator('[data-testid="step-detail-next-button"]:not([aria-disabled="true"])')
      .click();
    await stepDetailPage.expectOnStepDetailPage();
    const secondUrl = page.url();
    expect(secondUrl).not.toBe(firstUrl);

    await page
      .locator('[data-testid="step-detail-prev-button"]:not([aria-disabled="true"])')
      .click();
    await stepDetailPage.expectOnStepDetailPage();
    const thirdUrl = page.url();
    expect(thirdUrl).not.toBe(secondUrl);
  });
});
