import { test, expect } from '@playwright/test';

test.describe('Tasks View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should display tasks page', async ({ page }) => {
    // Should be on the tasks page
    await expect(page).toHaveURL(/.*tasks/);
    // My Tasks and Manage segments should be visible
    await expect(page.getByRole('button', { name: 'My Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Manage' })).toBeVisible();
  });

  test('should display segmented control', async ({ page }) => {
    // Segmented control with My Tasks and Manage should be visible
    await expect(page.getByText('My Tasks')).toBeVisible();
    await expect(page.getByText('Manage')).toBeVisible();
  });

  test('should display tasks content area', async ({ page }) => {
    // Either tasks-list, tasks-empty-state, or manage view content should be visible
    // The app auto-selects between My Tasks and Manage based on pending tasks
    const tasksList = page.getByTestId('tasks-list');
    const emptyState = page.getByTestId('tasks-empty-state');
    const manageList = page.getByTestId('manage-tasks-list');
    const anyContent = page.getByText(/no assigned tasks|connect with sponsees/i);
    const isTasksListVisible = await tasksList.isVisible().catch(() => false);
    const isEmptyVisible = await emptyState.isVisible().catch(() => false);
    const isManageVisible = await manageList.isVisible().catch(() => false);
    const hasAnyContent = await anyContent.isVisible().catch(() => false);
    expect(isTasksListVisible || isEmptyVisible || isManageVisible || hasAnyContent).toBe(true);
  });

  test('should switch between My Tasks and Manage views', async ({ page }) => {
    // Click Manage to switch view
    await page.getByText('Manage').click();
    // Subtitle should change
    await expect(page.getByText(/Track and assign sponsee tasks/i)).toBeVisible();
    // Click My Tasks to switch back
    await page.getByText('My Tasks').click();
    // Subtitle should change back
    await expect(page.getByText(/Track your step progress/i)).toBeVisible();
  });
});
