import { test, expect } from '@playwright/test';
import { ManageTasksPage } from '../../pages';

// All manage tasks tests are skipped because the manage-tasks component doesn't have testIDs yet.
// See tasks.page.ts for the testIDs that need to be added to manage-tasks.tsx.
test.describe('Manage Tasks', () => {
  let manageTasksPage: ManageTasksPage;

  test.beforeEach(async ({ page }) => {
    manageTasksPage = new ManageTasksPage(page);
    await manageTasksPage.goto();
  });

  // Skipped: requires manage-tasks-list testID
  test.skip('should display tasks list', async () => {
    await expect(manageTasksPage.tasksList).toBeVisible();
  });

  // Skipped: requires manage-tasks-create-button testID
  test.skip('should show create task button', async () => {
    await expect(manageTasksPage.createTaskButton).toBeVisible();
  });

  // Skipped: requires task form testIDs
  test.skip('should create a new task', async () => {
    await manageTasksPage.createTask('E2E Test Task', 'Task created during E2E testing', 'daily');
  });

  // Skipped: requires manage-task-edit-* testID
  test.skip('should open task edit form', async () => {
    await manageTasksPage.editTask('task-1111-1111-1111-111111111111');
  });

  // Skipped: requires task form testIDs
  test.skip('should cancel task creation', async () => {
    await manageTasksPage.createTaskButton.click();
  });
});
