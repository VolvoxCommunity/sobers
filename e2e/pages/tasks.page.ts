import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class TasksPage extends BasePage {
  readonly tasksList: Locator;
  readonly taskCards: Locator;
  readonly filterAll: Locator;
  readonly filterAssigned: Locator;
  readonly filterCompleted: Locator;
  readonly addTaskButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.tasksList = page.getByTestId('tasks-list');
    this.taskCards = page.getByTestId(/^task-card-/);
    this.filterAll = page.getByTestId('tasks-filter-all');
    this.filterAssigned = page.getByTestId('tasks-filter-assigned');
    this.filterCompleted = page.getByTestId('tasks-filter-completed');
    this.addTaskButton = page.getByTestId('tasks-add-button');
    this.emptyState = page.getByTestId('tasks-empty-state');
  }

  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.waitForPageLoad();
  }

  async expectOnTasksPage(): Promise<void> {
    await expect(this.tasksList).toBeVisible();
  }

  async getTaskCount(): Promise<number> {
    return await this.taskCards.count();
  }

  async clickTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`task-card-${taskId}`).click();
  }

  async completeTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`task-complete-${taskId}`).click();
  }

  async expectTaskCompleted(taskId: string): Promise<void> {
    // Verify task card exists and shows completed state
    const taskCard = this.page.getByTestId(`task-card-${taskId}`);
    await expect(taskCard).toBeVisible();

    // Completed tasks have reduced opacity (0.7) via completedCard style
    // and no longer show the complete button
    const completeButton = this.page.getByTestId(`task-complete-${taskId}`);
    await expect(completeButton).not.toBeVisible();
  }

  async filterByStatus(status: 'all' | 'assigned' | 'completed'): Promise<void> {
    switch (status) {
      case 'all':
        await this.filterAll.click();
        break;
      case 'assigned':
        await this.filterAssigned.click();
        break;
      case 'completed':
        await this.filterCompleted.click();
        break;
    }
  }

  async openAddTaskModal(): Promise<void> {
    await this.addTaskButton.click();
  }
}

export class ManageTasksPage extends BasePage {
  readonly tasksList: Locator;
  readonly createTaskButton: Locator;
  readonly taskTitleInput: Locator;
  readonly taskDescriptionInput: Locator;
  readonly taskFrequencySelect: Locator;
  readonly saveTaskButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteTaskButton: Locator;

  constructor(page: Page) {
    super(page);
    this.tasksList = page.getByTestId('manage-tasks-list');
    this.createTaskButton = page.getByTestId('manage-tasks-create-button');
    this.taskTitleInput = page.getByTestId('task-form-title-input');
    this.taskDescriptionInput = page.getByTestId('task-form-description-input');
    this.taskFrequencySelect = page.getByTestId('task-form-frequency-select');
    this.saveTaskButton = page.getByTestId('task-form-save-button');
    this.cancelButton = page.getByTestId('task-form-cancel-button');
    this.deleteTaskButton = page.getByTestId('task-form-delete-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/manage-tasks');
    await this.waitForPageLoad();
  }

  async createTask(
    title: string,
    description: string,
    frequency: 'daily' | 'weekly'
  ): Promise<void> {
    await this.createTaskButton.click();
    await this.taskTitleInput.fill(title);
    await this.taskDescriptionInput.fill(description);
    await this.taskFrequencySelect.selectOption(frequency);
    await this.saveTaskButton.click();
  }

  async editTask(taskId: string): Promise<void> {
    await this.page.getByTestId(`manage-task-edit-${taskId}`).click();
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.editTask(taskId);
    await this.deleteTaskButton.click();
  }
}
