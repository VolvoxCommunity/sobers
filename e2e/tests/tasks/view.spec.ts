import { test, expect } from '@playwright/test';
import { TasksPage } from '../../pages';

// All tasks tests are skipped because the tasks components don't have testIDs yet.
// See tasks.page.ts for the testIDs that need to be added to tasks.tsx and manage-tasks.tsx.
test.describe('Tasks View', () => {
  let tasksPage: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    await tasksPage.goto();
  });

  // Skipped: requires tasks-list testID
  test.skip('should display tasks list', async () => {
    await tasksPage.expectOnTasksPage();
  });

  // Skipped: requires tasks-filter-assigned testID
  test.skip('should filter tasks by status', async () => {
    await tasksPage.filterByStatus('assigned');
  });

  // Skipped: requires task-complete-* testID
  test.skip('should complete a task', async () => {
    // Placeholder
  });

  // Skipped: requires tasks-add-button testID
  test.skip('should show add task button', async () => {
    await expect(tasksPage.addTaskButton).toBeVisible();
  });
});
