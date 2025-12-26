# Savings Card Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to configure or hide the Money Saved card on the dashboard, with the ability to re-enable from Settings.

**Architecture:** Add `hide_savings_card` boolean to profiles table. Show unconfigured state when spend data is missing. Add three-dot menu for hide action. Add Dashboard settings section for re-enabling.

**Tech Stack:** React Native, Supabase, TypeScript, lucide-react-native

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20251225000000_add_hide_savings_card_to_profiles.sql`

**Step 1: Write the migration file**

```sql
-- Add hide_savings_card column to profiles for dashboard customization
-- Default to false (card visible by default)

ALTER TABLE public.profiles
ADD COLUMN hide_savings_card BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hide_savings_card IS 'Whether to hide the Money Saved card from dashboard. User preference.';
```

**Step 2: Apply migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/20251225000000_add_hide_savings_card_to_profiles.sql
git commit -m "feat(db): add hide_savings_card column to profiles"
```

---

## Task 2: Update TypeScript Types

**Files:**

- Modify: `types/database.ts:25-82`

**Step 1: Add hide_savings_card to Profile interface**

Add after `spend_frequency` (around line 73):

```typescript
  /**
   * Whether to hide the Money Saved card from dashboard.
   * User preference set via three-dot menu on card or Settings.
   */
  hide_savings_card?: boolean;
```

**Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add hide_savings_card to Profile interface"
```

---

## Task 3: Create MoneySavedCard Unconfigured State Tests

**Files:**

- Modify: `__tests__/components/dashboard/MoneySavedCard.test.tsx`

**Step 1: Add tests for unconfigured variant**

Add new describe block:

```typescript
describe('Unconfigured State', () => {
  const unconfiguredProps = {
    variant: 'unconfigured' as const,
    onSetup: jest.fn(),
    onHide: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render setup prompt', () => {
    renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
    expect(screen.getByText('Track Money Saved')).toBeTruthy();
  });

  it('should render setup description', () => {
    renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
    expect(screen.getByText(/Set up spending tracking/)).toBeTruthy();
  });

  it('should call onSetup when card is pressed', () => {
    renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
    fireEvent.press(screen.getByTestId('money-saved-card'));
    expect(unconfiguredProps.onSetup).toHaveBeenCalled();
  });

  it('should render three-dot menu', () => {
    renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
    expect(screen.getByTestId('money-saved-menu-button')).toBeTruthy();
  });

  it('should call onHide when hide option is selected', () => {
    renderWithProviders(<MoneySavedCard {...unconfiguredProps} />);
    fireEvent.press(screen.getByTestId('money-saved-menu-button'));
    fireEvent.press(screen.getByText('Hide from dashboard'));
    expect(unconfiguredProps.onHide).toHaveBeenCalled();
  });
});
```

**Step 2: Add tests for configured state menu**

Add to existing describe block:

```typescript
describe('Three-Dot Menu (Configured)', () => {
  it('should render three-dot menu button', () => {
    renderWithProviders(<MoneySavedCard {...defaultProps} onHide={jest.fn()} />);
    expect(screen.getByTestId('money-saved-menu-button')).toBeTruthy();
  });

  it('should show menu options when button is pressed', () => {
    renderWithProviders(<MoneySavedCard {...defaultProps} onHide={jest.fn()} />);
    fireEvent.press(screen.getByTestId('money-saved-menu-button'));
    expect(screen.getByText('Edit savings')).toBeTruthy();
    expect(screen.getByText('Hide from dashboard')).toBeTruthy();
  });

  it('should call onPress when Edit savings is selected', () => {
    renderWithProviders(<MoneySavedCard {...defaultProps} onHide={jest.fn()} />);
    fireEvent.press(screen.getByTestId('money-saved-menu-button'));
    fireEvent.press(screen.getByText('Edit savings'));
    expect(defaultProps.onPress).toHaveBeenCalled();
  });

  it('should call onHide when Hide from dashboard is selected', () => {
    const onHide = jest.fn();
    renderWithProviders(<MoneySavedCard {...defaultProps} onHide={onHide} />);
    fireEvent.press(screen.getByTestId('money-saved-menu-button'));
    fireEvent.press(screen.getByText('Hide from dashboard'));
    expect(onHide).toHaveBeenCalled();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm test -- __tests__/components/dashboard/MoneySavedCard.test.tsx`
Expected: Tests fail (new props/variants not implemented)

**Step 4: Commit**

```bash
git add __tests__/components/dashboard/MoneySavedCard.test.tsx
git commit -m "test(MoneySavedCard): add tests for unconfigured state and menu"
```

---

## Task 4: Implement MoneySavedCard Variants and Menu

**Files:**

- Modify: `components/dashboard/MoneySavedCard.tsx`

**Step 1: Update imports**

```typescript
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { DollarSign, MoreVertical, Edit3, EyeOff } from 'lucide-react-native';
import { calculateSavings, formatCurrency, type SpendingFrequency } from '@/lib/savings';
```

**Step 2: Update types**

```typescript
// =============================================================================
// Types
// =============================================================================

interface ConfiguredMoneySavedCardProps {
  variant?: 'configured';
  /** Historical spending amount */
  amount: number;
  /** Spending frequency */
  frequency: SpendingFrequency;
  /** Days since sobriety start */
  daysSober: number;
  /** Callback when card is pressed (opens edit sheet) */
  onPress: () => void;
  /** Callback when hide option is selected */
  onHide: () => void;
}

interface UnconfiguredMoneySavedCardProps {
  variant: 'unconfigured';
  /** Callback when card is pressed (opens setup sheet) */
  onSetup: () => void;
  /** Callback when hide option is selected */
  onHide: () => void;
}

type MoneySavedCardProps = ConfiguredMoneySavedCardProps | UnconfiguredMoneySavedCardProps;
```

**Step 3: Implement Menu component**

```typescript
// =============================================================================
// Menu Component
// =============================================================================

interface MenuProps {
  isVisible: boolean;
  onClose: () => void;
  options: { label: string; icon: React.ReactNode; onPress: () => void }[];
  theme: ThemeColors;
  anchorStyle?: object;
}

function CardMenu({ isVisible, onClose, options, theme, anchorStyle }: MenuProps) {
  const menuStyles = useMemo(() => createMenuStyles(theme), [theme]);

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <View style={[menuStyles.menu, anchorStyle]}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.label}
              style={[menuStyles.menuItem, index > 0 && menuStyles.menuItemBorder]}
              onPress={() => {
                onClose();
                option.onPress();
              }}
            >
              {option.icon}
              <Text style={menuStyles.menuItemText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
```

**Step 4: Update main component**

```typescript
// =============================================================================
// Component
// =============================================================================

export default function MoneySavedCard(props: MoneySavedCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [menuVisible, setMenuVisible] = useState(false);

  // Unconfigured variant
  if (props.variant === 'unconfigured') {
    const menuOptions = [
      {
        label: 'Hide from dashboard',
        icon: <EyeOff size={18} color={theme.textSecondary} />,
        onPress: props.onHide,
      },
    ];

    return (
      <>
        <TouchableOpacity
          testID="money-saved-card"
          style={styles.card}
          onPress={props.onSetup}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Set up money saved tracking. Tap to configure."
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <DollarSign size={24} color={theme.success} />
              <Text style={styles.headerTitle}>Track Money Saved</Text>
            </View>
            <TouchableOpacity
              testID="money-saved-menu-button"
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="More options"
            >
              <MoreVertical size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.setupDescription}>
            Set up spending tracking to see how much you've saved on your recovery journey
          </Text>

          <View style={styles.setupPrompt}>
            <Text style={styles.setupPromptText}>Tap to get started</Text>
          </View>
        </TouchableOpacity>

        <CardMenu
          isVisible={menuVisible}
          onClose={() => setMenuVisible(false)}
          options={menuOptions}
          theme={theme}
        />
      </>
    );
  }

  // Configured variant (existing logic)
  const { amount, frequency, daysSober, onPress, onHide } = props;

  const savings = useMemo(
    () => calculateSavings(amount, frequency, daysSober),
    [amount, frequency, daysSober]
  );

  const menuOptions = [
    {
      label: 'Edit savings',
      icon: <Edit3 size={18} color={theme.textSecondary} />,
      onPress: onPress,
    },
    {
      label: 'Hide from dashboard',
      icon: <EyeOff size={18} color={theme.textSecondary} />,
      onPress: onHide,
    },
  ];

  return (
    <>
      <TouchableOpacity
        testID="money-saved-card"
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Money saved: ${formatCurrency(savings.totalSaved)}. Tap to edit.`}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DollarSign size={24} color={theme.success} />
            <Text style={styles.headerTitle}>Money Saved</Text>
          </View>
          <TouchableOpacity
            testID="money-saved-menu-button"
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="More options"
          >
            <MoreVertical size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text testID="money-saved-total" style={styles.totalAmount}>
          {formatCurrency(savings.totalSaved)}
        </Text>

        <Text style={styles.basisText}>
          Based on {formatCurrency(amount)}/{frequency} spending
        </Text>

        <View style={styles.breakdownContainer}>
          <View testID="breakdown-day" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Day</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perDay)}</Text>
          </View>
          <View testID="breakdown-week" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Week</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perWeek)}</Text>
          </View>
          <View testID="breakdown-month" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Month</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perMonth)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <CardMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={menuOptions}
        theme={theme}
      />
    </>
  );
}
```

**Step 5: Update styles**

Add to createStyles:

```typescript
headerLeft: {
  flexDirection: 'row',
  alignItems: 'center',
},
menuButton: {
  padding: 4,
},
setupDescription: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
  textAlign: 'center',
  marginBottom: 20,
  paddingHorizontal: 16,
},
setupPrompt: {
  backgroundColor: theme.primaryLight,
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 20,
  alignSelf: 'center',
},
setupPromptText: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  fontWeight: '600',
  color: theme.primary,
},
```

Add createMenuStyles:

```typescript
const createMenuStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 180,
      paddingRight: 32,
    },
    menu: {
      backgroundColor: theme.card,
      borderRadius: 12,
      minWidth: 180,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    menuItemBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    menuItemText: {
      fontSize: 15,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
  });
```

**Step 6: Run tests to verify they pass**

Run: `pnpm test -- __tests__/components/dashboard/MoneySavedCard.test.tsx`
Expected: All tests pass

**Step 7: Commit**

```bash
git add components/dashboard/MoneySavedCard.tsx
git commit -m "feat(MoneySavedCard): add unconfigured state and three-dot menu"
```

---

## Task 5: Update Dashboard to Handle Card States

**Files:**

- Modify: `app/(app)/(tabs)/index.tsx:257-265`

**Step 1: Write test for dashboard card visibility logic**

Create `__tests__/app/index.test.tsx` (or update existing):

```typescript
describe('Money Saved Card Visibility', () => {
  it('should show unconfigured card when spend data is not set and not hidden', () => {
    // Profile: spend_amount=null, spend_frequency=null, hide_savings_card=false
    renderWithProviders(<HomeScreen />);
    expect(screen.getByText('Track Money Saved')).toBeTruthy();
  });

  it('should show configured card when spend data is set and not hidden', () => {
    // Profile: spend_amount=50, spend_frequency='weekly', hide_savings_card=false
    renderWithProviders(<HomeScreen />);
    expect(screen.getByTestId('money-saved-total')).toBeTruthy();
  });

  it('should hide card when hide_savings_card is true', () => {
    // Profile: hide_savings_card=true
    renderWithProviders(<HomeScreen />);
    expect(screen.queryByTestId('money-saved-card')).toBeNull();
  });
});
```

**Step 2: Update dashboard logic**

Replace lines 257-265:

```typescript
{/* Money Saved Card - show if not hidden */}
{!profile?.hide_savings_card && (
  profile?.spend_amount != null && profile?.spend_frequency != null ? (
    <MoneySavedCard
      amount={profile.spend_amount}
      frequency={profile.spend_frequency}
      daysSober={daysSober}
      onPress={() => savingsSheetRef.current?.present()}
      onHide={handleHideSavingsCard}
    />
  ) : (
    <MoneySavedCard
      variant="unconfigured"
      onSetup={() => savingsSheetRef.current?.present()}
      onHide={handleHideSavingsCard}
    />
  )
)}
```

**Step 3: Add handleHideSavingsCard function**

Add before the return statement:

```typescript
/**
 * Handles hiding the savings card from dashboard.
 * Shows confirmation dialog, then updates profile in Supabase.
 */
const handleHideSavingsCard = async () => {
  const confirmed = await showConfirm(
    'Hide Savings Card?',
    'You can re-enable this from Settings > Dashboard anytime.',
    'Hide',
    'Cancel',
    false
  );

  if (!confirmed || !profile) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ hide_savings_card: true })
      .eq('id', profile.id);

    if (error) throw error;

    await refreshProfile();
    showToast.success('Card hidden from dashboard');
  } catch (error) {
    logger.error('Failed to hide savings card', error as Error, {
      category: LogCategory.DATABASE,
    });
    showToast.error('Failed to hide card. Please try again.');
  }
};
```

**Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add app/(app)/(tabs)/index.tsx __tests__/app/index.test.tsx
git commit -m "feat(dashboard): show savings card in configured or unconfigured state"
```

---

## Task 6: Add Dashboard Settings Section Tests

**Files:**

- Modify: `__tests__/components/settings/SettingsContent.test.tsx`

**Step 1: Add tests for Dashboard section**

```typescript
describe('Dashboard Section', () => {
  it('should render Dashboard section', () => {
    renderWithProviders(<SettingsContent onDismiss={mockDismiss} />);
    expect(screen.getByText('Dashboard')).toBeTruthy();
  });

  it('should show savings card toggle', () => {
    renderWithProviders(<SettingsContent onDismiss={mockDismiss} />);
    expect(screen.getByText('Show savings card')).toBeTruthy();
  });

  it('should show toggle as ON when hide_savings_card is false', () => {
    // Profile with hide_savings_card: false
    renderWithProviders(<SettingsContent onDismiss={mockDismiss} />);
    const toggle = screen.getByTestId('settings-show-savings-toggle');
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it('should show toggle as OFF when hide_savings_card is true', () => {
    // Profile with hide_savings_card: true
    renderWithProviders(<SettingsContent onDismiss={mockDismiss} />);
    const toggle = screen.getByTestId('settings-show-savings-toggle');
    expect(toggle.props.accessibilityState.checked).toBe(false);
  });

  it('should call supabase update when toggle is pressed', async () => {
    renderWithProviders(<SettingsContent onDismiss={mockDismiss} />);
    fireEvent.press(screen.getByTestId('settings-show-savings-toggle'));
    // Verify supabase.from('profiles').update was called
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx`
Expected: Tests fail (Dashboard section not implemented)

**Step 3: Commit**

```bash
git add __tests__/components/settings/SettingsContent.test.tsx
git commit -m "test(SettingsContent): add tests for Dashboard section"
```

---

## Task 7: Implement Dashboard Settings Section

**Files:**

- Modify: `components/settings/SettingsContent.tsx`

**Step 1: Add Layout icon import**

```typescript
import {
  // ... existing imports
  Layout,
} from 'lucide-react-native';
```

**Step 2: Add isSavingsCardVisible state and toggle handler**

Add in state section:

```typescript
const [isSavingDashboard, setIsSavingDashboard] = useState(false);
```

Add handler:

```typescript
/**
 * Handles toggling the savings card visibility.
 * Updates profile in Supabase and refreshes profile state.
 */
const handleToggleSavingsCard = useCallback(async () => {
  if (!profile?.id || isSavingDashboard) return;

  setIsSavingDashboard(true);
  try {
    const newValue = profile.hide_savings_card ? false : true;
    const { error } = await supabase
      .from('profiles')
      .update({ hide_savings_card: newValue })
      .eq('id', profile.id);

    if (error) throw error;

    await refreshProfile();
    showToast.success(newValue ? 'Savings card hidden' : 'Savings card visible');
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to update setting');
    logger.error('Failed to toggle savings card visibility', err, {
      category: LogCategory.DATABASE,
    });
    showToast.error('Failed to update. Please try again.');
  } finally {
    setIsSavingDashboard(false);
  }
}, [profile?.id, profile?.hide_savings_card, isSavingDashboard, refreshProfile]);
```

**Step 3: Add Dashboard section (after Appearance section)**

```typescript
{/* Dashboard Section */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Dashboard</Text>
  <View style={styles.card}>
    <Pressable
      testID="settings-show-savings-toggle"
      style={styles.menuItem}
      onPress={handleToggleSavingsCard}
      disabled={isSavingDashboard}
      accessibilityRole="switch"
      accessibilityState={{ checked: !profile?.hide_savings_card }}
      accessibilityLabel="Show savings card on dashboard"
    >
      <View style={styles.menuItemLeft}>
        <Layout size={20} color={theme.textSecondary} />
        <View>
          <Text style={styles.menuItemText}>Show savings card</Text>
          <Text style={styles.menuItemSubtext}>
            Display money saved on home screen
          </Text>
        </View>
      </View>
      {isSavingDashboard ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View
          style={[
            styles.toggle,
            !profile?.hide_savings_card && styles.toggleActive,
          ]}
        >
          <Text style={styles.toggleText}>
            {profile?.hide_savings_card ? 'OFF' : 'ON'}
          </Text>
        </View>
      )}
    </Pressable>
  </View>
</View>
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx`
Expected: All tests pass

**Step 5: Commit**

```bash
git add components/settings/SettingsContent.tsx
git commit -m "feat(settings): add Dashboard section with savings card toggle"
```

---

## Task 8: Update EditSavingsSheet for Setup Mode

**Files:**

- Modify: `components/sheets/EditSavingsSheet.tsx`

**Step 1: Update tests**

Add to `__tests__/components/sheets/EditSavingsSheet.test.tsx`:

```typescript
describe('Setup Mode', () => {
  const setupModeProps = {
    profile: { ...mockProfile, spend_amount: null, spend_frequency: null },
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  it('should show setup title when spend data is not set', () => {
    renderWithProviders(<EditSavingsSheet ref={sheetRef} {...setupModeProps} />);
    sheetRef.current?.present();
    expect(screen.getByText('Set Up Savings Tracking')).toBeTruthy();
  });

  it('should not show Clear Data button in setup mode', () => {
    renderWithProviders(<EditSavingsSheet ref={sheetRef} {...setupModeProps} />);
    sheetRef.current?.present();
    expect(screen.queryByText('Clear Tracking Data')).toBeNull();
  });

  it('should show Get Started button in setup mode', () => {
    renderWithProviders(<EditSavingsSheet ref={sheetRef} {...setupModeProps} />);
    sheetRef.current?.present();
    expect(screen.getByText('Get Started')).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- __tests__/components/sheets/EditSavingsSheet.test.tsx`
Expected: Tests fail

**Step 3: Update component logic**

Add computed property:

```typescript
const isSetupMode = profile.spend_amount == null || profile.spend_frequency == null;
```

Update title:

```typescript
<Text style={styles.title}>
  {isSetupMode ? 'Set Up Savings Tracking' : 'Edit Savings Tracking'}
</Text>
```

Update save button:

```typescript
<TouchableOpacity
  testID="edit-savings-save-button"
  style={[styles.saveButton, isSaving && styles.buttonDisabled]}
  onPress={handleSave}
  disabled={isSaving || isClearing}
>
  {isSaving ? (
    <ActivityIndicator size="small" color={theme.white} />
  ) : (
    <Text style={styles.saveButtonText}>
      {isSetupMode ? 'Get Started' : 'Save Changes'}
    </Text>
  )}
</TouchableOpacity>
```

Conditionally render clear button:

```typescript
{!isSetupMode && (
  <TouchableOpacity
    testID="edit-savings-clear-button"
    style={styles.clearButton}
    onPress={handleClear}
    disabled={isSaving || isClearing}
  >
    {isClearing ? (
      <ActivityIndicator size="small" color={theme.danger} />
    ) : (
      <Text style={styles.clearButtonText}>Clear Tracking Data</Text>
    )}
  </TouchableOpacity>
)}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- __tests__/components/sheets/EditSavingsSheet.test.tsx`
Expected: All tests pass

**Step 5: Commit**

```bash
git add components/sheets/EditSavingsSheet.tsx __tests__/components/sheets/EditSavingsSheet.test.tsx
git commit -m "feat(EditSavingsSheet): add setup mode for first-time configuration"
```

---

## Task 9: Run Full Test Suite and Quality Checks

**Files:**

- All modified files

**Step 1: Run full quality checks**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
Expected: All pass with no errors

**Step 2: Fix any issues**

If any checks fail, fix the issues and re-run.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address linting and test issues"
```

---

## Task 10: Update CHANGELOG.md

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add entries under [Unreleased]**

```markdown
## [Unreleased]

### Added

- Savings card now visible on dashboard even when not configured, with setup prompt
- Three-dot menu on savings card with "Edit savings" and "Hide from dashboard" options
- Dashboard settings section in Settings with toggle to show/hide savings card
- `hide_savings_card` column in profiles table for persisting user preference

### Changed

- EditSavingsSheet now shows "Set Up Savings Tracking" title and "Get Started" button for first-time setup
- MoneySavedCard component now supports `unconfigured` variant with setup UI
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for savings card visibility feature"
```

---

## Task 11: Visual Verification

**Step 1: Start dev server**

Run: `pnpm web`

**Step 2: Test unconfigured state**

1. Create a new user or clear spend data
2. Verify unconfigured card shows on dashboard
3. Tap card to open setup sheet
4. Configure spending and save
5. Verify configured card now shows

**Step 3: Test hide flow**

1. Tap three-dot menu on card
2. Select "Hide from dashboard"
3. Confirm in dialog
4. Verify card disappears

**Step 4: Test re-enable flow**

1. Open Settings
2. Find Dashboard section
3. Toggle "Show savings card" to ON
4. Verify card reappears on dashboard

**Step 5: Document any issues**

If issues found, create follow-up tasks.

---

## Summary

| Task | Description                   | Files                                                    |
| ---- | ----------------------------- | -------------------------------------------------------- |
| 1    | Database migration            | `supabase/migrations/...`                                |
| 2    | TypeScript types              | `types/database.ts`                                      |
| 3    | MoneySavedCard tests          | `__tests__/components/dashboard/MoneySavedCard.test.tsx` |
| 4    | MoneySavedCard implementation | `components/dashboard/MoneySavedCard.tsx`                |
| 5    | Dashboard integration         | `app/(app)/(tabs)/index.tsx`                             |
| 6    | Settings tests                | `__tests__/components/settings/SettingsContent.test.tsx` |
| 7    | Settings implementation       | `components/settings/SettingsContent.tsx`                |
| 8    | EditSavingsSheet setup mode   | `components/sheets/EditSavingsSheet.tsx`                 |
| 9    | Quality checks                | All files                                                |
| 10   | Changelog                     | `CHANGELOG.md`                                           |
| 11   | Visual verification           | Manual testing                                           |
