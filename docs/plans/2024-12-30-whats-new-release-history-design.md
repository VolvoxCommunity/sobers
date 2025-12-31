# What's New Release History Design

## Overview

Transform the "What's New" feature from showing only the latest release to displaying a full release history with collapsible version sections.

## Goals

- Show all releases, sorted by version (newest first)
- Group features by version, then by type within each version
- Highlight unseen versions with visual emphasis
- Simplify data model by removing `is_active` flag

## Design Decisions

| Decision              | Choice                                                |
| --------------------- | ----------------------------------------------------- |
| Trigger behavior      | Auto-popup shows full history when new release exists |
| Version organization  | Collapsible sections per version                      |
| Main title            | "The Good Stuff"                                      |
| Section headers       | "v1.2.0 · Holiday Update · Dec 2024"                  |
| New version indicator | "NEW" badge + accent border/background                |
| Release visibility    | All releases (no `is_active` filter)                  |

## Data Layer Changes

### Database Migration

```sql
-- Remove is_active column and update RLS
ALTER TABLE public.whats_new_releases DROP COLUMN is_active;

DROP INDEX IF EXISTS idx_whats_new_releases_active;

DROP POLICY IF EXISTS "Anyone can read active releases" ON public.whats_new_releases;

CREATE POLICY "Anyone can read releases"
  ON public.whats_new_releases FOR SELECT
  USING (true);

-- Update features policy to allow all (parent table controls access)
DROP POLICY IF EXISTS "Anyone can read features of active releases" ON public.whats_new_features;

CREATE POLICY "Anyone can read features"
  ON public.whats_new_features FOR SELECT
  USING (true);
```

### Hook Changes (`lib/whats-new.ts`)

**Updated types:**

```typescript
interface UseWhatsNewResult {
  shouldShowWhatsNew: boolean;
  releases: WhatsNewRelease[]; // All releases, newest first
  isLoading: boolean;
  markAsSeen: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Fetching logic:**

- Fetch all releases ordered by semantic version descending
- For each release, fetch features sorted by type (feature > fix), then display_order
- `shouldShowWhatsNew` = latest release version !== user's `last_seen_version`

**Version sorting:**

- Use semver comparison (1.2.0 > 1.1.0 > 1.0.0)
- Handle edge cases gracefully (malformed versions sort to end)

## UI Components

### WhatsNewSheet (modified)

```
┌─────────────────────────────────────────────┐
│              The Good Stuff                 │  ← Static title
├─────────────────────────────────────────────┤
│                                             │
│  [WhatsNewVersionSection v1.2.0 - NEW]      │  ← Expanded
│  [WhatsNewVersionSection v1.1.0]            │  ← Collapsed
│  [WhatsNewVersionSection v1.0.0]            │  ← Collapsed
│                                             │
├─────────────────────────────────────────────┤
│              [ Got it! ]                    │
└─────────────────────────────────────────────┘
```

### WhatsNewVersionSection (new component)

**Props:**

```typescript
interface WhatsNewVersionSectionProps {
  release: WhatsNewRelease;
  isNew: boolean; // Shows NEW badge + accent styling
  defaultExpanded: boolean; // Initial expand state
}
```

**Header layout:**

```
┌─────────────────────────────────────────────────────┐
│ [NEW]  v1.2.0 · Holiday Update · Dec 2024        ▼ │
└─────────────────────────────────────────────────────┘
```

**Styling:**

- New version: Primary color left border (4px) + subtle background tint + "NEW" badge
- Older versions: Standard card styling, neutral colors
- Chevron: Rotates 90° on expand/collapse

**Content (when expanded):**

- Features sorted: type='feature' first, then type='fix'
- Within same type: sorted by display_order
- Renders existing `WhatsNewFeatureCard` for each feature

## Interaction Behavior

### Expand/Collapse

- Latest unseen version: Expanded by default
- Older versions: Collapsed by default
- If user has seen latest: All sections start collapsed
- Tapping header toggles that section
- Multiple sections can be open simultaneously

### Animation

- Height animation on expand/collapse (LayoutAnimation or Animated API)
- Chevron rotation animates with expand/collapse (0° → 90°)

### Scroll

- Sheet opens scrolled to top
- Latest version always visible first

### Dismissal

- "Got it!" button calls `markAsSeen()` with latest version
- Dismisses the sheet

## Settings Integration

Add "The Good Stuff" menu item in Settings:

- Location: Under existing section or new "About" section
- Icon: `sparkles` or similar
- Action: Opens WhatsNewSheet with all sections collapsed

## File Changes

### New Files

- `components/whats-new/WhatsNewVersionSection.tsx`
- `__tests__/components/whats-new/WhatsNewVersionSection.test.tsx`
- `supabase/migrations/YYYYMMDD_remove_is_active_from_whats_new.sql`

### Modified Files

- `lib/whats-new.ts` — Multi-release fetching, semver sorting
- `components/whats-new/WhatsNewSheet.tsx` — New title, version sections
- `components/settings/SettingsContent.tsx` — Add menu item
- `__tests__/lib/whats-new.test.ts` — Multi-release scenarios
- `__tests__/components/whats-new/WhatsNewSheet.test.tsx` — Updated tests

### Unchanged

- `components/whats-new/WhatsNewFeatureCard.tsx` — Reused as-is

## Test Scenarios

### Unit Tests

- Semver sorting (1.10.0 > 1.9.0 > 1.2.0)
- Multiple releases fetched and ordered correctly
- Features grouped by type within each release
- `shouldShowWhatsNew` logic with various `last_seen_version` values

### Component Tests

- Collapsible section expand/collapse
- NEW badge appears only on unseen versions
- Correct initial expand state based on seen status
- Settings menu item opens sheet

### Integration Tests

- Full flow: new release → auto-popup → dismiss → marked as seen
- Settings access when no new releases
