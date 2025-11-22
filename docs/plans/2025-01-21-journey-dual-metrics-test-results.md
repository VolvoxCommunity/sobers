# Journey Dual Metrics - Manual Testing Plan

**Feature:** Dual metric display in journey timeline when slip-ups exist
**Implementation Plan:** `docs/plans/2025-01-21-journey-dual-metrics.md`
**Date:** 2025-01-21
**Tester:** _[Your Name]_

---

## Overview

This document provides step-by-step instructions for manually testing the journey dual metrics feature. The feature conditionally displays:

- **Single metric** (Days Sober) for users without slip-ups
- **Dual metrics** (Current Streak + Journey Started) for users with slip-ups
- **Milestone recalculation** based on current streak start date

---

## Pre-Test Setup

### 1. Start Development Server

```bash
cd /Users/billchirico/Developer/Volvox/Sobriety-Waypoint/worktrees/journey-changes
pnpm dev
```

### 2. Verify Code Quality Checks Pass

Before testing, ensure all quality checks pass:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

**Expected:** All checks pass with no errors.

---

## Test Scenarios

### Scenario 1: User with No Slip-Ups (Single Metric Display)

**Objective:** Verify that users without slip-ups see the traditional single metric display.

**Setup:**

1. Log in as a user with no slip-up records in the database
2. Ensure user has a valid `sobriety_date` set in their profile

**Test Steps:**

1. Navigate to the Journey tab
2. Observe the stats card at the top of the screen

**Expected Results:**

- [ ] Stats card displays a single, centered metric
- [ ] Metric shows "X Days Sober" with large font (48px)
- [ ] Trending up icon appears to the left of the number
- [ ] Number matches the calculation from `sobriety_date` to today
- [ ] No dual-column layout is visible
- [ ] Milestones appear in timeline based on `sobriety_date`

**Screenshot Location:** `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 2: User with Slip-Ups (Dual Metrics Display)

**Objective:** Verify that users with slip-ups see both Current Streak and Journey Started metrics.

**Setup - Database Configuration:**

Using Supabase dashboard (`https://supabase.com/dashboard/project/[your-project-id]`):

1. Navigate to Table Editor → `slip_ups` table
2. Insert a new record with these values:
   ```sql
   INSERT INTO slip_ups (user_id, slip_up_date, recovery_restart_date, notes)
   VALUES (
     '[your-test-user-id]',
     '2025-01-10',  -- Adjust to a past date
     '2025-01-11',  -- Restart date (1 day after slip-up)
     'Test slip-up for dual metrics feature'
   );
   ```
3. Verify the record was created successfully

**Alternative: SQL Editor Method:**

1. Open SQL Editor in Supabase dashboard
2. Run the INSERT statement above (replace `[your-test-user-id]` with actual UUID)
3. Click "Run"

**Test Steps:**

1. Reload the app (shake device/simulator → "Reload")
2. Navigate to Journey tab
3. Observe the stats card at the top

**Expected Results:**

- [ ] Stats card displays TWO metrics side-by-side
- [ ] Left column shows "Current Streak" with:
  - Trending up icon (24px)
  - Days since `recovery_restart_date`
  - Label "Current Streak"
  - Font size 32px (smaller than single metric)
- [ ] Right column shows "Journey Started" with:
  - Calendar icon (24px)
  - Days since original `sobriety_date`
  - Label "Journey Started"
  - Font size 32px
- [ ] Divider line appears below metrics (border between stats and additional info)
- [ ] Both metrics are vertically aligned
- [ ] Layout is responsive and balanced

**Screenshot Location:** `_[Add screenshot path]_`

**Sample Calculations:**

```
Test Data:
- sobriety_date: 2024-12-01
- slip_up_date: 2025-01-10
- recovery_restart_date: 2025-01-11
- today: 2025-01-21

Expected Results:
- Current Streak: 10 days (2025-01-21 - 2025-01-11)
- Journey Started: 51 days (2025-01-21 - 2024-12-01)
```

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 3: Milestone Reset Behavior

**Objective:** Verify milestones are calculated from current streak, not original sobriety date.

**Setup:**

- Use same test user from Scenario 2 (with slip-up)
- Ensure `recovery_restart_date` is recent enough that current streak < 30 days

**Test Steps:**

1. Scroll down to the timeline section
2. Observe milestone events (Award icons)
3. Note the dates of any milestones shown

**Expected Results:**

- [ ] Milestones (30, 60, 90 days, etc.) are calculated from `recovery_restart_date`, NOT `sobriety_date`
- [ ] If current streak < 30 days, no "30 Days Sober" milestone appears
- [ ] Old milestones from BEFORE the slip-up still appear in timeline (historical accuracy)
- [ ] "Recovery Journey Began" event appears at bottom of timeline with original `sobriety_date`
- [ ] Milestone dates are accurate when calculated from streak start

**Test Case: Short Streak**

```
recovery_restart_date: 2025-01-11
today: 2025-01-21
Current Streak: 10 days

Expected Milestones Visible: None (haven't reached 30 days yet)
```

**Test Case: Longer Streak**

```
recovery_restart_date: 2024-11-01
today: 2025-01-21
Current Streak: 81 days

Expected Milestones Visible:
- 30 Days Sober (2024-12-01)
- 60 Days Sober (2024-12-30)
- No 90-day milestone yet (would be 2025-01-30)
```

**Screenshot Location:** `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 4: Multiple Slip-Ups

**Objective:** Verify that only the most recent slip-up affects current streak calculation.

**Setup - Database Configuration:**

Add multiple slip-up records:

```sql
-- First slip-up (older)
INSERT INTO slip_ups (user_id, slip_up_date, recovery_restart_date, notes)
VALUES (
  '[your-test-user-id]',
  '2024-12-20',
  '2024-12-21',
  'First test slip-up'
);

-- Second slip-up (most recent)
INSERT INTO slip_ups (user_id, slip_up_date, recovery_restart_date, notes)
VALUES (
  '[your-test-user-id]',
  '2025-01-10',
  '2025-01-11',
  'Second test slip-up (most recent)'
);
```

**Test Steps:**

1. Reload the app
2. Navigate to Journey tab
3. Check Current Streak value
4. Scroll through timeline

**Expected Results:**

- [ ] Current Streak is calculated from MOST RECENT `recovery_restart_date` (2025-01-11)
- [ ] Journey Started still shows days from original `sobriety_date`
- [ ] Both slip-up events appear in timeline
- [ ] Milestones reset to most recent recovery start date
- [ ] Timeline shows complete history chronologically

**Sample Calculation:**

```
Test Data:
- sobriety_date: 2024-12-01
- slip_up_date (1st): 2024-12-20
- recovery_restart_date (1st): 2024-12-21
- slip_up_date (2nd): 2025-01-10
- recovery_restart_date (2nd): 2025-01-11
- today: 2025-01-21

Expected Results:
- Current Streak: 10 days (from 2025-01-11, NOT 2024-12-21)
- Journey Started: 51 days (from 2024-12-01)
```

**Screenshot Location:** `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 5: Edge Case - Zero Days Journey

**Objective:** Verify display when user's sobriety date is today.

**Setup - Database Configuration:**

Update test user's sobriety_date to today:

```sql
UPDATE profiles
SET sobriety_date = CURRENT_DATE
WHERE id = '[your-test-user-id]';
```

**Test Steps:**

1. Reload the app
2. Navigate to Journey tab
3. Observe stats card and timeline

**Expected Results:**

- [ ] Stats card shows "0 Days Sober" (or "0" for Current Streak if slip-ups exist)
- [ ] No milestones appear in timeline (haven't reached 30 days)
- [ ] "Recovery Journey Began" shows today's date
- [ ] No divide-by-zero errors or crashes
- [ ] UI displays "0" clearly and correctly

**Screenshot Location:** `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 6: Edge Case - Different Screen Sizes

**Objective:** Verify dual-metric layout is responsive on various screen sizes.

**Test Steps:**

**Small Screen (iPhone SE / Small Android):**

1. Run app on iPhone SE simulator or small Android device
2. Navigate to Journey tab
3. Check stats card layout

**Expected Results:**

- [ ] Dual metrics display side-by-side without overflow
- [ ] Text doesn't wrap or truncate
- [ ] Icons are properly sized
- [ ] Gap between columns is appropriate

**Large Screen (iPad / Tablet):**

1. Run app on iPad simulator or tablet
2. Navigate to Journey tab
3. Check stats card layout

**Expected Results:**

- [ ] Dual metrics remain balanced
- [ ] Spacing scales appropriately
- [ ] Card doesn't stretch excessively wide
- [ ] Text remains readable

**Web Browser:**

1. Run `pnpm web`
2. Open in browser at various widths (narrow, medium, wide)
3. Check stats card responsiveness

**Expected Results:**

- [ ] Layout adapts to browser width
- [ ] No horizontal scrolling required
- [ ] Metrics remain readable at all sizes

**Screenshot Locations:**

- Small: `_[Add screenshot path]_`
- Large: `_[Add screenshot path]_`
- Web: `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

### Scenario 7: Theme Compatibility

**Objective:** Verify dual-metric layout works correctly in both light and dark themes.

**Test Steps:**

**Light Theme:**

1. Set device to light mode
2. Navigate to Journey tab
3. Check stats card colors and contrast

**Expected Results:**

- [ ] Primary color (purple) applied to icons and numbers
- [ ] Secondary text color readable
- [ ] Border color visible but subtle
- [ ] No color contrast issues

**Dark Theme:**

1. Set device to dark mode
2. Navigate to Journey tab
3. Check stats card colors and contrast

**Expected Results:**

- [ ] Primary color adjusted for dark background
- [ ] Secondary text color remains readable
- [ ] Border color visible against dark background
- [ ] All text meets WCAG contrast guidelines

**Screenshot Locations:**

- Light: `_[Add screenshot path]_`
- Dark: `_[Add screenshot path]_`

**Notes:**

```
[Document any observations, issues, or deviations here]
```

---

## Complete Verification Checklist

After completing all test scenarios, verify all items from the implementation plan:

### Functional Requirements

- [ ] User with no slip-ups sees single metric display
- [ ] User with slip-ups sees dual metric display
- [ ] Current streak resets to 0 after new slip-up
- [ ] Journey started count continues from original date
- [ ] Milestones only show for current streak progress
- [ ] Old milestones from before slip-up still visible in timeline
- [ ] Timeline shows "Recovery Journey Began" at bottom
- [ ] Multiple slip-ups - only most recent affects streak

### Visual/UI Requirements

- [ ] Stats card layout responsive on different screen sizes
- [ ] Theme colors apply correctly to dual-metric layout
- [ ] Icons properly sized (32px single, 24px dual)
- [ ] Font sizes appropriate (48px single, 32px dual)
- [ ] Border divider visible in dual-metric mode
- [ ] Vertical alignment correct in dual columns
- [ ] Spacing and gaps consistent with design

### Code Quality Requirements

- [ ] All quality checks pass (format, lint, typecheck, build, test)
- [ ] No console errors or warnings
- [ ] No performance degradation
- [ ] No memory leaks observed

---

## Database Cleanup (After Testing)

To remove test data and restore clean state:

```sql
-- Remove test slip-ups
DELETE FROM slip_ups
WHERE user_id = '[your-test-user-id]'
AND notes LIKE '%Test%';

-- Optional: Reset sobriety_date if modified
UPDATE profiles
SET sobriety_date = '[original-date]'
WHERE id = '[your-test-user-id]';
```

---

## Test Results Summary

**Date Completed:** `_[Date]_`
**Tester:** `_[Name]_`
**Build Version:** `_[Version]_`
**Platform(s) Tested:** `_[iOS/Android/Web]_`

### Pass/Fail Summary

| Scenario                        | Status            | Notes |
| ------------------------------- | ----------------- | ----- |
| 1. No Slip-Ups (Single Metric)  | ⬜ Pass / ⬜ Fail |       |
| 2. With Slip-Ups (Dual Metrics) | ⬜ Pass / ⬜ Fail |       |
| 3. Milestone Reset              | ⬜ Pass / ⬜ Fail |       |
| 4. Multiple Slip-Ups            | ⬜ Pass / ⬜ Fail |       |
| 5. Zero Days Journey            | ⬜ Pass / ⬜ Fail |       |
| 6. Different Screen Sizes       | ⬜ Pass / ⬜ Fail |       |
| 7. Theme Compatibility          | ⬜ Pass / ⬜ Fail |       |

### Overall Result

⬜ **PASS** - All scenarios passed, feature ready for merge
⬜ **FAIL** - Issues found, see notes below

### Issues Found

```
[Document any bugs, unexpected behavior, or areas needing improvement]

Issue #1:
- Description:
- Steps to Reproduce:
- Expected Behavior:
- Actual Behavior:
- Severity: Critical / Major / Minor

Issue #2:
...
```

### Additional Observations

```
[Any other notes, suggestions, or observations from testing]
```

---

## Sign-Off

**Tester Signature:** `_________________________`
**Date:** `_________________________`

**Reviewer Signature:** `_________________________`
**Date:** `_________________________`

---

## References

- Implementation Plan: `docs/plans/2025-01-21-journey-dual-metrics.md`
- Design Document: `docs/plans/2025-01-21-journey-dual-metrics-design.md`
- Modified Component: `app/(tabs)/journey.tsx`
- Database Schema: `types/database.ts`
