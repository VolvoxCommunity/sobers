# Toast Notification System Design

**Date:** 2025-12-11
**Status:** Approved

## Overview

Replace success and error alerts with `react-native-toast-message` for a unified, non-blocking notification experience across all platforms.

## Scope

### What changes:

- **Success notifications** → Auto-dismissing toasts (3s)
- **Error notifications** → Auto-dismissing toasts (5s, longer for readability)

### What stays unchanged:

- **Confirmation dialogs** → Keep `Alert.alert` for destructive actions (sign out, delete account, disconnect sponsor)

### What gets removed:

- All `Platform.OS === 'web'` branching for `window.alert` vs `Alert.alert`
- ~35 alert calls converted to toast calls

## Key Decisions

| Decision          | Choice                | Rationale                                                  |
| ----------------- | --------------------- | ---------------------------------------------------------- |
| Scope             | Success + error only  | Confirmations need blocking modals for user acknowledgment |
| Error duration    | 5s vs 3s success      | Errors contain important info users need time to read      |
| Platform handling | Unified toasts        | Removes ~30 platform checks, simplifies code               |
| API pattern       | Direct function calls | Works outside React components, simpler than hooks         |
| Position          | Top of screen         | Avoids overlap with bottom tab navigation                  |
| Styling           | Custom themed         | Matches app design with dark/light mode support            |

## Technical Design

### Installation

```bash
pnpm add react-native-toast-message
```

### File Structure

```
lib/
└── toast.ts           # Toast config + showToast API

app/
└── _layout.tsx        # <Toast /> component mounted at root
```

### Toast API (`lib/toast.ts`)

```typescript
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message';

/**
 * Show a success toast notification.
 * Auto-dismisses after 3 seconds.
 */
export const showToast = {
  success: (message: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      visibilityTime: 3000,
    });
  },

  /**
   * Show an error toast notification.
   * Auto-dismisses after 5 seconds (longer for readability).
   */
  error: (message: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      visibilityTime: 5000,
    });
  },

  /**
   * Show an info toast notification.
   * Auto-dismisses after 3 seconds.
   */
  info: (message: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      visibilityTime: 3000,
    });
  },
};
```

### Custom Toast Config

The `toastConfig` provides themed renderers for each toast type:

- **Background:** Theme surface color (adapts to dark/light)
- **Border accent:** Green (success), red (error), blue (info)
- **Text:** Theme text color
- **Font:** JetBrains Mono for consistency
- **Shadow/elevation:** Subtle depth
- **Rounded corners:** Match app design language

### Root Layout Integration (`app/_layout.tsx`)

```typescript
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/lib/toast';

export default function RootLayout() {
  return (
    <>
      {/* existing layout content */}
      <Toast config={toastConfig} position="top" topOffset={60} />
    </>
  );
}
```

**`topOffset={60}`** accounts for status bar and headers.

## Migration Pattern

### Before (current):

```typescript
if (Platform.OS === 'web') {
  window.alert('Task deleted successfully');
} else {
  Alert.alert('Success', 'Task deleted successfully');
}
```

### After (unified):

```typescript
import { showToast } from '@/lib/toast';

showToast.success('Task deleted successfully');
```

### Confirmations stay unchanged:

```typescript
Alert.alert('Confirm Delete', 'Are you sure?', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'Delete', style: 'destructive', onPress: handleDelete },
]);
```

## Files to Migrate

| File                                         | Success→Toast | Error→Toast | Confirm→Keep |
| -------------------------------------------- | ------------- | ----------- | ------------ |
| `app/login.tsx`                              | 0             | 3           | 0            |
| `app/signup.tsx`                             | 0             | 5           | 0            |
| `app/onboarding.tsx`                         | 0             | 3           | 0            |
| `app/settings.tsx`                           | 2             | 3           | 2            |
| `app/(tabs)/profile.tsx`                     | 4             | 4           | 2            |
| `app/(tabs)/tasks.tsx`                       | 2             | 2           | 1            |
| `app/(tabs)/manage-tasks.tsx`                | 1             | 1           | 1            |
| `app/(tabs)/index.tsx`                       | 1             | 1           | 1            |
| `components/SettingsSheet.tsx`               | 1             | 3           | 2            |
| `components/sheets/LogSlipUpSheet.tsx`       | 0             | 0           | 1            |
| `components/sheets/EditDisplayNameSheet.tsx` | 0             | 0           | 1            |

**Total:** ~35 conversions to toast, ~11 confirmations unchanged.

## Testing Strategy

### New Tests (`__tests__/lib/toast.test.ts`)

- Verify `showToast.success()` calls `Toast.show()` with correct params
- Verify `showToast.error()` uses 5000ms visibility
- Verify `showToast.info()` uses 3000ms visibility

### Jest Mock (`jest.setup.js`)

```typescript
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
  __esModule: true,
  default: jest.fn(),
}));
```

### Test Migration Pattern

```typescript
// Before
expect(Alert.alert).toHaveBeenCalledWith('Success', 'Task deleted');

// After
import Toast from 'react-native-toast-message';
expect(Toast.show).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'success', text1: 'Task deleted' })
);
```

### Visual Verification Checklist

- [ ] Toast appears at top of screen
- [ ] Success toast auto-dismisses after ~3s
- [ ] Error toast auto-dismisses after ~5s
- [ ] Styling matches theme in light mode
- [ ] Styling matches theme in dark mode
- [ ] Toast doesn't overlap tab bar
- [ ] Toast doesn't overlap headers
- [ ] Multiple toasts queue properly

## Implementation Order

1. Install `react-native-toast-message`
2. Create `lib/toast.ts` with config and API
3. Add `<Toast />` to root layout
4. Update jest mock in `jest.setup.js`
5. Create `__tests__/lib/toast.test.ts`
6. Migrate files (login → signup → onboarding → settings → tabs → sheets)
7. Update affected test files
8. Visual verification (light + dark mode)
9. Run full test suite and ensure coverage ≥80%
