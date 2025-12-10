# Display Name & Condensed Onboarding Design

**Date**: 2025-12-09
**Status**: Approved
**Author**: Claude (via brainstorming session)

## Overview

Replace the current `first_name` + `last_initial` fields with a single `display_name` field, and condense the two-step onboarding flow into a single page.

## Goals

1. Simplify the data model (one field instead of two)
2. Give users full control over their display identity
3. Reduce onboarding friction (one page instead of two)
4. Maintain privacy (users choose how they appear)

## Decisions Made

| Decision                | Choice                                                | Rationale                                         |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Display name format     | Completely free-form                                  | Maximum user flexibility                          |
| Existing user migration | Auto-migrate                                          | Seamless, no user action required                 |
| Onboarding layout       | Card-based grouping                                   | Matches existing design language                  |
| Validation rules        | Moderate (2-30 chars, letters/spaces/periods/hyphens) | Prevents abuse while allowing common name formats |
| OAuth pre-fill          | Yes, auto-populate                                    | Reduces friction, user can still edit             |
| Real-time feedback      | Yes                                                   | Character count + live validation                 |

---

## Database Schema Change

### Current Schema

```typescript
interface Profile {
  first_name: string | null;
  last_initial: string | null;
  // ...other fields
}
```

### New Schema

```typescript
interface Profile {
  display_name: string | null; // 2-30 chars, letters/spaces/periods/hyphens
  // first_name and last_initial removed
}
```

### Migration SQL

```sql
-- Migration: replace first_name/last_initial with display_name

-- Step 1: Add new column
ALTER TABLE profiles ADD COLUMN display_name TEXT;

-- Step 2: Migrate existing data
UPDATE profiles
SET display_name = CONCAT(
  COALESCE(first_name, ''),
  CASE WHEN last_initial IS NOT NULL AND last_initial != ''
       THEN CONCAT(' ', last_initial, '.')
       ELSE ''
  END
)
WHERE first_name IS NOT NULL OR last_initial IS NOT NULL;

-- Step 3: Drop old columns (separate migration after app deployment)
-- ALTER TABLE profiles DROP COLUMN first_name;
-- ALTER TABLE profiles DROP COLUMN last_initial;
```

### Auth Trigger Update

The Supabase auth trigger that creates profiles on signup needs updating to set `display_name` instead of `first_name`/`last_initial` from OAuth metadata.

---

## Condensed Onboarding UI

### Single-Page Layout

```
┌─────────────────────────────────────────┐
│  Welcome to Sobriety Waypoint           │
│  Let's set up your profile.             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  👤 ABOUT YOU                   │    │
│  │                                 │    │
│  │  Display Name                   │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ John D.                 │    │    │
│  │  └─────────────────────────┘    │    │
│  │  5/30 characters               │    │
│  │  ⓘ How you'll appear to others │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📅 YOUR JOURNEY                │    │
│  │                                 │    │
│  │  Sobriety Date                  │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ December 9, 2024        │    │    │
│  │  └─────────────────────────┘    │    │
│  │                                 │    │
│  │        ┌─────────┐              │    │
│  │        │   42    │              │    │
│  │        │  Days   │              │    │
│  │        └─────────┘              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ☑ I agree to Privacy Policy & Terms    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Complete Setup      →      │    │
│  └─────────────────────────────────┘    │
│                                         │
│           🚪 Sign Out                   │
└─────────────────────────────────────────┘
```

### Removed Complexity

- `step` state variable
- `hasCompleteName` logic for step-skipping
- `userWentBackToStep1` tracking
- `advanceToStep2` function
- `renderStep1` / `renderStep2` separation
- `ProgressBar` component
- Back button navigation

### OAuth Pre-fill Logic

```typescript
// Extract display name from OAuth user metadata
const firstName = userMetadata.given_name || userMetadata.name?.split(' ')[0] || '';
const lastInitial = userMetadata.family_name?.[0] || userMetadata.name?.split(' ')[1]?.[0] || '';
const displayName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
```

---

## Validation

### Display Name Rules

- **Required**: Cannot be empty after trimming
- **Length**: 2-30 characters
- **Characters**: Letters (any language via `\p{L}`), spaces, periods, hyphens
- **Regex**: `/^[\p{L}\s.\-]{2,30}$/u`

### Validation Function

```typescript
const DISPLAY_NAME_REGEX = /^[\p{L}\s.\-]{2,30}$/u;

function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Display name is required';
  }
  if (trimmed.length < 2) {
    return 'Display name must be at least 2 characters';
  }
  if (trimmed.length > 30) {
    return 'Display name must be 30 characters or less';
  }
  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return 'Display name can only contain letters, spaces, periods, and hyphens';
  }
  return null; // Valid
}
```

### Real-Time Feedback

- Character count shown below input: "5/30 characters"
- Count changes color when approaching limit (25+) or invalid
- Validation error shown as user types (debounced ~300ms)
- "Complete Setup" button disabled until all fields valid

---

## Files to Modify

### Core Application Files (~8 files)

| File                                    | Change                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `types/database.ts`                     | Replace `first_name`/`last_initial` with `display_name` in Profile interface |
| `app/onboarding.tsx`                    | Rewrite to single-page layout, remove step logic, use `displayName` state    |
| `app/settings.tsx`                      | Update edit modal: single field instead of two, new validation               |
| `app/(tabs)/profile.tsx`                | Update display: `profile.display_name` instead of template string            |
| `app/(tabs)/tasks.tsx`                  | Update sponsor/sponsee name display                                          |
| `app/_layout.tsx`                       | Update onboarding check: `profile?.display_name` instead of both fields      |
| `components/auth/AppleSignInButton.tsx` | Update OAuth name extraction to build `display_name`                         |
| `lib/analytics-utils.ts`                | Update any name-related analytics                                            |

### Test Files (~7 files)

| File                                                   | Change                             |
| ------------------------------------------------------ | ---------------------------------- |
| `__tests__/app/onboarding.test.tsx`                    | Major rewrite for single-page flow |
| `__tests__/app/settings.test.tsx`                      | Update name edit modal tests       |
| `__tests__/contexts/AuthContext.test.tsx`              | Update mock profiles               |
| `__tests__/app/layout.test.tsx`                        | Update auth guard tests            |
| `__tests__/app/profile.test.tsx`                       | Update profile display tests       |
| `__tests__/app/tasks.test.tsx`                         | Update name display in task cards  |
| `__tests__/components/auth/AppleSignInButton.test.tsx` | Update OAuth tests                 |

### Components to Remove

- `components/onboarding/ProgressBar.tsx` (no longer needed)
- Associated test file if exists

---

## Display Pattern Change

### Before

```typescript
// Everywhere names are displayed
`${profile.first_name} ${profile.last_initial}.`;

// Auth guard check
profile?.first_name && profile?.last_initial;
```

### After

```typescript
// Everywhere names are displayed
profile.display_name;

// Auth guard check
profile?.display_name;
```

---

## Rollout Strategy

### Sequence

1. **Deploy database migration** - Add `display_name` column, populate from existing data
2. **Update auth trigger** - Set `display_name` on new signups
3. **Deploy app update** - New code reads/writes `display_name` only
4. **Verify in production** - Monitor for issues, check analytics
5. **Cleanup migration** - Drop `first_name` and `last_initial` columns

### Backward Compatibility

- Not needed (mobile app auto-updates via OTA)
- Web builds deploy instantly
- Single atomic deployment approach

---

## Testing Strategy

### Unit Tests

- Validation function with edge cases (empty, too short, too long, invalid chars, valid)
- OAuth pre-fill logic with various metadata shapes

### Integration Tests

- Onboarding flow completion
- Settings name edit flow
- Profile display rendering

### E2E Tests (Maestro)

- Full onboarding flow with new single-page design
- Edit display name in settings

---

## Success Criteria

1. All existing users migrated with no data loss
2. New users complete onboarding on single page
3. Display names render correctly throughout app
4. OAuth sign-in pre-fills display name appropriately
5. Validation prevents invalid names with clear feedback
6. All tests pass with 80%+ coverage maintained
