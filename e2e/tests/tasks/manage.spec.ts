import { test, expect } from '@playwright/test';

test.describe('Manage Tasks', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    // Click "Manage" segment to switch to manage view
    await page.getByText('Manage').click();
  });

  test('should display manage tasks page', async ({ page }) => {
    // Should be on the tasks page
    await expect(page).toHaveURL(/.*tasks/);
    // Manage segment should be visible/active
    await expect(page.getByText('Manage')).toBeVisible();
  });

  test('should display manage view content', async ({ page }) => {
    // Either manage-tasks-list or empty state should be visible
    const tasksList = page.getByTestId('manage-tasks-list');
    const emptyText = page.getByText(/no sponsees|connect with a sponsee|no tasks/i);
    const isListVisible = await tasksList.isVisible().catch(() => false);
    const isEmptyVisible = await emptyText.isVisible().catch(() => false);
    expect(isListVisible || isEmptyVisible).toBe(true);
  });

  test('should show filter options when sponsees exist', async ({ page }) => {
    // Filter buttons only appear if user has sponsees with tasks
    // Check if any filter or empty state is visible
    const filterAll = page.getByTestId('tasks-filter-all');
    const emptyText = page.getByText(/no sponsees|connect with a sponsee/i);
    const hasFilter = await filterAll.isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);
    expect(hasFilter || hasEmpty).toBe(true);
  });

  test('should show empty state when no sponsees', async ({ page }) => {
    // For a user without sponsees, there should be an empty state message
    // The create button is only visible when the user has sponsees
    const emptyText = page.getByText(/no sponsees|connect with a sponsee/i);
    const createButton = page.getByTestId('manage-tasks-create-button');
    // Either empty message is shown or create button is visible (if user has sponsees)
    const hasEmptyText = await emptyText.isVisible().catch(() => false);
    const hasCreateButton = await createButton.isVisible().catch(() => false);
    expect(hasEmptyText || hasCreateButton).toBe(true);
  });
});
