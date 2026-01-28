import { test, expect } from '@playwright/test';
import { JourneyPage } from '../../pages';

test.describe('Journey Timeline', () => {
  let journeyPage: JourneyPage;

  test.beforeEach(async ({ page }) => {
    journeyPage = new JourneyPage(page);
    await journeyPage.goto();
  });

  test('should render timeline events', async ({ page }) => {
    await expect(journeyPage.milestonesList).toBeVisible();
    const earned = page.getByTestId(/^milestone-earned-/);
    const earnedCount = await earned.count();
    expect(earnedCount).toBeGreaterThan(0);
  });
});
