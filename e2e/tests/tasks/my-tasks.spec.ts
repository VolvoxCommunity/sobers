import { test, expect } from '@playwright/test';
import { TasksPage } from '../../pages';
import { TEST_TASKS } from '../../fixtures/test-data';

test.describe('My Tasks', () => {
  let tasksPage: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    await tasksPage.goto();
  });

  test('should display assigned tasks', async ({ page }) => {
    await expect(page.getByTestId(`task-card-${TEST_TASKS.meditation.id}`)).toBeVisible();
    await expect(page.getByTestId(`task-card-${TEST_TASKS.callSponsor.id}`)).toBeVisible();
  });

  test('should toggle completed tasks section', async ({ page }) => {
    const completedHeader = page.getByText(/Completed \(\d+\)/);
    await expect(completedHeader).toBeVisible();

    await completedHeader.click();
    await expect(page.getByTestId(`task-card-${TEST_TASKS.completed.id}`)).toBeVisible();
  });

  test('should open and close task completion sheet', async ({ page }) => {
    await page.getByTestId(`task-complete-${TEST_TASKS.meditation.id}`).click();
    await expect(page.getByText('Complete Task')).toBeVisible();

    await page.getByTestId('close-icon-button').click();
    await expect(page.getByText('Complete Task')).not.toBeVisible({ timeout: 5000 });
  });
});
