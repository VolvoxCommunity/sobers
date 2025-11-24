# Merge Tasks Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the "Tasks" and "Manage Tasks" tabs into a single unified "Tasks" screen with a segmented control toggle.

**Architecture:** Single Tasks screen with two views ("My Tasks" for sponsee tasks, "Manage" for sponsor tasks) controlled by a reusable SegmentedControl component. Context-aware default based on pending tasks.

**Tech Stack:** React Native, Expo Router, TypeScript, Supabase

---

## Task 1: Create SegmentedControl Component

**Files:**

- Create: `components/SegmentedControl.tsx`
- Test: `__tests__/components/SegmentedControl.test.tsx`

**Step 1: Write the failing test**

Create `__tests__/components/SegmentedControl.test.tsx`:

```tsx
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SegmentedControl from '@/components/SegmentedControl';

describe('SegmentedControl', () => {
  const defaultProps = {
    segments: ['My Tasks', 'Manage'],
    activeIndex: 0,
    onChange: jest.fn(),
  };

  it('renders all segments', () => {
    let component: any;
    act(() => {
      component = renderer.create(
        <ThemeProvider>
          <SegmentedControl {...defaultProps} />
        </ThemeProvider>
      );
    });

    const tree = component.toJSON();
    expect(tree).toBeDefined();

    const findText = (node: any, text: string): boolean => {
      if (!node) return false;
      if (node.children && node.children.includes(text)) return true;
      if (Array.isArray(node)) {
        return node.some((child) => findText(child, text));
      }
      if (node.children) {
        return findText(node.children, text);
      }
      return false;
    };

    expect(findText(tree, 'My Tasks')).toBe(true);
    expect(findText(tree, 'Manage')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/SegmentedControl.test.tsx`
Expected: FAIL with "Cannot find module '@/components/SegmentedControl'"

**Step 3: Write minimal implementation**

Create `components/SegmentedControl.tsx`:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SegmentedControlProps {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function SegmentedControl({
  segments,
  activeIndex,
  onChange,
}: SegmentedControlProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={segment}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {segment}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 4,
      marginHorizontal: 16,
      marginVertical: 12,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    segmentTextActive: {
      color: '#ffffff',
    },
  });
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/SegmentedControl.test.tsx`
Expected: PASS

**Step 5: Run quality checks and commit**

```bash
pnpm format && pnpm lint && pnpm typecheck
git add components/SegmentedControl.tsx __tests__/components/SegmentedControl.test.tsx
git commit -m "feat: add reusable SegmentedControl component"
```

---

## Task 2: Remove manage-tasks Tab from Navigation

**Files:**

- Modify: `app/(tabs)/_layout.tsx`

**Step 1: Update tab layout - remove manage-tasks route and ClipboardList import**

Change the imports and tabRoutes array:

From:

```tsx
import { Home, BookOpen, TrendingUp, CheckSquare, User, ClipboardList } from 'lucide-react-native';
```

To:

```tsx
import { Home, BookOpen, TrendingUp, CheckSquare, User } from 'lucide-react-native';
```

From:

```tsx
const tabRoutes = [
  { route: '/', name: 'index', title: 'Home', icon: Home },
  { route: '/steps', name: 'steps', title: 'Steps', icon: BookOpen },
  { route: '/journey', name: 'journey', title: 'Journey', icon: TrendingUp },
  { route: '/tasks', name: 'tasks', title: 'Tasks', icon: CheckSquare },
  {
    route: '/manage-tasks',
    name: 'manage-tasks',
    title: 'Manage',
    icon: ClipboardList,
  },
  { route: '/profile', name: 'profile', title: 'Profile', icon: User },
];
```

To:

```tsx
const tabRoutes = [
  { route: '/', name: 'index', title: 'Home', icon: Home },
  { route: '/steps', name: 'steps', title: 'Steps', icon: BookOpen },
  { route: '/journey', name: 'journey', title: 'Journey', icon: TrendingUp },
  { route: '/tasks', name: 'tasks', title: 'Tasks', icon: CheckSquare },
  { route: '/profile', name: 'profile', title: 'Profile', icon: User },
];
```

**Step 2: Remove Tabs.Screen for manage-tasks**

Remove:

```tsx
<Tabs.Screen name="manage-tasks" />
```

**Step 3: Run quality checks and commit**

```bash
pnpm format && pnpm lint && pnpm typecheck
git add app/\(tabs\)/_layout.tsx
git commit -m "refactor: remove manage-tasks tab from navigation (6 → 5 tabs)"
```

---

## Task 3: Rewrite Tasks Screen - Complete Merged Implementation

**Files:**

- Replace: `app/(tabs)/tasks.tsx` (full rewrite)

**Step 1: Replace entire file with merged implementation**

The new `app/(tabs)/tasks.tsx` combines both views. See the complete code below.

Key sections:

1. Imports - add all needed icons, SegmentedControl, TaskCreationModal, Profile type
2. State - viewMode, myTasks, manageTasks, sponsees, filters, modals
3. Data fetching - fetchMyTasks(), fetchManageData(), initializeView()
4. My Tasks view - stats, pending tasks, show/hide completed toggle
5. Manage view - stats, filters, grouped tasks by sponsee, FAB
6. Modals - task completion modal, task creation modal
7. Styles - combined styles from both original files

**Step 2: Run quality checks**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build
```

**Step 3: Commit**

```bash
git add app/\(tabs\)/tasks.tsx
git commit -m "feat: merge Tasks and Manage Tasks into unified screen with segmented control"
```

---

## Task 4: Delete manage-tasks.tsx

**Files:**

- Delete: `app/(tabs)/manage-tasks.tsx`

**Step 1: Delete the file**

```bash
rm app/\(tabs\)/manage-tasks.tsx
```

**Step 2: Run quality checks**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated manage-tasks.tsx screen"
```

---

## Task 5: Final Verification

**Step 1: Run full quality check suite**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

**Step 2: Manual testing checklist**

Run: `pnpm dev`

Verify:

- [ ] Bottom nav shows 5 tabs (Home, Steps, Journey, Tasks, Profile)
- [ ] Tasks screen shows segmented control with "My Tasks" | "Manage"
- [ ] Default view is "My Tasks" if user has pending tasks
- [ ] Default view is "Manage" if user has no pending tasks
- [ ] Stats row shows correct counts for each view
- [ ] "Show completed" toggle works in My Tasks view
- [ ] Filter chips work in Manage view
- [ ] Task completion modal works
- [ ] Task creation modal works
- [ ] Pull-to-refresh works in both views
