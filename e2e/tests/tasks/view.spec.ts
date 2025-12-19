import { test, expect } from '@playwright/test';
import { TasksPage } from '../../pages';
import { TEST_TASKS } from '../../fixtures/test-data';

test.describe('Tasks View', () => {
  let tasksPage: TasksPage;

  test.beforeEach(async ({ page }) => {
    tasksPage = new TasksPage(page);
    await tasksPage.goto();
  });

  test('should display tasks list', async () => {
    await tasksPage.expectOnTasksPage();
    const taskCount = await tasksPage.getTaskCount();
    expect(taskCount).toBeGreaterThan(0);
  });

  test('should filter tasks by status', async () => {
    await tasksPage.filterByStatus('assigned');
    // Verify filter is applied (accessibilityState.selected becomes aria-selected)
    await expect(tasksPage.filterAssigned).toHaveAttribute('aria-selected', 'true');
  });

  test('should complete a task', async () => {
    const taskId = TEST_TASKS.daily.id;
    await tasksPage.completeTask(taskId);
    await tasksPage.expectToast('Task completed');

    // Verify task completion persists in UI
    await tasksPage.expectTaskCompleted(taskId);
  });

  test('should show add task button', async () => {
    await expect(tasksPage.addTaskButton).toBeVisible();
  });
});
