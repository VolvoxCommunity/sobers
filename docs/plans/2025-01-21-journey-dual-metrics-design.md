# Journey Timeline: Dual Metrics Design

**Date:** 2025-01-21
**Status:** Approved
**Feature:** Display both journey start date and current streak in journey timeline

## Problem Statement

When users log slip-ups, the timeline shows them but the dual nature of tracking isn't fully expressed. Users need to see both their original journey commitment and their current sobriety streak as distinct but related metrics.

## Core Principles

1. **Preserve Journey Context** - `profile.sobriety_date` never changes; it's the anchor date
2. **Honest Progress Tracking** - Current streak resets with slip-ups via `recovery_restart_date`
3. **Dual Metrics Display** - Show both "Journey Started" and "Current Streak" simultaneously
4. **Milestone Integrity** - Sobriety milestones (30/60/90 days) reset with current streak

## Data Model

No changes required - existing schema already supports this feature:

```typescript
// Profile table - sobriety_date NEVER updated after initial set
interface Profile {
  sobriety_date: string;  // Original journey start date
  // ... other fields
}

// Slip-ups table - tracks recovery restarts
interface SlipUp {
  slip_up_date: string;           // When the slip-up occurred
  recovery_restart_date: string;  // New sobriety start date
  notes?: string;
  // ... other fields
}
```

The `useDaysSober` hook already tracks both `journeyStartDate` and `currentStreakStartDate`.

## UI Changes

### Stats Card Display

**When no slip-ups exist:**
```
📈 45
   Days Sober
```
Single centered metric (current behavior maintained)

**When slip-ups exist:**
```
📈 15                    🗓️ 120
   Current Streak          Journey Started

                          [Days Ago]
```
Two side-by-side metrics with equal visual weight

**Layout Details:**
- Split into two columns when `hasSlipUps === true`
- Left: Current Streak (from `currentStreakStartDate`) with TrendingUp icon
- Right: Journey Started (from `journeyStartDate`) with Calendar icon
- Number font size: 32px (reduced from 40px to fit both)
- Maintain existing card styling (padding, shadows, borders)

### Timeline Changes

**Milestone Calculation:**

Current behavior: Milestones calculated from `profile.sobriety_date` regardless of slip-ups

New behavior: Milestones calculated from current streak start date

```typescript
// Determine the date to use for milestone calculations
const milestoneCalculationDate = mostRecentSlipUp
  ? mostRecentSlipUp.recovery_restart_date
  : profile.sobriety_date;

// Calculate days from the current streak start
const streakStartDate = new Date(milestoneCalculationDate);
const daysSinceStreakStart = Math.floor(
  (today.getTime() - streakStartDate.getTime()) / (1000 * 60 * 60 * 24)
);

// Only show milestones that have been reached in current streak
milestones.forEach(({ days, label }) => {
  if (daysSinceStreakStart >= days) {
    const milestoneDate = new Date(streakStartDate);
    milestoneDate.setDate(milestoneDate.getDate() + days);
    // Add milestone to timeline...
  }
});
```

**Timeline Event Order (Most Recent First):**

When slip-ups exist:
1. Recent milestones (based on current streak)
2. Recent task completions
3. Slip-up event(s) (refresh icon, amber color)
4. Older task completions from before slip-up
5. Old milestones from previous streak (if any existed)
6. "Recovery Journey Began" (calendar icon, primary color) - original date, always at bottom

**Visual Treatment:**
- All events use existing styling (no special emphasis)
- Timeline flows chronologically with slip-ups as natural separators

## Implementation Details

### Files to Modify

1. **`app/(tabs)/journey.tsx`** - Main changes
2. **`hooks/useDaysSober.ts`** - No changes needed (already correct)
3. **`types/database.ts`** - No changes needed

### Journey Screen Changes

**A) Stats Card Component Split:**

Conditionally render based on `hasSlipUps`:

```typescript
const { daysSober, journeyStartDate, currentStreakStartDate, hasSlipUps } = useDaysSober();

{profile?.sobriety_date && (
  <View style={styles.statsCard}>
    {!hasSlipUps ? (
      // Existing single metric display
      <View style={styles.statMain}>...</View>
    ) : (
      // New dual metric display
      <View style={styles.statMainDual}>
        <View style={styles.statMainColumn}>
          <TrendingUp size={24} color={theme.primary} />
          <Text style={styles.statMainNumberSmall}>{daysSober}</Text>
          <Text style={styles.statMainLabelSmall}>Current Streak</Text>
        </View>
        <View style={styles.statMainColumn}>
          <Calendar size={24} color={theme.textSecondary} />
          <Text style={styles.statMainNumberSmall}>{journeyDays}</Text>
          <Text style={styles.statMainLabelSmall}>Journey Started</Text>
        </View>
      </View>
    )}
    {/* Existing statRow with step/task/milestone counts */}
  </View>
)}
```

**B) Milestone Calculation Update:**

Replace lines 182-215 in journey.tsx:

```typescript
// Fetch most recent slip-up to determine streak start
const mostRecentSlipUp = slipUps && slipUps.length > 0 ? slipUps[0] : null;

// Use current streak start date for milestones
const streakStartDate = mostRecentSlipUp
  ? new Date(mostRecentSlipUp.recovery_restart_date)
  : new Date(profile.sobriety_date);

const daysSinceStreakStart = Math.floor(
  (today.getTime() - streakStartDate.getTime()) / (1000 * 60 * 60 * 24)
);

// Calculate milestones from current streak
milestones.forEach(({ days, label }) => {
  if (daysSinceStreakStart >= days) {
    const milestoneDate = new Date(streakStartDate);
    milestoneDate.setDate(milestoneDate.getDate() + days);
    // Add to timeline...
  }
});
```

## Edge Cases

1. **No sobriety date set yet**
   - Don't show stats card (current behavior)

2. **Slip-up logged on same day as journey start**
   - Display both as "0" with appropriate labels

3. **Multiple slip-ups**
   - Only most recent affects current streak calculation
   - All appear in timeline chronologically

4. **Slip-up with recovery_restart_date in the future**
   - `useDaysSober` already handles with Math.max(0, diffDays)

5. **Journey started today (0 days)**
   - Show "0 Days Sober" or "0 Current Streak"

## Testing Strategy

### Manual Testing Scenarios

1. Fresh user (no slip-ups) - verify single metric display
2. User logs first slip-up - verify switch to dual metrics
3. User with old slip-up reaches milestone - verify it appears
4. User with multiple slip-ups - verify only recent affects streak

### Testing Checklist

- [ ] User with no slip-ups sees single metric display
- [ ] User with slip-ups sees dual metric display
- [ ] Current streak resets to 0 after new slip-up
- [ ] Journey started count continues from original date
- [ ] Milestones only show for current streak progress
- [ ] Old milestones from before slip-up still visible in timeline
- [ ] Timeline shows "Recovery Journey Began" at bottom
- [ ] Multiple slip-ups all appear in timeline
- [ ] Stats card layout looks good on different screen sizes
- [ ] Theme colors apply correctly to new dual-metric layout

## Success Criteria

- Users can see both their original journey start date and current streak
- Milestones accurately reflect current sobriety streak
- Timeline provides complete history including all slip-ups and the original start date
- UI adapts gracefully between single and dual metric displays
- All existing functionality remains intact
