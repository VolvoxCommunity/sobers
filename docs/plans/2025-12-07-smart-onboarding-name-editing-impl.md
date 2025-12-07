# Smart Onboarding & Name Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Skip the name entry step in onboarding when OAuth provides complete name data, and allow users to edit their name in Settings.

**Architecture:** Modify onboarding to compute initial step based on profile completeness, add useEffect to auto-advance if profile updates. Add new Account section to Settings with modal-based name editing that updates Supabase and refreshes AuthContext.

**Tech Stack:** React Native, Expo Router, Supabase, Jest + React Native Testing Library

---

## Task 1: Onboarding - Smart Initial Step Selection

**Files:**

- Modify: `app/onboarding.tsx:51-54`
- Test: `__tests__/app/onboarding.test.tsx`

**Step 1: Write the failing tests for smart step selection**

Add these tests to `__tests__/app/onboarding.test.tsx`:

```typescript
describe('Smart Step Selection', () => {
  it('starts at Step 2 when profile has both first_name and last_initial', async () => {
    const completeProfile = {
      ...mockProfile,
      first_name: 'John',
      last_initial: 'D',
      sobriety_date: null, // Still needs sobriety date
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: completeProfile,
      refreshProfile: mockRefreshProfile,
      signOut: mockSignOut,
    });

    const { queryByText } = render(<OnboardingScreen />);

    // Should show Step 2 content (sobriety date), not Step 1 (name entry)
    await waitFor(() => {
      expect(queryByText('Your Sobriety Date')).toBeTruthy();
      expect(queryByText("Let's get to know you better.")).toBeNull();
    });
  });

  it('starts at Step 1 when first_name is null', async () => {
    const incompleteProfile = {
      ...mockProfile,
      first_name: null,
      last_initial: 'D',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: incompleteProfile,
      refreshProfile: mockRefreshProfile,
      signOut: mockSignOut,
    });

    const { getByText } = render(<OnboardingScreen />);

    await waitFor(() => {
      expect(getByText("Let's get to know you better.")).toBeTruthy();
    });
  });

  it('starts at Step 1 when last_initial is null', async () => {
    const incompleteProfile = {
      ...mockProfile,
      first_name: 'John',
      last_initial: null,
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: incompleteProfile,
      refreshProfile: mockRefreshProfile,
      signOut: mockSignOut,
    });

    const { getByText } = render(<OnboardingScreen />);

    await waitFor(() => {
      expect(getByText("Let's get to know you better.")).toBeTruthy();
    });
  });

  it('starts at Step 1 when name has placeholder values', async () => {
    const placeholderProfile = {
      ...mockProfile,
      first_name: 'User',
      last_initial: 'U',
    };

    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      profile: placeholderProfile,
      refreshProfile: mockRefreshProfile,
      signOut: mockSignOut,
    });

    const { getByText } = render(<OnboardingScreen />);

    await waitFor(() => {
      expect(getByText("Let's get to know you better.")).toBeTruthy();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "Smart Step Selection"`
Expected: FAIL - tests expect Step 2 but always see Step 1

**Step 3: Implement smart initial step in onboarding.tsx**

Modify `app/onboarding.tsx` around line 51-54. Replace:

```typescript
const [step, setStep] = useState(1);
// Pre-fill name fields from OAuth profile if available (e.g., Google sign-in)
const [firstName, setFirstName] = useState(profile?.first_name ?? '');
const [lastInitial, setLastInitial] = useState(profile?.last_initial ?? '');
```

With:

```typescript
// Check if profile has complete name from OAuth (non-null, non-placeholder)
const hasCompleteName =
  profile?.first_name !== null &&
  profile?.first_name !== undefined &&
  profile?.last_initial !== null &&
  profile?.last_initial !== undefined &&
  profile?.first_name !== 'User' &&
  profile?.last_initial !== 'U';

// Skip Step 1 (name entry) if OAuth already provided complete name
const [step, setStep] = useState(hasCompleteName ? 2 : 1);
// Pre-fill name fields from OAuth profile if available (e.g., Google sign-in)
const [firstName, setFirstName] = useState(profile?.first_name ?? '');
const [lastInitial, setLastInitial] = useState(profile?.last_initial ?? '');
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "Smart Step Selection"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/onboarding.tsx __tests__/app/onboarding.test.tsx
git commit -m "feat(onboarding): skip name step when OAuth provides complete name"
```

---

## Task 2: Onboarding - Auto-Advance from Step 1

**Files:**

- Modify: `app/onboarding.tsx` (add useEffect after step state)
- Test: `__tests__/app/onboarding.test.tsx`

**Step 1: Write the failing test for auto-advance**

Add to `__tests__/app/onboarding.test.tsx` in the "Smart Step Selection" describe block:

```typescript
it('auto-advances from Step 1 to Step 2 when profile updates with complete name', async () => {
  const incompleteProfile = {
    ...mockProfile,
    first_name: null,
    last_initial: null,
  };

  const completeProfile = {
    ...mockProfile,
    first_name: 'John',
    last_initial: 'D',
  };

  // Start with incomplete profile
  const mockUseAuth = useAuth as jest.Mock;
  mockUseAuth.mockReturnValue({
    user: mockUser,
    profile: incompleteProfile,
    refreshProfile: mockRefreshProfile,
    signOut: mockSignOut,
  });

  const { getByText, rerender, queryByText } = render(<OnboardingScreen />);

  // Verify we start at Step 1
  await waitFor(() => {
    expect(getByText("Let's get to know you better.")).toBeTruthy();
  });

  // Simulate profile update (e.g., from refresh or async update)
  mockUseAuth.mockReturnValue({
    user: mockUser,
    profile: completeProfile,
    refreshProfile: mockRefreshProfile,
    signOut: mockSignOut,
  });

  // Re-render to trigger useEffect
  rerender(<OnboardingScreen />);

  // Should auto-advance to Step 2
  await waitFor(() => {
    expect(queryByText('Your Sobriety Date')).toBeTruthy();
    expect(queryByText("Let's get to know you better.")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "auto-advances from Step 1"`
Expected: FAIL - Step 2 not shown after profile update

**Step 3: Add auto-advance useEffect**

In `app/onboarding.tsx`, add this useEffect after the step state declaration (around line 60):

```typescript
// Auto-advance to Step 2 if profile updates with complete name while on Step 1
// This handles: page refresh, navigation quirks, async profile data arrival
useEffect(() => {
  if (step === 1 && hasCompleteName) {
    setStep(2);
  }
}, [step, hasCompleteName]);
```

Note: `hasCompleteName` needs to be computed in a way that updates when profile changes. Update the implementation to use useMemo or compute inside the component body (already done in Task 1).

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "auto-advances from Step 1"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/onboarding.tsx __tests__/app/onboarding.test.tsx
git commit -m "feat(onboarding): auto-advance to Step 2 when profile updates with name"
```

---

## Task 3: Settings - Add Account Section UI

**Files:**

- Modify: `app/settings.tsx`
- Test: `__tests__/app/settings.test.tsx`

**Step 1: Write the failing test for Account section**

Add to `__tests__/app/settings.test.tsx`:

```typescript
describe('Account Section', () => {
  it('renders Account section with current name displayed', async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Account')).toBeTruthy();
      expect(getByText('Name')).toBeTruthy();
      expect(getByText('Test D.')).toBeTruthy(); // mockProfile has first_name: 'Test', last_initial: 'D'
    });
  });

  it('opens edit modal when tapping the name row', async () => {
    const { getByText, getByTestId } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Test D.')).toBeTruthy();
    });

    // Tap the account row
    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Name')).toBeTruthy();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "Account Section"`
Expected: FAIL - "Account" text not found

**Step 3: Add Account section to Settings**

In `app/settings.tsx`, add the following:

1. Import `User` icon at the top (around line 33):

```typescript
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Github,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Download,
  AlertCircle,
  Info,
  Copy,
  User, // Add this
} from 'lucide-react-native';
```

2. Get profile from useAuth (around line 236):

```typescript
const { signOut, deleteAccount, profile, refreshProfile } = useAuth();
```

3. Add modal state (around line 242):

```typescript
const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
const [editFirstName, setEditFirstName] = useState('');
const [editLastInitial, setEditLastInitial] = useState('');
```

4. Add Account section JSX right after the ScrollView opens (before Appearance section, around line 461):

```typescript
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Account</Text>
  <View style={styles.card}>
    <TouchableOpacity
      style={styles.menuItem}
      testID="account-name-row"
      onPress={() => {
        setEditFirstName(profile?.first_name ?? '');
        setEditLastInitial(profile?.last_initial ?? '');
        setIsEditNameModalVisible(true);
      }}
      accessibilityRole="button"
      accessibilityLabel="Edit your name"
    >
      <View style={styles.menuItemLeft}>
        <User size={20} color={theme.textSecondary} />
        <View>
          <Text style={styles.menuItemText}>Name</Text>
          <Text style={styles.menuItemSubtext}>
            {profile?.first_name} {profile?.last_initial}.
          </Text>
        </View>
      </View>
      <ChevronLeft
        size={20}
        color={theme.textTertiary}
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </TouchableOpacity>
  </View>
</View>
```

5. Add menuItemSubtext style (in createStyles function):

```typescript
menuItemSubtext: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
  marginTop: 2,
},
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "renders Account section"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/settings.tsx __tests__/app/settings.test.tsx
git commit -m "feat(settings): add Account section with name display"
```

---

## Task 4: Settings - Name Edit Modal

**Files:**

- Modify: `app/settings.tsx`
- Test: `__tests__/app/settings.test.tsx`

**Step 1: Write failing tests for modal functionality**

Add to `__tests__/app/settings.test.tsx` in the "Account Section" describe block:

```typescript
it('pre-fills modal inputs with current name values', async () => {
  const { getByTestId, getByDisplayValue } = render(<SettingsScreen />);

  await waitFor(() => {
    fireEvent.press(getByTestId('account-name-row'));
  });

  await waitFor(() => {
    expect(getByDisplayValue('Test')).toBeTruthy(); // First name
    expect(getByDisplayValue('D')).toBeTruthy(); // Last initial
  });
});

it('validates first name is required', async () => {
  const { getByTestId, getByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  // Clear first name
  const firstNameInput = getByTestId('edit-first-name-input');
  fireEvent.changeText(firstNameInput, '');

  // Try to save
  fireEvent.press(getByTestId('save-name-button'));

  // Should show validation error
  await waitFor(() => {
    expect(getByText('First name is required')).toBeTruthy();
  });
});

it('validates last initial is exactly 1 character', async () => {
  const { getByTestId, getByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  // Set invalid last initial
  const lastInitialInput = getByTestId('edit-last-initial-input');
  fireEvent.changeText(lastInitialInput, 'AB');

  // Try to save
  fireEvent.press(getByTestId('save-name-button'));

  // Should show validation error
  await waitFor(() => {
    expect(getByText('Last initial must be exactly 1 character')).toBeTruthy();
  });
});

it('closes modal on cancel', async () => {
  const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  fireEvent.press(getByTestId('cancel-name-button'));

  await waitFor(() => {
    expect(queryByText('Edit Name')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "Account Section"`
Expected: FAIL - modal elements not found

**Step 3: Add the name edit modal**

In `app/settings.tsx`:

1. Import Modal and TextInput at the top:

```typescript
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Modal, // Add this
  TextInput, // Add this
} from 'react-native';
```

2. Add validation error state (around line 245):

```typescript
const [nameValidationError, setNameValidationError] = useState<string | null>(null);
```

3. Add the Modal component before the closing `</ScrollView>` tag (around line 944):

```typescript
<Modal
  visible={isEditNameModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setIsEditNameModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.editNameModal}>
      <Text style={styles.modalTitle}>Edit Name</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          testID="edit-first-name-input"
          style={styles.textInput}
          value={editFirstName}
          onChangeText={(text) => {
            setEditFirstName(text);
            setNameValidationError(null);
          }}
          placeholder="Enter first name"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Last Initial</Text>
        <TextInput
          testID="edit-last-initial-input"
          style={styles.textInput}
          value={editLastInitial}
          onChangeText={(text) => {
            setEditLastInitial(text.toUpperCase().slice(0, 1));
            setNameValidationError(null);
          }}
          placeholder="Enter last initial"
          placeholderTextColor={theme.textTertiary}
          maxLength={1}
          autoCapitalize="characters"
        />
      </View>

      {nameValidationError && (
        <Text style={styles.validationError}>{nameValidationError}</Text>
      )}

      <View style={styles.modalButtons}>
        <TouchableOpacity
          testID="cancel-name-button"
          style={styles.modalCancelButton}
          onPress={() => {
            setIsEditNameModalVisible(false);
            setNameValidationError(null);
          }}
        >
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="save-name-button"
          style={styles.modalSaveButton}
          onPress={() => {
            // Validation
            if (!editFirstName.trim()) {
              setNameValidationError('First name is required');
              return;
            }
            if (editLastInitial.length !== 1) {
              setNameValidationError('Last initial must be exactly 1 character');
              return;
            }
            // TODO: Save to Supabase (Task 5)
          }}
        >
          <Text style={styles.modalSaveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

4. Add modal styles to createStyles:

```typescript
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
editNameModal: {
  backgroundColor: theme.surface,
  borderRadius: 16,
  padding: 24,
  width: '100%',
  maxWidth: 400,
},
modalTitle: {
  fontSize: 20,
  fontFamily: theme.fontRegular,
  fontWeight: '700',
  color: theme.text,
  marginBottom: 20,
  textAlign: 'center',
},
inputGroup: {
  marginBottom: 16,
},
inputLabel: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  fontWeight: '600',
  color: theme.textSecondary,
  marginBottom: 8,
},
textInput: {
  backgroundColor: theme.card,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 12,
  padding: 14,
  fontSize: 16,
  fontFamily: theme.fontRegular,
  color: theme.text,
},
validationError: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  color: theme.danger,
  marginBottom: 16,
  textAlign: 'center',
},
modalButtons: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 8,
},
modalCancelButton: {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  backgroundColor: theme.card,
  borderWidth: 1,
  borderColor: theme.border,
  alignItems: 'center',
},
modalCancelText: {
  fontSize: 16,
  fontFamily: theme.fontRegular,
  fontWeight: '600',
  color: theme.text,
},
modalSaveButton: {
  flex: 1,
  padding: 14,
  borderRadius: 12,
  backgroundColor: theme.primary,
  alignItems: 'center',
},
modalSaveText: {
  fontSize: 16,
  fontFamily: theme.fontRegular,
  fontWeight: '600',
  color: theme.white,
},
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "Account Section"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/settings.tsx __tests__/app/settings.test.tsx
git commit -m "feat(settings): add name edit modal with validation"
```

---

## Task 5: Settings - Save Name to Supabase

**Files:**

- Modify: `app/settings.tsx`
- Test: `__tests__/app/settings.test.tsx`

**Step 1: Write failing tests for save functionality**

Add to `__tests__/app/settings.test.tsx`:

```typescript
it('calls Supabase update and refreshProfile on save', async () => {
  const mockUpdate = jest.fn().mockReturnValue({ error: null });
  const mockEq = jest.fn().mockReturnValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });

  (supabase.from as jest.Mock).mockReturnValue({
    update: mockUpdate,
  });

  const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  // Change name
  fireEvent.changeText(getByTestId('edit-first-name-input'), 'NewName');
  fireEvent.changeText(getByTestId('edit-last-initial-input'), 'X');

  // Save
  fireEvent.press(getByTestId('save-name-button'));

  await waitFor(() => {
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      first_name: 'NewName',
      last_initial: 'X',
    });
    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(queryByText('Edit Name')).toBeNull(); // Modal closed
  });
});

it('shows error alert on save failure', async () => {
  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({ error: { message: 'Database error' } }),
  });

  (supabase.from as jest.Mock).mockReturnValue({
    update: mockUpdate,
  });

  const alertSpy = jest.spyOn(Alert, 'alert');

  const { getByTestId, getByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  fireEvent.press(getByTestId('save-name-button'));

  await waitFor(() => {
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Database error');
  });
});

it('keeps modal open on error', async () => {
  const mockUpdate = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({ error: { message: 'Database error' } }),
  });

  (supabase.from as jest.Mock).mockReturnValue({
    update: mockUpdate,
  });

  const { getByTestId, getByText } = render(<SettingsScreen />);

  fireEvent.press(getByTestId('account-name-row'));

  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });

  fireEvent.press(getByTestId('save-name-button'));

  // Modal should still be open
  await waitFor(() => {
    expect(getByText('Edit Name')).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "calls Supabase update"`
Expected: FAIL - Supabase.from not called

**Step 3: Implement save functionality**

In `app/settings.tsx`:

1. Add import for supabase and logger:

```typescript
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
```

2. Add saving state (around line 246):

```typescript
const [isSavingName, setIsSavingName] = useState(false);
```

3. Add save handler function (around line 430, before the return):

```typescript
/**
 * Saves the updated name to Supabase and refreshes the profile.
 */
const handleSaveName = async () => {
  // Validation
  if (!editFirstName.trim()) {
    setNameValidationError('First name is required');
    return;
  }
  if (editLastInitial.length !== 1) {
    setNameValidationError('Last initial must be exactly 1 character');
    return;
  }

  setIsSavingName(true);
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editFirstName.trim(),
        last_initial: editLastInitial.toUpperCase(),
      })
      .eq('id', profile?.id);

    if (error) throw error;

    await refreshProfile();
    setIsEditNameModalVisible(false);
    setNameValidationError(null);

    if (Platform.OS === 'web') {
      window.alert('Name updated successfully');
    } else {
      Alert.alert('Success', 'Name updated successfully');
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Failed to update name');
    logger.error('Name update failed', err, {
      category: LogCategory.DATABASE,
    });
    if (Platform.OS === 'web') {
      window.alert('Error: ' + err.message);
    } else {
      Alert.alert('Error', err.message);
    }
  } finally {
    setIsSavingName(false);
  }
};
```

4. Update the save button onPress to call handleSaveName:

```typescript
<TouchableOpacity
  testID="save-name-button"
  style={[styles.modalSaveButton, isSavingName && styles.buttonDisabled]}
  onPress={handleSaveName}
  disabled={isSavingName}
>
  {isSavingName ? (
    <ActivityIndicator size="small" color={theme.white} />
  ) : (
    <Text style={styles.modalSaveText}>Save</Text>
  )}
</TouchableOpacity>
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/app/settings.test.tsx -t "Account Section"`
Expected: PASS

**Step 5: Commit**

```bash
git add app/settings.tsx __tests__/app/settings.test.tsx
git commit -m "feat(settings): implement name save to Supabase with error handling"
```

---

## Task 6: Run Full Test Suite & Validation

**Files:**

- All modified files

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run linter**

Run: `pnpm lint`
Expected: No errors (or only warnings)

**Step 3: Run formatter**

Run: `pnpm format`
Expected: Files formatted

**Step 4: Run full test suite**

Run: `pnpm test`
Expected: All tests pass, coverage above 80%

**Step 5: Run web build**

Run: `pnpm build:web`
Expected: Build succeeds

**Step 6: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: format and lint fixes"
```

---

## Summary

| Task | Description                  | Commit Message                                                            |
| ---- | ---------------------------- | ------------------------------------------------------------------------- |
| 1    | Smart initial step selection | `feat(onboarding): skip name step when OAuth provides complete name`      |
| 2    | Auto-advance from Step 1     | `feat(onboarding): auto-advance to Step 2 when profile updates with name` |
| 3    | Account section UI           | `feat(settings): add Account section with name display`                   |
| 4    | Name edit modal              | `feat(settings): add name edit modal with validation`                     |
| 5    | Save to Supabase             | `feat(settings): implement name save to Supabase with error handling`     |
| 6    | Validation                   | `chore: format and lint fixes`                                            |
