# E2E User Flows Test Design

**Date:** 2025-12-21
**Status:** Approved
**Goal:** Add E2E tests for critical user flows not currently covered

## Current Coverage Gap

The app has 12 E2E test files covering basic page views and navigation. Missing coverage for:

- Onboarding flow (first-run experience)
- Task creation (sponsor action)
- Task completion (sponsee action)
- Log slip-up (reset sobriety date)
- Edit display name (profile update)

## New Test Files

### 1. Onboarding Flow (`e2e/tests/onboarding/flow.spec.ts`)

Tests the first-run experience after authentication.

| Test                                                  | Verification                                   |
| ----------------------------------------------------- | ---------------------------------------------- |
| `should display welcome message`                      | Title "Welcome to Sobers" and subtitle visible |
| `should show display name input with character count` | Input visible, counter shows X/30              |
| `should show validation error for empty name`         | Error when submitting empty                    |
| `should show sobriety date picker`                    | Calendar icon, date display visible            |
| `should update days counter when date changes`        | Selecting past date updates counter            |
| `should require terms acceptance`                     | Button disabled until checkbox checked         |
| `should enable submit when form is complete`          | Button active after name + terms               |
| `should have sign out option`                         | Sign Out button visible                        |

**TestIDs used:**

- `onboarding-display-name-input`
- `onboarding-sobriety-date-input`
- `onboarding-next-button`

### 2. Task Creation (`e2e/tests/tasks/creation.spec.ts`)

Tests the sponsor's ability to assign tasks to sponsees.

| Test                                                   | Verification                        |
| ------------------------------------------------------ | ----------------------------------- |
| `should display assign task button in Manage view`     | Create button visible               |
| `should open task creation sheet`                      | Sheet with "Assign New Task" header |
| `should show required form fields`                     | Sponsee, title, description inputs  |
| `should show validation error for missing sponsee`     | Error message appears               |
| `should show validation error for missing title`       | Error message appears               |
| `should show validation error for missing description` | Error message appears               |
| `should show step number dropdown (optional)`          | Steps 1-12 selectable               |
| `should show due date picker (optional)`               | Calendar input visible              |
| `should close sheet on cancel`                         | Cancel dismisses sheet              |

### 3. Task Completion (`e2e/tests/tasks/completion.spec.ts`)

Tests the sponsee's ability to complete assigned tasks.

| Test                                                  | Verification                 |
| ----------------------------------------------------- | ---------------------------- |
| `should display complete button on assigned tasks`    | Action visible on cards      |
| `should open completion sheet when clicking complete` | Sheet with header            |
| `should display task title in completion sheet`       | Task identified              |
| `should show optional notes field`                    | Textarea visible             |
| `should show helpful prompt for notes`                | Placeholder text             |
| `should have cancel and submit buttons`               | Both buttons visible         |
| `should close sheet on cancel`                        | Dismisses without completing |

### 4. Log Slip-Up (`e2e/tests/journey/slip-up.spec.ts`)

Tests the ability to reset sobriety date after a slip.

| Test                                       | Verification             |
| ------------------------------------------ | ------------------------ |
| `should display log slip-up button`        | Action on Journey page   |
| `should open slip-up sheet`                | Sheet appears            |
| `should show date picker for slip-up date` | Date selection available |
| `should show warning about date reset`     | User understands impact  |
| `should have cancel option`                | Can back out             |

### 5. Edit Display Name (`e2e/tests/profile/edit-name.spec.ts`)

Tests updating the user's display name.

| Test                                  | Verification             |
| ------------------------------------- | ------------------------ |
| `should display edit name button`     | Edit icon on profile     |
| `should open edit name sheet`         | Sheet with current name  |
| `should show character count`         | X/30 counter visible     |
| `should validate name input`          | Error for invalid names  |
| `should have save and cancel buttons` | Both actions available   |
| `should close on cancel`              | Dismisses without saving |

## Page Object Updates

### TaskCreationSheet (add to `e2e/pages/tasks.page.ts`)

```typescript
export class TaskCreationSheet {
  readonly sheet: Locator;
  readonly sponseeDropdown: Locator;
  readonly stepDropdown: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly dueDateInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.sheet = page.getByRole('dialog');
    this.sponseeDropdown = page.getByRole('combobox', { name: /sponsee/i });
    this.stepDropdown = page.getByRole('combobox', { name: /step/i });
    this.titleInput = page.getByLabel('Task Title');
    this.descriptionInput = page.getByLabel('Task Description');
    this.dueDateInput = page.locator('input[type="date"]');
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.submitButton = page.getByRole('button', { name: 'Assign Task' });
    this.closeButton = page.getByLabel('Close');
    this.errorMessage = page.locator('[role="alert"]');
  }
}
```

### TaskCompletionSheet (add to `e2e/pages/tasks.page.ts`)

```typescript
export class TaskCompletionSheet {
  readonly sheet: Locator;
  readonly taskTitle: Locator;
  readonly notesInput: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.sheet = page.getByRole('dialog');
    this.taskTitle = page.locator('[data-testid="task-title"]');
    this.notesInput = page.getByPlaceholder(/What did you learn/);
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.submitButton = page.getByRole('button', { name: 'Mark Complete' });
    this.closeButton = page.getByTestId('close-icon-button');
  }
}
```

### LogSlipUpSheet (add to `e2e/pages/journey.page.ts`)

```typescript
export class LogSlipUpSheet {
  readonly sheet: Locator;
  readonly dateInput: Locator;
  readonly warningText: Locator;
  readonly cancelButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.sheet = page.getByRole('dialog');
    this.dateInput = page.locator('input[type="date"]');
    this.warningText = page.getByText(/reset/i);
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.confirmButton = page.getByRole('button', { name: /confirm|log/i });
  }
}
```

### EditDisplayNameSheet (add to `e2e/pages/profile.page.ts`)

```typescript
export class EditDisplayNameSheet {
  readonly sheet: Locator;
  readonly nameInput: Locator;
  readonly characterCount: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.sheet = page.getByRole('dialog');
    this.nameInput = page.getByTestId('edit-name-input');
    this.characterCount = page.getByText(/\/30 characters/);
    this.saveButton = page.getByTestId('edit-name-save-button');
    this.cancelButton = page.getByTestId('edit-name-cancel-button');
    this.errorMessage = page.locator('[role="alert"]');
  }
}
```

## Implementation Order

1. **Onboarding tests** - Most critical, standalone flow
2. **Task creation/completion tests** - Core app functionality
3. **Slip-up and edit-name tests** - Secondary flows

## Expected Outcome

- **Before:** 12 test files, ~61 tests
- **After:** 16 test files, ~91 tests
- **Coverage:** All major user flows tested
