# 12-Step Content Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to hide/show the 12 Steps tab via a toggle in onboarding and settings.

**Architecture:** Add `show_twelve_step_content` boolean to profiles table, conditionally render Steps tab based on this preference, restructure onboarding (2 cards) and settings (merged sections).

**Tech Stack:** Supabase (migrations), React Native, Expo Router, TypeScript

---

## Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20250101000000_add_show_twelve_step_content.sql`

**Step 1: Create the migration file**

```sql
-- Add show_twelve_step_content column to profiles table
-- Default true so existing users continue to see 12-step content
ALTER TABLE profiles
ADD COLUMN show_twelve_step_content BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.show_twelve_step_content IS 'Whether to show the 12 Steps tab in navigation. Default true for backwards compatibility.';
```

**Step 2: Verify migration syntax**

Run: `pnpm exec supabase db diff --local` (if local dev) or review SQL syntax manually.

**Step 3: Commit**

```bash
git add supabase/migrations/20250101000000_add_show_twelve_step_content.sql
git commit -m "feat(supabase): add show_twelve_step_content column to profiles"
```

---

## Task 2: Update TypeScript Types

**Files:**

- Modify: `types/database.ts:25-93` (Profile interface)

**Step 1: Add the new field to Profile interface**

Add after `last_seen_version` field (around line 84):

```typescript
  /**
   * Whether to show 12-step program content (Steps tab).
   * Default true. When false, the Steps tab is hidden from navigation.
   * Existing users (null/undefined) are treated as true.
   */
  show_twelve_step_content?: boolean;
```

**Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add show_twelve_step_content to Profile interface"
```

---

## Task 3: Settings - Merge Account and Journey Sections

**Files:**

- Modify: `components/settings/SettingsContent.tsx`
- Test: `__tests__/components/settings/SettingsContent.test.tsx`

**Step 1: Write failing test for merged "Your Journey" section**

Add to test file:

```typescript
describe('Your Journey Section', () => {
  it('renders merged Your Journey section with display name and sobriety date', () => {
    render(<SettingsContent onDismiss={jest.fn()} />);

    // Should have single "Your Journey" section title
    expect(screen.getByText('Your Journey')).toBeTruthy();

    // Should NOT have separate "Account" or "Journey" section titles
    expect(screen.queryByText('Account')).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx -t "Your Journey Section"`
Expected: FAIL - "Account" section still exists

**Step 3: Merge Account and Journey sections in SettingsContent.tsx**

Replace the separate Account and Journey sections (around lines 818-887) with a single merged section:

```tsx
{
  /* Your Journey Section (merged Account + Journey) */
}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Your Journey</Text>
  <View style={styles.card}>
    {/* Display Name Row */}
    <Pressable
      style={styles.menuItem}
      testID="account-name-row"
      onPress={() => {
        if (!profile?.display_name) return;
        setEditDisplayName(profile.display_name);
        setIsEditNameModalVisible(true);
      }}
      accessibilityRole="button"
      accessibilityLabel="Edit your display name"
    >
      <View style={styles.menuItemLeft}>
        <User size={20} color={theme.textSecondary} />
        <View>
          <Text style={styles.menuItemText}>Display Name</Text>
          <Text style={styles.menuItemSubtext}>{profile?.display_name ?? 'Loading...'}</Text>
        </View>
      </View>
      <ChevronLeft
        size={20}
        color={theme.textTertiary}
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </Pressable>
    <View style={styles.separator} />
    {/* Journey Start Date Row */}
    <Pressable
      style={styles.menuItem}
      testID="settings-journey-date-row"
      onPress={handleEditSobrietyDate}
      accessibilityRole="button"
      accessibilityLabel="Edit your journey start date"
    >
      <View style={styles.menuItemLeft}>
        <Calendar size={20} color={theme.textSecondary} />
        <View>
          <Text style={styles.menuItemText}>Journey Start Date</Text>
          <Text style={styles.menuItemSubtext}>
            {profile?.sobriety_date
              ? parseDateAsLocal(profile.sobriety_date, userTimezone).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Not set'}
          </Text>
        </View>
      </View>
      <ChevronLeft
        size={20}
        color={theme.textTertiary}
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </Pressable>
  </View>
</View>;
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx -t "Your Journey Section"`
Expected: PASS

**Step 5: Commit**

```bash
git add components/settings/SettingsContent.tsx __tests__/components/settings/SettingsContent.test.tsx
git commit -m "refactor(settings): merge Account and Journey into Your Journey section"
```

---

## Task 4: Settings - Rename Dashboard to Features and Add 12-Step Toggle

**Files:**

- Modify: `components/settings/SettingsContent.tsx`
- Test: `__tests__/components/settings/SettingsContent.test.tsx`

**Step 1: Write failing test for Features section with 12-step toggle**

```typescript
describe('Features Section', () => {
  it('renders Features section with 12-step content toggle', () => {
    render(<SettingsContent onDismiss={jest.fn()} />);

    expect(screen.getByText('Features')).toBeTruthy();
    expect(screen.getByText('Include 12-Step Content')).toBeTruthy();
    expect(screen.getByText('Show the 12 Steps tab')).toBeTruthy();
  });

  it('toggles 12-step content when pressed', async () => {
    const mockSupabase = jest.requireMock('@/lib/supabase').supabase;
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    render(<SettingsContent onDismiss={jest.fn()} />);

    const toggle = screen.getByTestId('settings-twelve-step-toggle');
    fireEvent.press(toggle);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx -t "Features Section"`
Expected: FAIL - "Features" section doesn't exist

**Step 3: Add state and handler for 12-step toggle**

Add to state section (around line 491):

```typescript
const [isSavingTwelveStep, setIsSavingTwelveStep] = useState(false);
```

Add handler after `handleToggleSavingsCard` (around line 728):

```typescript
/**
 * Handles toggling the 12-step content visibility.
 * Updates profile in Supabase and refreshes profile state.
 */
const handleToggleTwelveStepContent = useCallback(async () => {
  if (!profile?.id || isSavingTwelveStep) return;

  setIsSavingTwelveStep(true);
  try {
    // Treat null/undefined as true (showing), so toggling sets to false
    const currentValue = profile.show_twelve_step_content !== false;
    const newValue = !currentValue;

    const { error } = await supabase
      .from('profiles')
      .update({ show_twelve_step_content: newValue })
      .eq('id', profile.id);

    if (error) throw error;

    await refreshProfile();

    trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
      setting: 'show_twelve_step_content',
      value: newValue,
    });

    showToast.success(newValue ? '12-step content enabled' : '12-step content hidden');
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to update setting');
    logger.error('Failed to toggle 12-step content visibility', err, {
      category: LogCategory.DATABASE,
    });
    showToast.error('Failed to update. Please try again.');
  } finally {
    setIsSavingTwelveStep(false);
  }
}, [profile?.id, profile?.show_twelve_step_content, isSavingTwelveStep, refreshProfile]);
```

**Step 4: Rename Dashboard section to Features and add toggle**

Replace the Dashboard section (around line 981-1010) with:

```tsx
{
  /* Features Section (renamed from Dashboard) */
}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Features</Text>
  <View style={styles.card}>
    {/* 12-Step Content Toggle */}
    <Pressable
      testID="settings-twelve-step-toggle"
      style={styles.menuItem}
      onPress={handleToggleTwelveStepContent}
      disabled={isSavingTwelveStep}
      accessibilityRole="switch"
      accessibilityState={{ checked: profile?.show_twelve_step_content !== false }}
      accessibilityLabel="Include 12-step content"
    >
      <View style={styles.menuItemLeft}>
        <BookOpen size={20} color={theme.textSecondary} />
        <View>
          <Text style={styles.menuItemText}>Include 12-Step Content</Text>
          <Text style={styles.menuItemSubtext}>Show the 12 Steps tab</Text>
        </View>
      </View>
      {isSavingTwelveStep ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View
          style={[
            styles.toggle,
            profile?.show_twelve_step_content !== false && styles.toggleActive,
          ]}
        >
          <Text style={styles.toggleText}>
            {profile?.show_twelve_step_content !== false ? 'ON' : 'OFF'}
          </Text>
        </View>
      )}
    </Pressable>
    <View style={styles.separator} />
    {/* Savings Card Toggle */}
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
          <Text style={styles.menuItemSubtext}>Display money saved on home screen</Text>
        </View>
      </View>
      {isSavingDashboard ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View style={[styles.toggle, !profile?.hide_savings_card && styles.toggleActive]}>
          <Text style={styles.toggleText}>{profile?.hide_savings_card ? 'OFF' : 'ON'}</Text>
        </View>
      )}
    </Pressable>
  </View>
</View>;
```

**Step 5: Add BookOpen import**

Add to lucide imports at top of file:

```typescript
import {
  // ... existing imports
  BookOpen,
} from 'lucide-react-native';
```

**Step 6: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/settings/SettingsContent.test.tsx -t "Features Section"`
Expected: PASS

**Step 7: Run full test suite for settings**

Run: `pnpm test -- __tests__/components/settings/`
Expected: All tests pass

**Step 8: Commit**

```bash
git add components/settings/SettingsContent.tsx __tests__/components/settings/SettingsContent.test.tsx
git commit -m "feat(settings): rename Dashboard to Features, add 12-step content toggle"
```

---

## Task 5: Onboarding - Merge Cards and Add Preferences Section

**Files:**

- Modify: `app/onboarding.tsx`
- Test: `__tests__/app/onboarding.test.tsx`

**Step 1: Write failing test for merged structure**

```typescript
describe('Onboarding Structure', () => {
  it('renders Your Journey card with display name and sobriety date', () => {
    render(<OnboardingScreen />);

    // Single "YOUR JOURNEY" card with both fields
    expect(screen.getByText(/YOUR JOURNEY/)).toBeTruthy();
    expect(screen.getByTestId('onboarding-display-name-input')).toBeTruthy();
    expect(screen.getByTestId('onboarding-sobriety-date-input')).toBeTruthy();

    // Should NOT have separate "ABOUT YOU" card
    expect(screen.queryByText(/ABOUT YOU/)).toBeNull();
  });

  it('renders Preferences card with 12-step toggle', () => {
    render(<OnboardingScreen />);

    expect(screen.getByText(/PREFERENCES/)).toBeTruthy();
    expect(screen.getByText('Include 12-Step Content')).toBeTruthy();
    expect(screen.getByTestId('twelve-step-toggle')).toBeTruthy();
  });

  it('has 12-step content enabled by default', () => {
    render(<OnboardingScreen />);

    const toggle = screen.getByTestId('twelve-step-toggle');
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "Onboarding Structure"`
Expected: FAIL - separate cards still exist

**Step 3: Add 12-step state**

Add to state section (around line 107):

```typescript
// 12-step content preference (enabled by default)
const [showTwelveStepContent, setShowTwelveStepContent] = useState(true);
```

**Step 4: Include in profile upsert**

Update profileData in handleComplete (around line 292):

```typescript
const profileData = {
  id: user.id,
  email: user.email || '',
  sobriety_date: formatDateWithTimezone(sobrietyDate, userTimezone),
  terms_accepted_at: new Date().toISOString(),
  display_name: displayName.trim(),
  timezone: userTimezone,
  // 12-step content preference
  show_twelve_step_content: showTwelveStepContent,
  // Add spending data if enabled
  ...(isSavingsEnabled &&
    spendingAmount.trim() && {
      spend_amount: parseFloat(spendingAmount),
      spend_frequency: spendingFrequency,
    }),
};
```

**Step 5: Restructure UI - merge cards and add Preferences**

Replace the current 3 cards (lines 410-538) with:

```tsx
{
  /* Card 1: Your Journey - Display Name + Sobriety Date */
}
<View style={styles.card}>
  <Text style={styles.cardTitle}>📅 YOUR JOURNEY</Text>

  {/* Display Name Input */}
  <View style={styles.inputGroup}>
    <Text style={styles.label}>Display Name</Text>
    <TextInput
      testID="onboarding-display-name-input"
      style={[styles.input, displayNameError && styles.inputError]}
      placeholder="e.g. John D."
      placeholderTextColor={theme.textTertiary}
      value={displayName}
      onChangeText={setDisplayName}
      autoCapitalize="words"
      returnKeyType="done"
      maxLength={MAX_DISPLAY_NAME_LENGTH}
      accessibilityLabel="Display Name"
    />
    <View style={styles.inputFooter}>
      <Text style={[styles.characterCount, isNearLimit && styles.characterCountWarning]}>
        {characterCount}/{MAX_DISPLAY_NAME_LENGTH} characters
      </Text>
    </View>
    {displayNameError && (
      <Animated.View entering={FadeInDown}>
        <Text style={styles.errorText}>{displayNameError}</Text>
      </Animated.View>
    )}
  </View>

  <TouchableOpacity
    style={styles.infoButton}
    onPress={() => setShowInfo(!showInfo)}
    accessibilityRole="button"
    accessibilityLabel={showInfo ? 'Hide information' : 'Show information'}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Info size={16} color={theme.textSecondary} />
    <Text style={styles.infoText}>How you&apos;ll appear to others</Text>
  </TouchableOpacity>

  {showInfo && (
    <Animated.View entering={FadeInDown} style={styles.infoBox}>
      <Text style={styles.infoBoxText}>
        Your display name is how you&apos;ll be identified in the app. Choose any name you&apos;re
        comfortable with - it can be your real name, initials, or a nickname.
      </Text>
    </Animated.View>
  )}

  <View style={styles.divider} />

  {/* Sobriety Date Picker */}
  <TouchableOpacity
    testID="onboarding-sobriety-date-input"
    style={styles.dateDisplay}
    onPress={() => setShowDatePicker(true)}
    accessibilityRole="button"
    accessibilityLabel="Select sobriety date"
  >
    <Calendar size={32} color={theme.primary} />
    <View style={styles.dateTextContainer}>
      <Text style={styles.dateLabel}>Sobriety Date</Text>
      <Text style={styles.dateValue}>
        {sobrietyDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </View>
  </TouchableOpacity>

  {showDatePicker && Platform.OS !== 'web' && (
    <DateTimePicker
      value={sobrietyDate}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={onDateChange}
      maximumDate={maximumDate}
    />
  )}

  {Platform.OS === 'web' && showDatePicker && (
    <View style={styles.webDatePicker}>
      <input
        type="date"
        value={formatDateWithTimezone(sobrietyDate, getUserTimezone(profile))}
        max={formatDateWithTimezone(new Date(), getUserTimezone(profile))}
        onChange={(e) => {
          setSobrietyDate(parseDateAsLocal(e.target.value, getUserTimezone(profile)));
          setShowDatePicker(false);
        }}
        style={{
          padding: '12px',
          fontSize: '16px',
          fontFamily: theme.fontRegular,
          borderRadius: '8px',
          border: `2px solid ${theme.primary}`,
          marginBottom: '16px',
          width: '100%',
        }}
      />
    </View>
  )}

  <View style={styles.statsContainer}>
    <Text style={styles.statsCount}>
      {getDateDiffInDays(sobrietyDate, new Date(), getUserTimezone(profile))}
    </Text>
    <Text style={styles.statsLabel}>Days</Text>
  </View>
</View>;

{
  /* Card 2: Preferences - 12-Step Toggle + Savings */
}
<View style={styles.card}>
  <Text style={styles.cardTitle}>⚙️ PREFERENCES</Text>

  {/* 12-Step Content Toggle */}
  <TouchableOpacity
    testID="twelve-step-toggle"
    style={styles.toggleRow}
    onPress={() => setShowTwelveStepContent(!showTwelveStepContent)}
    activeOpacity={0.7}
    accessibilityRole="switch"
    accessibilityState={{ checked: showTwelveStepContent }}
    accessibilityLabel="Include 12-step content"
  >
    <View style={styles.toggleContent}>
      <Text style={styles.toggleLabel}>Include 12-Step Content</Text>
      <Text style={styles.toggleSubtext}>
        Show the 12 Steps tab for step-by-step recovery guidance
      </Text>
    </View>
    <Switch
      value={showTwelveStepContent}
      onValueChange={setShowTwelveStepContent}
      trackColor={{ false: theme.border, true: theme.primaryLight }}
      thumbColor={showTwelveStepContent ? theme.primary : theme.textTertiary}
    />
  </TouchableOpacity>

  <View style={styles.divider} />

  {/* Savings Tracking Toggle */}
  <TouchableOpacity
    testID="savings-toggle"
    style={styles.toggleRow}
    onPress={() => setIsSavingsEnabled(!isSavingsEnabled)}
    activeOpacity={0.7}
    accessibilityRole="switch"
    accessibilityState={{ checked: isSavingsEnabled }}
    accessibilityLabel="Enable savings tracking"
  >
    <View style={styles.toggleContent}>
      <Text style={styles.toggleLabel}>Track Money Saved</Text>
      <Text style={styles.toggleSubtext}>See how much you&apos;ve saved since getting sober</Text>
    </View>
    <Switch
      value={isSavingsEnabled}
      onValueChange={setIsSavingsEnabled}
      trackColor={{ false: theme.border, true: theme.primaryLight }}
      thumbColor={isSavingsEnabled ? theme.primary : theme.textTertiary}
    />
  </TouchableOpacity>

  {isSavingsEnabled && (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.inputsContainer}>
      <Text style={styles.label}>How much did you spend on your addiction?</Text>

      <View style={styles.inputRow}>
        <View style={styles.amountInputContainer}>
          <DollarSign size={20} color={theme.textSecondary} style={styles.dollarIcon} />
          <TextInput
            testID="savings-amount-input"
            style={styles.amountInput}
            value={spendingAmount}
            onChangeText={setSpendingAmount}
            placeholder="0.00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            accessibilityLabel="Spending amount"
          />
        </View>
        <Text style={styles.perText}>per</Text>
      </View>

      <View testID="savings-frequency-picker" style={styles.frequencyContainer}>
        {FREQUENCIES.map((freq) => (
          <TouchableOpacity
            key={freq.value}
            testID={`frequency-${freq.value}`}
            style={[
              styles.frequencyButton,
              spendingFrequency === freq.value && styles.frequencyButtonSelected,
            ]}
            onPress={() => setSpendingFrequency(freq.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: spendingFrequency === freq.value }}
            accessibilityLabel={`${freq.label} frequency`}
          >
            <Text
              style={[
                styles.frequencyText,
                spendingFrequency === freq.value && styles.frequencyTextSelected,
              ]}
            >
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {spendingError && (
        <Animated.View entering={FadeInDown}>
          <Text style={styles.errorText}>{spendingError}</Text>
        </Animated.View>
      )}
    </Animated.View>
  )}
</View>;
```

**Step 6: Add imports and constants**

Add to imports:

```typescript
import { Switch } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import { FadeOutUp } from 'react-native-reanimated';
```

Add constants for frequencies (from SavingsTrackingCard):

```typescript
const FREQUENCIES: { value: SpendingFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];
```

**Step 7: Add new styles**

Add to createStyles:

```typescript
divider: {
  height: 1,
  backgroundColor: theme.border,
  marginVertical: 20,
},
toggleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
toggleContent: {
  flex: 1,
  marginRight: 12,
},
toggleLabel: {
  fontSize: 16,
  fontFamily: theme.fontRegular,
  color: theme.text,
},
toggleSubtext: {
  fontSize: 13,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
  marginTop: 4,
},
inputsContainer: {
  marginTop: 20,
  paddingTop: 20,
  borderTopWidth: 1,
  borderTopColor: theme.border,
},
inputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
},
amountInputContainer: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: theme.background,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 12,
  paddingHorizontal: 12,
},
dollarIcon: {
  marginRight: 8,
},
amountInput: {
  flex: 1,
  padding: 16,
  fontSize: 18,
  fontFamily: theme.fontRegular,
  color: theme.text,
},
perText: {
  fontSize: 16,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
},
frequencyContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
frequencyButton: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: theme.background,
  borderWidth: 1,
  borderColor: theme.border,
},
frequencyButtonSelected: {
  backgroundColor: theme.primaryLight,
  borderColor: theme.primary,
},
frequencyText: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
},
frequencyTextSelected: {
  color: theme.primary,
  fontWeight: '600',
},
```

**Step 8: Run test to verify it passes**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx -t "Onboarding Structure"`
Expected: PASS

**Step 9: Run full onboarding test suite**

Run: `pnpm test -- __tests__/app/onboarding.test.tsx`
Expected: All tests pass (update other tests as needed for new structure)

**Step 10: Commit**

```bash
git add app/onboarding.tsx __tests__/app/onboarding.test.tsx
git commit -m "feat(onboarding): restructure to 2 cards, add 12-step content toggle"
```

---

## Task 6: Remove SavingsTrackingCard Component

**Files:**

- Delete: `components/onboarding/SavingsTrackingCard.tsx`
- Modify: `components/onboarding/index.ts` (if exists)

**Step 1: Check if component is used elsewhere**

Run: `grep -r "SavingsTrackingCard" --include="*.tsx" --include="*.ts" .`

If only used in onboarding.tsx (now inline), proceed to delete.

**Step 2: Delete the component**

```bash
rm components/onboarding/SavingsTrackingCard.tsx
```

**Step 3: Update index.ts if it exports SavingsTrackingCard**

Remove the export line if present.

**Step 4: Run tests to verify nothing breaks**

Run: `pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(onboarding): remove SavingsTrackingCard, now inline in onboarding"
```

---

## Task 7: Tab Layout - Conditionally Render Steps Tab

**Files:**

- Modify: `app/(app)/(tabs)/_layout.tsx`
- Test: `__tests__/app/(tabs)/_layout.test.tsx`

**Step 1: Write failing test for conditional tab rendering**

Create or update test file:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TabLayout from '@/app/(app)/(tabs)/_layout';

// Mock AuthContext
const mockProfile = {
  id: 'user-123',
  show_twelve_step_content: true,
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
  }),
}));

describe('TabLayout', () => {
  beforeEach(() => {
    mockProfile.show_twelve_step_content = true;
  });

  it('shows Steps tab when show_twelve_step_content is true', () => {
    mockProfile.show_twelve_step_content = true;
    render(<TabLayout />);

    // Tab should be visible in route config
    expect(screen.getByText('Steps')).toBeTruthy();
  });

  it('hides Steps tab when show_twelve_step_content is false', () => {
    mockProfile.show_twelve_step_content = false;
    render(<TabLayout />);

    // Tab should not be visible
    expect(screen.queryByText('Steps')).toBeNull();
  });

  it('shows Steps tab when show_twelve_step_content is undefined (existing users)', () => {
    mockProfile.show_twelve_step_content = undefined;
    render(<TabLayout />);

    // Should default to showing for existing users
    expect(screen.getByText('Steps')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/app/\\(tabs\\)/_layout.test.tsx`
Expected: FAIL - Steps always shows

**Step 3: Add AuthContext import and filter tabs**

Add import:

```typescript
import { useAuth } from '@/contexts/AuthContext';
```

Update component to filter tabs:

```typescript
export default function TabLayout(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();

  // Filter out Steps tab if user has disabled 12-step content
  // Treat null/undefined as true (show steps) for existing users
  const showStepsTab = profile?.show_twelve_step_content !== false;

  const filteredTabRoutes = tabRoutes.filter(
    (route) => route.name !== 'steps' || showStepsTab
  );

  // Web: Use top navigation instead of bottom tabs
  if (Platform.OS === 'web') {
    const webNavItems = filteredTabRoutes.map((route) => ({
      route: route.name === 'index' ? '/' : `/${route.name}`,
      label: route.title,
      icon: route.icon,
    }));

    return (
      <>
        <WebTopNav items={webNavItems} />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          {filteredTabRoutes.map((route) => (
            <Tabs.Screen key={route.name} name={route.name} />
          ))}
          {/* Include Steps route but hidden if user disabled it */}
          {!showStepsTab && <Tabs.Screen name="steps" options={{ href: null }} />}
          <Tabs.Screen name="manage-tasks" options={{ href: null }} />
        </Tabs>
      </>
    );
  }

  // Mobile: Native bottom tabs
  return (
    <NativeTabs
      labeled={true}
      tabBarActiveTintColor={theme.primary}
      tabBarInactiveTintColor={theme.textSecondary}
      tabBarStyle={{
        backgroundColor: isDark ? theme.surface : theme.card,
      }}
    >
      {filteredTabRoutes.map((route) => (
        <NativeTabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarIcon: () =>
              Platform.OS === 'ios'
                ? { sfSymbol: route.sfSymbol }
                : androidIcons[route.androidIconKey],
          }}
        />
      ))}
      {/* Include Steps route but hidden if user disabled it */}
      {!showStepsTab && (
        <NativeTabs.Screen
          name="steps"
          options={{
            title: 'Steps',
            tabBarItemHidden: true,
          }}
        />
      )}
      <NativeTabs.Screen
        name="manage-tasks"
        options={{
          title: 'Manage Tasks',
          tabBarItemHidden: true,
        }}
      />
    </NativeTabs>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/app/\\(tabs\\)/_layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/\\(app\\)/\\(tabs\\)/_layout.tsx __tests__/app/\\(tabs\\)/_layout.test.tsx
git commit -m "feat(tabs): conditionally render Steps tab based on user preference"
```

---

## Task 8: Steps Screen - Redirect When Disabled

**Files:**

- Modify: `app/(app)/(tabs)/steps/index.tsx`
- Test: `__tests__/app/(tabs)/steps/index.test.tsx`

**Step 1: Write failing test for redirect**

```typescript
describe('Steps Screen Redirect', () => {
  it('redirects to home when 12-step content is disabled', () => {
    const mockReplace = jest.fn();
    jest.mock('expo-router', () => ({
      useRouter: () => ({ replace: mockReplace }),
    }));

    mockProfile.show_twelve_step_content = false;
    render(<StepsScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
```

**Step 2: Add redirect logic to Steps screen**

Add to component:

```typescript
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function StepsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Redirect to home if user has disabled 12-step content
  useEffect(() => {
    if (profile?.show_twelve_step_content === false) {
      router.replace('/(tabs)');
    }
  }, [profile?.show_twelve_step_content, router]);

  // ... rest of component
}
```

**Step 3: Run test to verify it passes**

Run: `pnpm test -- __tests__/app/\\(tabs\\)/steps/index.test.tsx -t "redirect"`
Expected: PASS

**Step 4: Commit**

```bash
git add app/\\(app\\)/\\(tabs\\)/steps/index.tsx __tests__/app/\\(tabs\\)/steps/index.test.tsx
git commit -m "feat(steps): redirect to home when 12-step content disabled"
```

---

## Task 9: Update CHANGELOG.md

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add entries to Unreleased section**

```markdown
## [Unreleased]

### Added

- Add toggle to enable/disable 12-step program content in app
- Add 12-step content preference to onboarding Preferences card
- Add 12-step content toggle to Settings Features section

### Changed

- Restructure onboarding from 3 cards to 2 cards (Your Journey + Preferences)
- Merge Settings Account and Journey sections into "Your Journey"
- Rename Settings Dashboard section to "Features"
- Move savings tracking from separate onboarding card into Preferences card

### Removed

- Remove separate SavingsTrackingCard component (now inline in onboarding)
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): add 12-step content toggle feature entries"
```

---

## Task 10: Final Verification

**Step 1: Run full quality suite**

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test
```

Expected: All pass with no errors

**Step 2: Visual verification**

```bash
pnpm web
```

Then use Chrome DevTools MCP to:

- Navigate to onboarding, verify 2 cards structure
- Toggle 12-step content, verify toggle works
- Complete onboarding, verify Steps tab visibility matches preference
- Go to Settings, verify "Your Journey" and "Features" sections
- Toggle 12-step content in Settings, verify Steps tab appears/disappears

**Step 3: Push to remote**

```bash
git push origin feat/twelve-step-toggle
```

---

## Summary

| Task | Description                     | Commits |
| ---- | ------------------------------- | ------- |
| 1    | Database migration              | 1       |
| 2    | TypeScript types                | 1       |
| 3    | Settings - merge sections       | 1       |
| 4    | Settings - Features + toggle    | 1       |
| 5    | Onboarding - restructure        | 1       |
| 6    | Remove SavingsTrackingCard      | 1       |
| 7    | Tab layout - conditional render | 1       |
| 8    | Steps screen - redirect         | 1       |
| 9    | CHANGELOG                       | 1       |
| 10   | Final verification              | 0       |

**Total: 9 commits**
