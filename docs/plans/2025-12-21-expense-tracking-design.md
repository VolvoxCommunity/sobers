# Expense Tracking Feature Design

**Issue:** [#191 - Track money saved since sobriety start date](https://github.com/VolvoxCommunity/sobers/issues/191)
**Date:** 2025-12-21
**Status:** Approved

## Overview

Enable users to visualize financial savings accumulated since beginning their sobriety journey by calculating total money saved based on previous addiction spending patterns.

## Design Decisions

| Decision            | Choice                                 | Rationale                                 |
| ------------------- | -------------------------------------- | ----------------------------------------- |
| Dashboard placement | Separate card below Sobriety Journey   | More prominent, clear visual hierarchy    |
| Currency            | USD only                               | Simplest for MVP, can add selection later |
| Onboarding UX       | Toggle switch opt-in                   | Clean UX, fields only appear when enabled |
| Frequencies         | All four (daily/weekly/monthly/yearly) | Maximum flexibility per issue spec        |
| Profile editing     | Tap card → bottom sheet                | Most intuitive, zero navigation           |

## Database Schema

**New fields in `profiles` table:**

```sql
addiction_spending_amount DECIMAL(10,2) NULL
  CHECK (addiction_spending_amount >= 0),
addiction_spending_frequency TEXT NULL
  CHECK (addiction_spending_frequency IN ('daily', 'weekly', 'monthly', 'yearly'))
```

**Constraints:**

- Both fields nullable (feature is optional)
- Amount must be non-negative
- Frequency validated via CHECK constraint

## Calculation Logic

Computed on frontend, not stored:

```
Daily rate = amount ÷ divisor
  - daily: ÷ 1
  - weekly: ÷ 7
  - monthly: ÷ 30.44
  - yearly: ÷ 365

Total saved = days_sober × daily_rate
```

**Breakdown calculations:**

- Per day = total_saved / days_sober
- Per week = per_day × 7
- Per month = per_day × 30.44

## UI Components

### Onboarding Card

New optional card after "Your Journey" card:

```
💰 TRACK YOUR SAVINGS (Optional)

[Toggle: "I want to track money saved"]

When toggled ON:
┌─────────────────────────────────────┐
│ How much did you spend on your     │
│ addiction?                          │
│                                     │
│ $ [___________] per [dropdown ▼]   │
│                     - Daily         │
│                     - Weekly        │
│                     - Monthly       │
│                     - Yearly        │
└─────────────────────────────────────┘
```

**Behavior:**

- Toggle defaults to OFF
- Both fields required if toggle is ON
- Validation: amount ≥ 0

### Dashboard Card

New card below Sobriety Journey card:

```
┌─────────────────────────────────────┐
│ 💵  Money Saved                     │
│                                     │
│         $1,234.56                   │
│                                     │
│   Based on $50/week spending        │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ Day   │ │ Week  │ │ Month │     │
│  │$7.14  │ │$50.00 │ │$217.39│     │
│  └───────┘ └───────┘ └───────┘     │
└─────────────────────────────────────┘
```

**Behavior:**

- Only displays if user has spending data
- Tapping opens edit bottom sheet
- Shows breakdown by day/week/month

### Edit Bottom Sheet

```
┌─────────────────────────────────────┐
│         Edit Savings Tracking       │
│                                     │
│ Amount                              │
│ $ [50.00___________]                │
│                                     │
│ Frequency                           │
│ [Weekly ▼]                          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │          Save Changes           │ │
│ └─────────────────────────────────┘ │
│                                     │
│        Clear Tracking Data          │
│                (red text link)      │
└─────────────────────────────────────┘
```

**Behavior:**

- Pre-fills with current values
- "Clear Tracking Data" shows confirmation, sets both fields to null

## TypeScript Types

```typescript
// Add to Profile interface (types/database.ts):
addiction_spending_amount?: number | null;
addiction_spending_frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;

// New type (lib/savings.ts):
type SpendingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface SavingsCalculation {
  totalSaved: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
}
```

## Files to Create

| File                                                                        | Purpose                       |
| --------------------------------------------------------------------------- | ----------------------------- |
| `supabase/migrations/YYYYMMDDHHMMSS_add_addiction_spending_to_profiles.sql` | Database migration            |
| `lib/savings.ts`                                                            | Calculation utilities + types |
| `components/onboarding/SavingsTrackingCard.tsx`                             | Onboarding toggle + inputs    |
| `components/dashboard/MoneySavedCard.tsx`                                   | Dashboard display             |
| `components/sheets/EditSavingsSheet.tsx`                                    | Edit bottom sheet             |

## Files to Modify

| File                         | Change                                |
| ---------------------------- | ------------------------------------- |
| `types/database.ts`          | Add spending fields to Profile        |
| `app/onboarding.tsx`         | Add SavingsTrackingCard               |
| `app/(app)/(tabs)/index.tsx` | Add MoneySavedCard + EditSavingsSheet |

## Tests

### Unit Tests

| Test                                                           | Coverage                       |
| -------------------------------------------------------------- | ------------------------------ |
| `__tests__/lib/savings.test.ts`                                | Calculation logic, edge cases  |
| `__tests__/components/onboarding/SavingsTrackingCard.test.tsx` | Toggle, inputs, validation     |
| `__tests__/components/dashboard/MoneySavedCard.test.tsx`       | Display, formatting, breakdown |
| `__tests__/components/sheets/EditSavingsSheet.test.tsx`        | Edit, clear, validation        |

### E2E Tests

| Test                           | Coverage                                         |
| ------------------------------ | ------------------------------------------------ |
| `e2e/savings-tracking.spec.ts` | Full flow: onboarding → dashboard → edit → clear |

## Acceptance Criteria

From issue #191:

- [ ] Optional setup during onboarding with frequency selection
- [ ] Calculated savings displayed on dashboard
- [ ] Edit/clear functionality in profile (via bottom sheet)
- [ ] Accurate date-based calculations using sobriety_date
- [ ] USD currency formatting
- [ ] 80% minimum test coverage
