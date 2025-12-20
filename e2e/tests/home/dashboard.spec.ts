import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages';

test.describe('Home Dashboard', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('should display days sober count', async () => {
    await expect(homePage.daysSoberCount).toBeVisible();
    const days = await homePage.getDaysSober();
    expect(days).toBeGreaterThanOrEqual(0);
  });

  test('should display tasks section or quick actions', async () => {
    // Tasks section only shows when user has assigned tasks
    // Quick actions are always visible and include "Manage Tasks"
    const hasTasks = await homePage.hasAssignedTasks();
    if (hasTasks) {
      await expect(homePage.tasksSection).toBeVisible();
    } else {
      // If no tasks, quick actions should still be visible for navigation
      await expect(homePage.quickActionButtons).toBeVisible();
      await expect(homePage.manageTasksQuickAction).toBeVisible();
    }
  });

  test('should navigate to tasks page', async ({ page }) => {
    await homePage.navigateToTasks();
    await expect(page).toHaveURL(/.*tasks/);
  });

  test('should display quick action buttons', async () => {
    await expect(homePage.quickActionButtons).toBeVisible();
  });

  test('should display milestones preview', async () => {
    await expect(homePage.milestonesPreview).toBeVisible();
  });
});
