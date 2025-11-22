# Journey Dual Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display both journey start date and current streak metrics in the journey timeline when slip-ups exist, with milestones calculated from current streak.

**Architecture:** Conditional dual-metric display in stats card based on slip-up presence. Milestone calculation updates to use current streak start date instead of original sobriety date. All changes isolated to journey.tsx component.

**Tech Stack:** React Native, TypeScript, Expo, Supabase, existing useDaysSober hook

---

## Task 1: Add New Styles for Dual Metric Layout

**Files:**
- Modify: `app/(tabs)/journey.tsx:385-583`

**Step 1: Add dual metric styles to createStyles function**

After line 467 (statMainLabel style), add these new styles:

```typescript
statMainDual: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  gap: 16,
  marginBottom: 20,
  paddingBottom: 20,
  borderBottomWidth: 1,
  borderBottomColor: theme.border,
},
statMainColumn: {
  flex: 1,
  alignItems: 'center',
  gap: 8,
},
statMainNumberSmall: {
  fontSize: 32,
  fontFamily: theme.fontRegular,
  fontWeight: '700',
  color: theme.primary,
},
statMainLabelSmall: {
  fontSize: 14,
  fontFamily: theme.fontRegular,
  color: theme.textSecondary,
  marginTop: 4,
  textAlign: 'center',
},
```

**Step 2: Verify styles compile**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/(tabs)/journey.tsx
git commit -m "style: Add dual metric layout styles for journey stats card"
```

---

## Task 2: Calculate Journey Days from Original Date

**Files:**
- Modify: `app/(tabs)/journey.tsx:49-227`

**Step 1: Add journeyDays calculation after daysSober destructuring**

After line 52, add:

```typescript
// Calculate journey days from original sobriety date
const journeyDays = useMemo(() => {
  if (!profile?.sobriety_date) return 0;
  const sobrietyDate = new Date(profile.sobriety_date);
  const today = new Date();
  const diffTime = today.getTime() - sobrietyDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}, [profile?.sobriety_date]);
```

**Step 2: Verify calculation compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/(tabs)/journey.tsx
git commit -m "feat: Add journey days calculation from original sobriety date"
```

---

## Task 3: Update Stats Card to Conditionally Show Dual Metrics

**Files:**
- Modify: `app/(tabs)/journey.tsx:305-342`

**Step 1: Replace single metric display with conditional rendering**

Replace lines 306-315 with:

```typescript
{profile?.sobriety_date && (
  <View style={styles.statsCard}>
    {!hasSlipUps ? (
      // Single metric display - no slip-ups
      <View style={styles.statMain}>
        <TrendingUp size={32} color={theme.primary} />
        <View style={styles.statMainContent}>
          <Text style={styles.statMainNumber}>{loadingDaysSober ? '...' : daysSober}</Text>
          <Text style={styles.statMainLabel}>Days Sober</Text>
        </View>
      </View>
    ) : (
      // Dual metric display - has slip-ups
      <View style={styles.statMainDual}>
        <View style={styles.statMainColumn}>
          <TrendingUp size={24} color={theme.primary} />
          <Text style={styles.statMainNumberSmall}>{loadingDaysSober ? '...' : daysSober}</Text>
          <Text style={styles.statMainLabelSmall}>Current Streak</Text>
        </View>
        <View style={styles.statMainColumn}>
          <Calendar size={24} color={theme.textSecondary} />
          <Text style={styles.statMainNumberSmall}>{journeyDays}</Text>
          <Text style={styles.statMainLabelSmall}>Journey Started</Text>
        </View>
      </View>
    )}
    <View style={styles.statRow}>
```

**Step 2: Verify UI compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Test visual appearance manually**

Run: `pnpm dev`
Navigate to: Journey tab
Expected: Stats card displays correctly (single metric for users without slip-ups)

**Step 4: Commit**

```bash
git add app/(tabs)/journey.tsx
git commit -m "feat: Add conditional dual metric display in journey stats card"
```

---

## Task 4: Update Milestone Calculation to Use Current Streak

**Files:**
- Modify: `app/(tabs)/journey.tsx:180-215`

**Step 1: Replace milestone calculation logic**

Replace lines 182-215 with:

```typescript
// 6. Calculate sobriety milestones from current streak
if (profile.sobriety_date) {
  // Determine streak start date (most recent slip-up or original sobriety date)
  const mostRecentSlipUp = slipUps && slipUps.length > 0 ? slipUps[0] : null;
  const streakStartDate = mostRecentSlipUp
    ? new Date(mostRecentSlipUp.recovery_restart_date)
    : new Date(profile.sobriety_date);

  const today = new Date();
  const daysSinceStreakStart = Math.floor(
    (today.getTime() - streakStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const milestones = [
    { days: 30, label: '30 Days Sober' },
    { days: 60, label: '60 Days Sober' },
    { days: 90, label: '90 Days Sober' },
    { days: 180, label: '6 Months Sober' },
    { days: 365, label: '1 Year Sober' },
    { days: 730, label: '2 Years Sober' },
    { days: 1095, label: '3 Years Sober' },
  ];

  milestones.forEach(({ days, label }) => {
    if (daysSinceStreakStart >= days) {
      const milestoneDate = new Date(streakStartDate);
      milestoneDate.setDate(milestoneDate.getDate() + days);

      timelineEvents.push({
        id: `milestone-${days}`,
        type: 'milestone',
        date: milestoneDate,
        title: label,
        description: `Reached ${label} milestone`,
        icon: 'award',
        color: '#8b5cf6',
      });
    }
  });
}
```

**Step 2: Verify milestone calculation compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add app/(tabs)/journey.tsx
git commit -m "feat: Calculate milestones from current streak start date"
```

---

## Task 5: Run Code Quality Checks

**Files:**
- Modified: `app/(tabs)/journey.tsx`

**Step 1: Format code**

Run: `pnpm format`
Expected: Code formatted successfully

**Step 2: Lint code**

Run: `pnpm lint`
Expected: No linting errors

**Step 3: Type check**

Run: `pnpm typecheck`
Expected: No type errors

**Step 4: Build**

Run: `pnpm build`
Expected: Build completes successfully

**Step 5: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 6: Commit if any formatting changes**

```bash
git add .
git commit -m "style: Apply formatting and linting fixes"
```

---

## Task 6: Manual Testing

**Files:**
- Test: `app/(tabs)/journey.tsx`

**Step 1: Test user with no slip-ups**

Run: `pnpm dev`
1. Navigate to Journey tab
2. Verify stats card shows single metric: "X Days Sober"
3. Verify milestones appear based on sobriety date

**Step 2: Test user with slip-ups (database setup)**

Using Supabase dashboard or SQL:
1. Insert a slip-up record for test user
2. Set `slip_up_date` to a past date
3. Set `recovery_restart_date` to a more recent date

**Step 3: Test dual metrics display**

1. Reload app
2. Navigate to Journey tab
3. Verify stats card shows TWO metrics side-by-side:
   - "Current Streak" (from recovery_restart_date)
   - "Journey Started" (from original sobriety_date)
4. Verify both numbers are calculated correctly

**Step 4: Test milestone reset**

1. Verify milestones only show for current streak progress
2. Verify old milestones (before slip-up) still appear in timeline
3. Verify "Recovery Journey Began" appears at bottom of timeline

**Step 5: Test edge cases**

1. User with multiple slip-ups - verify only most recent affects streak
2. User with 0 days journey - verify displays "0" correctly
3. Test on different screen sizes/devices

**Step 6: Document test results**

Create: `docs/plans/2025-01-21-journey-dual-metrics-test-results.md`
Document all test scenarios and results

---

## Task 7: Final Commit and Push

**Files:**
- All modified files

**Step 1: Review all changes**

Run: `git diff main`
Expected: Review shows only journey.tsx changes

**Step 2: Create final commit if needed**

```bash
git add .
git commit -m "feat: Implement dual metrics for journey timeline with streak-based milestones"
```

**Step 3: Push to remote**

```bash
git push origin journey-changes
```

**Step 4: Verify CI passes**

Check GitHub Actions workflow
Expected: All checks pass (lint, typecheck, build, tests)

---

## Testing Checklist

After implementation, verify:

- [ ] User with no slip-ups sees single metric display
- [ ] User with slip-ups sees dual metric display
- [ ] Current streak resets to 0 after new slip-up
- [ ] Journey started count continues from original date
- [ ] Milestones only show for current streak progress
- [ ] Old milestones from before slip-up still visible in timeline
- [ ] Timeline shows "Recovery Journey Began" at bottom
- [ ] Multiple slip-ups - only most recent affects streak
- [ ] Stats card layout responsive on different screen sizes
- [ ] Theme colors apply correctly to dual-metric layout
- [ ] All quality checks pass (format, lint, typecheck, build, test)

## Success Criteria

- Users see both journey start date and current streak when slip-ups exist
- Single metric display when no slip-ups
- Milestones accurately reflect current sobriety streak
- Timeline provides complete history
- All existing functionality intact
- All quality checks passing
- CI/CD pipeline passes

## References

- Design Document: `docs/plans/2025-01-21-journey-dual-metrics-design.md`
- useDaysSober Hook: `hooks/useDaysSober.ts`
- Database Types: `types/database.ts`
- @superpowers:test-driven-development - If adding new unit tests
- @superpowers:verification-before-completion - Before marking complete
