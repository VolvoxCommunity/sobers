# What's New Popup - Design Document

**Date:** 2025-12-25
**Status:** Approved

## Overview

A "What's New" bottom sheet that appears after app open (with 2-3 second delay) when there's unseen release content, showing feature highlights with optional screenshots.

## Key Decisions

| Aspect          | Decision                                                             |
| --------------- | -------------------------------------------------------------------- |
| Content storage | Supabase tables (`whats_new_releases`, `whats_new_features`)         |
| Images          | Supabase Storage bucket (`whats-new-images`)                         |
| Seen tracking   | `profiles.last_seen_version` column                                  |
| UI              | GlassBottomSheet with scrollable feature cards                       |
| Trigger         | Auto-show once per session for logged-in users with unseen content   |
| Re-access       | "What's New" row in Settings                                         |
| Content control | Manually curated - only shows when `is_active = true` release exists |

## Database Schema

### New table: `whats_new_releases`

```sql
create table whats_new_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,        -- e.g., "1.2.0"
  title text not null,                  -- e.g., "What's New in Sobers"
  is_active boolean default false,      -- Only one should be active at a time
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### New table: `whats_new_features`

```sql
create table whats_new_features (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references whats_new_releases(id) on delete cascade,
  title text not null,                  -- e.g., "Money Saved Dashboard"
  description text not null,            -- e.g., "Track how much you've saved since sobriety"
  image_path text,                      -- Path in Supabase Storage (optional)
  display_order int not null default 0, -- For ordering features
  created_at timestamptz default now()
);
```

### Profile addition

```sql
alter table profiles
  add column last_seen_version text;
```

### Supabase Storage

- **Bucket:** `whats-new-images`
- **Access:** Public read

### RLS Policies

- `whats_new_releases`: Public read access (no auth required)
- `whats_new_features`: Public read access (no auth required)
- `profiles.last_seen_version`: User can update their own row (existing RLS pattern)

## Data Flow

### On app open (home screen):

1. User opens app and lands on home screen `/(tabs)`
2. After 2-3 second delay, check if "What's New" should show:
   - Fetch the active release from `whats_new_releases` where `is_active = true`
   - If no active release exists, do nothing
   - Compare `release.version` to `profile.last_seen_version`
   - If versions differ (or profile field is null), show the bottom sheet
3. Use `hasShownThisSession` ref to prevent re-showing on tab navigation

### On dismiss:

1. Update `profiles.last_seen_version` to the current release version
2. Close the bottom sheet

### From Settings:

1. User taps "What's New" row
2. Fetch active release (same query)
3. Show the bottom sheet (regardless of whether they've seen it)

## Component Structure

### New files

```
lib/
  whats-new.ts              # useWhatsNew hook, types, fetch logic

components/
  whats-new/
    WhatsNewSheet.tsx       # Bottom sheet with header, list, dismiss button
    WhatsNewFeatureCard.tsx # Card with skeleton → image, title, description

supabase/
  migrations/
    XXXXXX_add_whats_new_tables.sql
```

### Types

```tsx
interface WhatsNewRelease {
  id: string;
  version: string;
  title: string;
  features: WhatsNewFeature[];
}

interface WhatsNewFeature {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null; // Full Supabase Storage URL
  displayOrder: number;
}
```

## UI Layout

```
┌─────────────────────────────┐
│         ─────               │  ← Handle indicator
│                             │
│   What's New in Sobers      │  ← Title from release.title
│   Version 1.2.0             │  ← Subtitle showing version
│                             │
│ ┌─────────────────────────┐ │
│ │  [Screenshot Image]     │ │  ← Feature image (skeleton while loading)
│ │                         │ │
│ ├─────────────────────────┤ │
│ │  Money Saved Dashboard  │ │  ← Feature title
│ │  Track how much you've  │ │  ← Feature description
│ │  saved since sobriety   │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │  ← Scrollable list of features
│ │  [Next feature...]      │ │
│ └─────────────────────────┘ │
│                             │
│  ┌───────────────────────┐  │
│  │      Got it!          │  │  ← Dismiss button (footer)
│  └───────────────────────┘  │
└─────────────────────────────┘
```

- **Snap points:** `['70%', '90%']`
- **Image loading:** Skeleton loader while images load

## Integration Points

### Home screen (`app/(tabs)/index.tsx`)

```tsx
const whatsNewRef = useRef<GlassBottomSheetRef>(null);
const { shouldShowWhatsNew, markAsSeen } = useWhatsNew();
const hasShownThisSession = useRef(false);

useEffect(() => {
  if (shouldShowWhatsNew && !hasShownThisSession.current) {
    hasShownThisSession.current = true;
    const timer = setTimeout(() => {
      whatsNewRef.current?.present();
    }, 2500);
    return () => clearTimeout(timer);
  }
}, [shouldShowWhatsNew]);
```

### Settings (`components/settings/SettingsContent.tsx`)

```tsx
<SettingsRow
  icon="sparkles"
  label="What's New"
  onPress={() => whatsNewRef.current?.present()}
  showChevron
/>
```

## Error Handling

| Scenario                         | Behavior                                       |
| -------------------------------- | ---------------------------------------------- |
| Network failure fetching release | Silently skip, log error                       |
| No active release                | Do nothing (Settings row shows "No updates")   |
| Image loading failure            | Show feature card without image                |
| Profile update failure           | Popup may show again next session (acceptable) |

## Testing

- Unit tests for `useWhatsNew` hook (mocked Supabase responses)
- Component tests for `WhatsNewSheet` and `WhatsNewFeatureCard`
- Test cases: no active release, features with/without images, dismiss updates profile
