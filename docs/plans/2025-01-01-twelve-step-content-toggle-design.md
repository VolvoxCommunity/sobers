# 12-Step Content Toggle Feature Design

## Overview

Allow users to disable/enable 12-step program content in the app. When disabled, the Steps tab is hidden from bottom navigation. Users can set this preference during onboarding and change it later in Settings.

## Requirements

- **Scope**: Only the Steps tab visibility is affected
- **Default**: Enabled (show 12-step content)
- **Onboarding**: Changeable during onboarding in new "Preferences" section
- **Settings**: Editable in Settings under "Features" section
- **Existing users**: Default to showing 12-step content (treat `null`/`undefined` as `true`)

## Database Schema

Add field to `profiles` table:

```sql
ALTER TABLE profiles
ADD COLUMN show_twelve_step_content BOOLEAN DEFAULT true;
```

**Field behavior:**

- `true` → Show Steps tab (default for new users)
- `false` → Hide Steps tab
- `null`/`undefined` → Treat as `true` (existing users unchanged)

## UI Changes

### Onboarding Restructure

**Before (3 cards):**

1. About You (display name)
2. Your Journey (sobriety date)
3. Savings Tracking (optional)

**After (2 cards):**

1. **YOUR JOURNEY** (merged card):
   - Display name input
   - Sobriety date picker with days count

2. **PREFERENCES** (new card):
   - 12-Step Content toggle
     - Label: "Include 12-Step Content"
     - Subtitle: "Show the 12 Steps tab for step-by-step recovery guidance"
     - Default: ON
   - Savings Tracking toggle + amount/frequency fields (moved from separate card)

### Settings Restructure

**Before:**

- Account (display name)
- Journey (sobriety date)
- Appearance (theme)
- Dashboard (savings visibility)
- About, Sign Out, etc.

**After:**

- **Your Journey** (merged: display name + sobriety date)
- **Features** (renamed from Dashboard):
  - Include 12-Step Content toggle
  - Show savings card toggle
- Appearance (theme)
- About, Sign Out, etc.

### Tab Navigation

When `show_twelve_step_content` is `false`:

- Steps tab hidden from bottom navigation
- User sees 3 tabs instead of 4
- Route still exists but not accessible via tabs

**Edge cases:**

- Direct navigation to `/steps` while disabled → redirect to home
- Setting change takes effect immediately (no restart)

## Files to Modify

### Database

- New migration: `supabase/migrations/XXXXXX_add_show_twelve_step_content.sql`

### Types

- `types/database.ts`: Add `show_twelve_step_content?: boolean` to `Profile`

### Onboarding

- `app/onboarding.tsx`:
  - Merge display name and sobriety date into single "Your Journey" card
  - Create "Preferences" card with 12-step and savings toggles
  - Add `showTwelveStepContent` state (default `true`)
  - Include in profile upsert
- `components/onboarding/SavingsTrackingCard.tsx`: May be refactored/removed

### Settings

- `components/settings/SettingsContent.tsx`:
  - Merge "Account" and "Journey" → "Your Journey"
  - Rename "Dashboard" → "Features"
  - Add 12-step toggle with database update handler

### Navigation

- `app/(app)/(tabs)/_layout.tsx`: Conditionally render Steps tab

### Tests

- `__tests__/app/onboarding.test.tsx`: Update for new structure
- `__tests__/components/settings/SettingsContent.test.tsx`: Update sections, add toggle tests
- `__tests__/app/(tabs)/_layout.test.tsx`: Add tab visibility tests

## Implementation Notes

1. **Toggle style**: Match existing savings toggle visual pattern
2. **Analytics**: Track when users change this setting via `SETTINGS_CHANGED` event
3. **Profile refresh**: Changes should reflect immediately via `refreshProfile()`
4. **Migration**: Use `DEFAULT true` so existing rows get the correct default behavior
