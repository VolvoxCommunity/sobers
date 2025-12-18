# Toast Notification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace success and error alerts with `react-native-toast-message` for unified, non-blocking notifications.

**Architecture:** Create `lib/toast.ts` with themed toast config and `showToast` API. Mount `<Toast />` component in root layout. Migrate ~35 alert calls to toast calls while preserving confirmation dialogs.

**Tech Stack:** react-native-toast-message (already installed), React Native, ThemeContext for styling

---

## Pre-Implementation Notes

- **Package installed:** `react-native-toast-message@^2.3.3` is already in dependencies
- **Existing utilities:** `lib/alert.ts` has `showAlert()` (to be replaced) and `showConfirm()` (keep unchanged)
- **Theme colors:** Use `theme.surface`, `theme.text`, `theme.successAlt`, `theme.error`, `theme.info`

---

### Task 1: Create Toast API and Config

**Files:**

- Create: `lib/toast.ts`

**Step 1: Create the toast utility module**

```typescript
import Toast, { BaseToast, ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { StyleSheet, Platform } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from '@/constants/theme';

// =============================================================================
// Types
// =============================================================================

type ToastType = 'success' | 'error' | 'info';

// =============================================================================
// Toast Configuration
// =============================================================================

/**
 * Creates themed toast renderers for success, error, and info types.
 * Uses theme colors for background, text, and accent borders.
 *
 * @param isDark - Whether dark mode is active
 * @returns Toast configuration object for react-native-toast-message
 */
export function createToastConfig(isDark: boolean): ToastConfig {
  const theme: ThemeColors = isDark ? darkTheme : lightTheme;

  const baseStyle = {
    backgroundColor: theme.surface,
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  };

  const textStyle = {
    fontFamily: theme.fontMedium,
    fontSize: 14,
    color: theme.text,
  };

  return {
    success: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.successAlt }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
    error: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.error }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
    info: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.info }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
  };
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 0,
  },
});

// =============================================================================
// Toast API
// =============================================================================

/**
 * Show a success toast notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param message - The message to display
 */
function success(message: string): void {
  Toast.show({
    type: 'success',
    text1: message,
    visibilityTime: 3000,
  });
}

/**
 * Show an error toast notification.
 * Auto-dismisses after 5 seconds (longer for readability).
 *
 * @param message - The message to display
 */
function error(message: string): void {
  Toast.show({
    type: 'error',
    text1: message,
    visibilityTime: 5000,
  });
}

/**
 * Show an info toast notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param message - The message to display
 */
function info(message: string): void {
  Toast.show({
    type: 'info',
    text1: message,
    visibilityTime: 3000,
  });
}

/**
 * Toast notification utilities for displaying non-blocking feedback.
 * Use for success/error/info messages. For confirmations, use `showConfirm()` from `@/lib/alert`.
 */
export const showToast = {
  success,
  error,
  info,
};
```

**Step 2: Verify the file was created**

Run: `ls -la lib/toast.ts`
Expected: File exists

**Step 3: Commit**

```bash
git add lib/toast.ts
git commit -m "feat(toast): add toast notification system with themed config"
```

---

### Task 2: Add Jest Mock for Toast

**Files:**

- Modify: `jest.setup.js` (add at end of file)

**Step 1: Add the mock**

Add after the last mock (around line 550):

```javascript
// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ config, position, topOffset }) =>
      React.createElement('Toast', { config, position, topOffset }),
    show: jest.fn(),
    hide: jest.fn(),
    BaseToast: ({ children, ...props }) => React.createElement('BaseToast', props, children),
  };
});
```

**Step 2: Verify mock is syntactically correct**

Run: `node -c jest.setup.js`
Expected: No errors

**Step 3: Commit**

```bash
git add jest.setup.js
git commit -m "test(toast): add jest mock for react-native-toast-message"
```

---

### Task 3: Write Tests for Toast Utility

**Files:**

- Create: `__tests__/lib/toast.test.ts`

**Step 1: Write the failing test**

```typescript
import Toast from 'react-native-toast-message';
import { showToast, createToastConfig } from '@/lib/toast';

// Clear mock calls between tests
beforeEach(() => {
  jest.clearAllMocks();
});

describe('showToast', () => {
  describe('success', () => {
    it('calls Toast.show with success type and 3s visibility', () => {
      showToast.success('Task completed');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'success',
        text1: 'Task completed',
        visibilityTime: 3000,
      });
    });
  });

  describe('error', () => {
    it('calls Toast.show with error type and 5s visibility', () => {
      showToast.error('Something went wrong');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Something went wrong',
        visibilityTime: 5000,
      });
    });
  });

  describe('info', () => {
    it('calls Toast.show with info type and 3s visibility', () => {
      showToast.info('Check your email');

      expect(Toast.show).toHaveBeenCalledWith({
        type: 'info',
        text1: 'Check your email',
        visibilityTime: 3000,
      });
    });
  });
});

describe('createToastConfig', () => {
  it('returns config object with success, error, and info renderers', () => {
    const config = createToastConfig(false);

    expect(config).toHaveProperty('success');
    expect(config).toHaveProperty('error');
    expect(config).toHaveProperty('info');
    expect(typeof config.success).toBe('function');
    expect(typeof config.error).toBe('function');
    expect(typeof config.info).toBe('function');
  });

  it('creates config for light mode', () => {
    const config = createToastConfig(false);
    expect(config).toBeDefined();
  });

  it('creates config for dark mode', () => {
    const config = createToastConfig(true);
    expect(config).toBeDefined();
  });
});
```

**Step 2: Run test to verify it passes**

Run: `pnpm test -- __tests__/lib/toast.test.ts --no-coverage`
Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/lib/toast.test.ts
git commit -m "test(toast): add unit tests for showToast and createToastConfig"
```

---

### Task 4: Integrate Toast Component in Root Layout

**Files:**

- Modify: `app/_layout.tsx`

**Step 1: Add import at top with other imports**

Add after line 38 (after the BottomSheetModalProvider import):

```typescript
import Toast from 'react-native-toast-message';
import { createToastConfig } from '@/lib/toast';
```

**Step 2: Create ToastWrapper component**

Add before the `RootLayoutNav` function (around line 50):

```typescript
/**
 * Toast component wrapper that uses theme context for styling.
 * Must be rendered inside ThemeProvider to access theme.
 */
function ToastWrapper(): React.ReactElement {
  const { isDark } = useTheme();
  return <Toast config={createToastConfig(isDark)} position="top" topOffset={60} />;
}
```

**Step 3: Add ToastWrapper inside ThemeProvider**

Modify the RootLayout return (around line 208-224) to add ToastWrapper after AuthProvider:

```typescript
return (
  <GestureHandlerRootView style={styles.container}>
    <ErrorBoundary>
      <KeyboardProvider>
        <BottomSheetModalProvider>
          <ThemeProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
            <ToastWrapper />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </KeyboardProvider>
      {/* Vercel Analytics - web only, inside ErrorBoundary for safety */}
      {Platform.OS === 'web' && <Analytics />}
    </ErrorBoundary>
  </GestureHandlerRootView>
);
```

**Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(toast): integrate Toast component in root layout"
```

---

### Task 5: Migrate Login Screen

**Files:**

- Modify: `app/login.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" app/login.tsx`

**Step 2: Add showToast import**

Add to imports:

```typescript
import { showToast } from '@/lib/toast';
```

**Step 3: Replace error alerts with showToast.error()**

Replace all `showAlert('Error', message)` or `showAlert('Login Failed', message)` patterns with:

```typescript
showToast.error(message);
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/login.tsx
git commit -m "refactor(auth): migrate login alerts to toast notifications"
```

---

### Task 6: Migrate Signup Screen

**Files:**

- Modify: `app/signup.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" app/signup.tsx`

**Step 2: Add showToast import**

Add to imports:

```typescript
import { showToast } from '@/lib/toast';
```

**Step 3: Replace error alerts with showToast.error()**

Replace all error alert patterns with `showToast.error(message)`.

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/signup.tsx
git commit -m "refactor(auth): migrate signup alerts to toast notifications"
```

---

### Task 7: Migrate Onboarding Screen

**Files:**

- Modify: `app/onboarding.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" app/onboarding.tsx`

**Step 2: Add showToast import and replace alerts**

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add app/onboarding.tsx
git commit -m "refactor(auth): migrate onboarding alerts to toast notifications"
```

---

### Task 8: Migrate Settings Screen

**Files:**

- Modify: `app/settings.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" app/settings.tsx`

**Step 2: Add showToast import**

**Step 3: Replace success/error alerts, keep confirmations**

- Success alerts → `showToast.success(message)`
- Error alerts → `showToast.error(message)`
- Confirmation dialogs (with Cancel/Confirm buttons) → Keep as `showConfirm()` or `Alert.alert()`

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add app/settings.tsx
git commit -m "refactor(settings): migrate alerts to toast notifications"
```

---

### Task 9: Migrate Profile Tab

**Files:**

- Modify: `app/(tabs)/profile.tsx` or `app/(app)/(tabs)/profile.tsx`

**Step 1: Find the file and current alert usage**

Run: `find app -name "profile.tsx" -type f`
Run: `grep -n "showAlert\|Alert.alert\|window.alert" <path>`

**Step 2: Add showToast import and migrate**

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add <path>/profile.tsx
git commit -m "refactor(profile): migrate alerts to toast notifications"
```

---

### Task 10: Migrate Tasks Tab

**Files:**

- Modify: `app/(tabs)/tasks.tsx` or `app/(app)/(tabs)/tasks.tsx`

**Step 1: Find the file and current alert usage**

**Step 2: Add showToast import and migrate**

**Step 3: Run typecheck and commit**

---

### Task 11: Migrate Manage Tasks Tab

**Files:**

- Modify: `app/(tabs)/manage-tasks.tsx` or similar

**Step 1-4: Same pattern as above**

---

### Task 12: Migrate Index/Home Tab

**Files:**

- Modify: `app/(tabs)/index.tsx` or `app/(app)/(tabs)/index.tsx`

**Step 1-4: Same pattern as above**

---

### Task 13: Migrate SettingsSheet Component

**Files:**

- Modify: `components/SettingsSheet.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" components/SettingsSheet.tsx`

**Step 2: Add showToast import and migrate success/error alerts**

Keep confirmation dialogs unchanged.

**Step 3: Run typecheck and commit**

---

### Task 14: Migrate Bottom Sheet Components

**Files:**

- Check: `components/sheets/LogSlipUpSheet.tsx`
- Check: `components/sheets/EditDisplayNameSheet.tsx`

**Step 1: Find current alert usage in sheets**

Run: `grep -rn "showAlert\|Alert.alert" components/sheets/`

**Step 2: Migrate if any success/error alerts exist**

Note: Per design doc, these may only have confirmations which stay unchanged.

**Step 3: Commit if changes made**

---

### Task 15: Migrate Settings Content Component

**Files:**

- Check: `components/settings/SettingsContent.tsx`

**Step 1: Find current alert usage**

Run: `grep -n "showAlert\|Alert.alert\|window.alert" components/settings/SettingsContent.tsx`

**Step 2: Migrate success/error alerts, keep confirmations**

**Step 3: Run typecheck and commit**

---

### Task 16: Update Affected Test Files

**Files:**

- Check and update any tests that mock or assert on Alert.alert for migrated cases

**Step 1: Find tests asserting on Alert.alert**

Run: `grep -rn "Alert.alert" __tests__/`

**Step 2: Update assertions to use Toast.show**

For migrated success/error cases, change:

```typescript
expect(Alert.alert).toHaveBeenCalledWith('Success', 'message');
```

To:

```typescript
expect(Toast.show).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'success', text1: 'message' })
);
```

**Step 3: Add Toast import to test files that need it**

```typescript
import Toast from 'react-native-toast-message';
```

**Step 4: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add __tests__/
git commit -m "test: update tests to assert on Toast.show instead of Alert.alert"
```

---

### Task 17: Update CHANGELOG.md

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add entry under [Unreleased]**

```markdown
### Changed

- Replace success and error alerts with toast notifications for non-blocking UX
- Migrate ~35 alert calls across auth, settings, profile, and task screens to unified toast API
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG with toast notification migration"
```

---

### Task 18: Final Verification

**Step 1: Run full quality suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
Expected: All pass, coverage ≥80%

**Step 2: Visual verification (if dev server available)**

Start: `pnpm web`
Test:

- [ ] Toast appears at top of screen
- [ ] Success toast auto-dismisses after ~3s
- [ ] Error toast auto-dismisses after ~5s
- [ ] Styling matches theme in light mode
- [ ] Styling matches theme in dark mode
- [ ] Toast doesn't overlap tab bar
- [ ] Toast doesn't overlap headers

**Step 3: Final commit if any fixes needed**

---

## Summary

| Task  | Description              | Files                                 |
| ----- | ------------------------ | ------------------------------------- |
| 1     | Create toast utility     | `lib/toast.ts`                        |
| 2     | Add jest mock            | `jest.setup.js`                       |
| 3     | Write toast tests        | `__tests__/lib/toast.test.ts`         |
| 4     | Integrate in root layout | `app/_layout.tsx`                     |
| 5-12  | Migrate screens          | `app/*.tsx`, `app/(app)/(tabs)/*.tsx` |
| 13-15 | Migrate components       | `components/*.tsx`                    |
| 16    | Update test assertions   | `__tests__/**/*.test.ts`              |
| 17    | Update CHANGELOG         | `CHANGELOG.md`                        |
| 18    | Final verification       | N/A                                   |
