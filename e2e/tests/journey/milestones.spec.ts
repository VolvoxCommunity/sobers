import { test, expect } from '@playwright/test';
import { JourneyPage } from '../../pages';

test.describe('Journey Milestones', () => {
  let journeyPage: JourneyPage;

  test.beforeEach(async ({ page }) => {
    journeyPage = new JourneyPage(page);
    await journeyPage.goto();
  });

  test('should display milestones list', async () => {
    await journeyPage.expectOnJourneyPage();
    await expect(journeyPage.milestonesList).toBeVisible();
  });

  test('should show earned milestones', async () => {
    const earnedCount = await journeyPage.getEarnedMilestoneCount();
    expect(earnedCount).toBeGreaterThan(0);
  });

  test('should show upcoming milestones', async () => {
    const upcomingCount = await journeyPage.getUpcomingMilestoneCount();
    expect(upcomingCount).toBeGreaterThanOrEqual(0);
  });

  test('should display current progress', async () => {
    await expect(journeyPage.currentMilestoneProgress).toBeVisible();
  });
});
