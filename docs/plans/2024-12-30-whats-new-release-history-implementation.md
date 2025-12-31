# What's New Release History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform What's New from showing only the latest release to displaying a full release history with collapsible version sections.

**Architecture:** Modify the `useWhatsNew` hook to fetch all releases (not just active), sort them by semver, and return an array. Create a new `WhatsNewVersionSection` component for collapsible sections. Update `WhatsNewSheet` to render version sections with "The Good Stuff" title.

**Tech Stack:** React Native, TypeScript, Supabase, React Native Reanimated (for animations)

---

## Task 1: Database Migration - Remove is_active

**Files:**

- Create: `supabase/migrations/20251230000000_remove_is_active_from_whats_new.sql`

**Step 1: Create migration file**

```sql
-- Migration: Remove is_active column from whats_new_releases
-- Description: Simplify schema - all releases are now visible, latest by version triggers popup

-- Drop the partial index on is_active
DROP INDEX IF EXISTS idx_whats_new_releases_active;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Anyone can read active releases" ON public.whats_new_releases;
DROP POLICY IF EXISTS "Anyone can read features of active releases" ON public.whats_new_features;

-- Create new permissive RLS policies
CREATE POLICY "Anyone can read releases"
  ON public.whats_new_releases FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read features"
  ON public.whats_new_features FOR SELECT
  USING (true);

-- Remove is_active column (do this last to avoid policy errors)
ALTER TABLE public.whats_new_releases DROP COLUMN IF EXISTS is_active;
```

**Step 2: Verify migration syntax**

Run: `cat supabase/migrations/20251230000000_remove_is_active_from_whats_new.sql`
Expected: File contents displayed without errors

**Step 3: Commit**

```bash
git add supabase/migrations/20251230000000_remove_is_active_from_whats_new.sql
git commit -m "chore(supabase): add migration to remove is_active from whats_new_releases"
```

---

## Task 2: Add semver comparison utility

**Files:**

- Create: `lib/semver.ts`
- Create: `__tests__/lib/semver.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/semver.test.ts
import { compareSemver, sortByVersion } from '@/lib/semver';

describe('semver utilities', () => {
  describe('compareSemver', () => {
    it('returns negative when a < b', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0);
      expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    });

    it('returns positive when a > b', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
    });

    it('returns zero when versions are equal', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('2.5.3', '2.5.3')).toBe(0);
    });

    it('handles versions with different segment counts', () => {
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('1', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0', '1')).toBe(0);
    });

    it('handles double-digit version numbers correctly', () => {
      expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
      expect(compareSemver('1.2.10', '1.2.9')).toBeGreaterThan(0);
      expect(compareSemver('10.0.0', '9.0.0')).toBeGreaterThan(0);
    });

    it('handles malformed versions gracefully', () => {
      // Malformed versions should sort to end (return negative for malformed 'a')
      expect(compareSemver('invalid', '1.0.0')).toBeGreaterThan(0);
      expect(compareSemver('1.0.0', 'invalid')).toBeLessThan(0);
      expect(compareSemver('invalid', 'invalid')).toBe(0);
    });
  });

  describe('sortByVersion', () => {
    it('sorts versions in descending order (newest first)', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0', '1.0.1'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0.0', '1.5.0', '1.0.1', '1.0.0']);
    });

    it('handles complex version ordering', () => {
      const versions = ['1.9.0', '1.10.0', '2.0.0', '1.2.0'];
      const sorted = sortByVersion(versions);
      expect(sorted).toEqual(['2.0.0', '1.10.0', '1.9.0', '1.2.0']);
    });

    it('returns empty array for empty input', () => {
      expect(sortByVersion([])).toEqual([]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/lib/semver.test.ts`
Expected: FAIL with "Cannot find module '@/lib/semver'"

**Step 3: Write minimal implementation**

```typescript
// lib/semver.ts

/**
 * Parses a version string into numeric segments.
 * Returns [Infinity] for malformed versions to sort them to the end.
 */
function parseVersion(version: string): number[] {
  const segments = version.split('.').map((s) => parseInt(s, 10));
  if (segments.some(isNaN)) {
    return [Infinity]; // Malformed versions sort to end
  }
  return segments;
}

/**
 * Compares two semantic version strings.
 *
 * @param a - First version string (e.g., "1.2.3")
 * @param b - Second version string (e.g., "1.2.4")
 * @returns Negative if a < b, positive if a > b, zero if equal
 *
 * @example
 * compareSemver('1.0.0', '2.0.0') // returns -1
 * compareSemver('2.0.0', '1.0.0') // returns 1
 * compareSemver('1.0.0', '1.0.0') // returns 0
 */
export function compareSemver(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] ?? 0;
    const bVal = bParts[i] ?? 0;

    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }

  return 0;
}

/**
 * Sorts an array of version strings in descending order (newest first).
 *
 * @param versions - Array of version strings
 * @returns New array sorted by version descending
 *
 * @example
 * sortByVersion(['1.0.0', '2.0.0', '1.5.0'])
 * // returns ['2.0.0', '1.5.0', '1.0.0']
 */
export function sortByVersion<T extends string>(versions: T[]): T[] {
  return [...versions].sort((a, b) => compareSemver(b, a));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/lib/semver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/semver.ts __tests__/lib/semver.test.ts
git commit -m "feat(lib): add semver comparison utilities for version sorting"
```

---

## Task 3: Update WhatsNewRelease type to include createdAt

**Files:**

- Modify: `lib/whats-new.ts:35-40`

**Step 1: Write the failing test**

Add to `__tests__/lib/whats-new.test.ts` (after existing imports):

```typescript
// Add at line ~70, after mockFeatures:
const mockMultipleReleases = [
  {
    id: 'release-3',
    version: '3.0.0',
    title: 'Major Update',
    created_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'release-2',
    version: '2.0.0',
    title: 'Feature Release',
    created_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'release-1',
    version: '1.0.0',
    title: 'Initial Release',
    created_at: '2024-10-01T00:00:00Z',
  },
];
```

Add new test block after existing tests (~line 740):

```typescript
describe('multiple releases', () => {
  beforeEach(() => {
    mockProfile.last_seen_version = '2.0.0';

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'whats_new_releases') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockMultipleReleases,
            error: null,
          }),
        };
      }
      if (table === 'whats_new_features') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockFeatures,
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
    });
  });

  it('returns all releases sorted by version descending', async () => {
    const { result } = renderHook(() => useWhatsNew());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases).toHaveLength(3);
    expect(result.current.releases[0].version).toBe('3.0.0');
    expect(result.current.releases[1].version).toBe('2.0.0');
    expect(result.current.releases[2].version).toBe('1.0.0');
  });

  it('includes createdAt in release data', async () => {
    const { result } = renderHook(() => useWhatsNew());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.releases[0].createdAt).toBe('2024-12-01T00:00:00Z');
  });

  it('shouldShowWhatsNew is true when latest version differs from last_seen_version', async () => {
    const { result } = renderHook(() => useWhatsNew());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Latest is 3.0.0, user saw 2.0.0
    expect(result.current.shouldShowWhatsNew).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/lib/whats-new.test.ts -t "multiple releases"`
Expected: FAIL with "releases is not defined" or similar

**Step 3: Update types and implementation**

Update `lib/whats-new.ts`:

```typescript
// Update WhatsNewRelease interface (around line 35):
export interface WhatsNewRelease {
  id: string;
  version: string;
  title: string;
  createdAt: string;
  features: WhatsNewFeature[];
}

// Update UseWhatsNewResult interface (around line 45):
export interface UseWhatsNewResult {
  /** Whether there's unseen content to show */
  shouldShowWhatsNew: boolean;
  /** All releases sorted by version descending */
  releases: WhatsNewRelease[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Mark the latest release as seen */
  markAsSeen: () => Promise<void>;
  /** Refetch release data */
  refetch: () => Promise<void>;
}
```

**Step 4: This is a partial step - continue to Task 4 for full implementation**

---

## Task 4: Refactor useWhatsNew hook for multiple releases

**Files:**

- Modify: `lib/whats-new.ts`

**Step 1: Update the hook implementation**

Replace the entire `useWhatsNew` function body with:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logger, LogCategory } from '@/lib/logger';
import { compareSemver } from '@/lib/semver';

// ... types remain same as updated in Task 3 ...

export function useWhatsNew(): UseWhatsNewResult {
  const { profile, refreshProfile } = useAuth();
  const [releases, setReleases] = useState<WhatsNewRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches all releases and their features from Supabase.
   */
  const fetchReleases = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all releases
      const { data: releasesData, error: releasesError } = await supabase
        .from('whats_new_releases')
        .select('id, version, title, created_at')
        .order('created_at', { ascending: false });

      if (releasesError) {
        throw releasesError;
      }

      if (!releasesData || releasesData.length === 0) {
        setReleases([]);
        return;
      }

      // Fetch all features for these releases
      const releaseIds = releasesData.map((r) => r.id);
      const { data: featuresData, error: featuresError } = await supabase
        .from('whats_new_features')
        .select('id, release_id, title, description, image_path, display_order, type')
        .in('release_id', releaseIds)
        .order('display_order', { ascending: true });

      if (featuresError) {
        throw featuresError;
      }

      // Group features by release_id
      const featuresByRelease = new Map<string, typeof featuresData>();
      for (const feature of featuresData || []) {
        const existing = featuresByRelease.get(feature.release_id) || [];
        existing.push(feature);
        featuresByRelease.set(feature.release_id, existing);
      }

      // Transform and sort releases by version descending
      const transformedReleases: WhatsNewRelease[] = releasesData
        .map((r) => {
          const releaseFeatures = featuresByRelease.get(r.id) || [];
          return {
            id: r.id,
            version: r.version,
            title: r.title,
            createdAt: r.created_at,
            features: releaseFeatures.map((f) => ({
              id: f.id,
              title: f.title,
              description: f.description,
              imageUrl: f.image_path ? `${SUPABASE_STORAGE_URL}/${f.image_path}` : null,
              displayOrder: f.display_order,
              type: (f.type as WhatsNewFeatureType) || 'feature',
            })),
          };
        })
        .sort((a, b) => compareSemver(b.version, a.version));

      setReleases(transformedReleases);
    } catch (error) {
      logger.error("Failed to fetch What's New releases", error as Error, {
        category: LogCategory.DATABASE,
      });
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Marks the latest release as seen by updating the profile.
   */
  const markAsSeen = useCallback(async () => {
    if (!profile?.id || releases.length === 0) return;

    const latestVersion = releases[0].version;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_version: latestVersion })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      logger.error("Failed to mark What's New as seen", error as Error, {
        category: LogCategory.DATABASE,
      });
    }
  }, [profile?.id, releases, refreshProfile]);

  // Fetch on mount
  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  // Determine if we should show based on version comparison
  const latestVersion = releases[0]?.version ?? null;
  const shouldShowWhatsNew =
    !isLoading &&
    releases.length > 0 &&
    profile !== null &&
    latestVersion !== null &&
    profile.last_seen_version !== latestVersion;

  return {
    shouldShowWhatsNew,
    releases,
    isLoading,
    markAsSeen,
    refetch: fetchReleases,
  };
}
```

**Step 2: Run test to verify it passes**

Run: `pnpm test -- __tests__/lib/whats-new.test.ts`
Expected: Multiple failures due to test mocks expecting old API

**Step 3: Update existing tests to use new API**

The existing tests need to be updated to:

1. Mock the new query structure (no `.eq('is_active', true)`, uses `.in()` for features)
2. Access `releases` array instead of `activeRelease`
3. Update assertions for the new return shape

This is a significant refactor - update all test mocks and assertions to match the new API.

**Step 4: Run all tests**

Run: `pnpm test -- __tests__/lib/whats-new.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/whats-new.ts __tests__/lib/whats-new.test.ts
git commit -m "refactor(whats-new): fetch all releases sorted by version"
```

---

## Task 5: Create WhatsNewVersionSection component

**Files:**

- Create: `components/whats-new/WhatsNewVersionSection.tsx`
- Create: `__tests__/components/whats-new/WhatsNewVersionSection.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/whats-new/WhatsNewVersionSection.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WhatsNewVersionSection from '@/components/whats-new/WhatsNewVersionSection';
import type { WhatsNewRelease } from '@/lib/whats-new';

// Mock theme
const mockTheme = {
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#007AFF',
  card: '#ffffff',
  border: '#e0e0e0',
  background: '#f5f5f5',
  fontRegular: 'System',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

// Mock WhatsNewFeatureCard
jest.mock('@/components/whats-new/WhatsNewFeatureCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ feature }: { feature: { title: string } }) =>
      React.createElement(View, { testID: `feature-${feature.title}` },
        React.createElement(Text, null, feature.title)
      ),
  };
});

describe('WhatsNewVersionSection', () => {
  const mockRelease: WhatsNewRelease = {
    id: 'release-1',
    version: '1.2.0',
    title: 'Holiday Update',
    createdAt: '2024-12-01T00:00:00Z',
    features: [
      { id: '1', title: 'Feature 1', description: 'Desc', imageUrl: null, displayOrder: 0, type: 'feature' },
      { id: '2', title: 'Bug Fix', description: 'Desc', imageUrl: null, displayOrder: 1, type: 'fix' },
    ],
  };

  describe('header rendering', () => {
    it('displays version, title, and formatted date', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      expect(screen.getByText(/v1\.2\.0/)).toBeTruthy();
      expect(screen.getByText(/Holiday Update/)).toBeTruthy();
      expect(screen.getByText(/Dec 2024/)).toBeTruthy();
    });

    it('shows NEW badge when isNew is true', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={true} defaultExpanded={false} />
      );

      expect(screen.getByText('NEW')).toBeTruthy();
    });

    it('does not show NEW badge when isNew is false', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      expect(screen.queryByText('NEW')).toBeNull();
    });
  });

  describe('expand/collapse behavior', () => {
    it('starts collapsed when defaultExpanded is false', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      expect(screen.queryByText('Feature 1')).toBeNull();
    });

    it('starts expanded when defaultExpanded is true', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={true} />
      );

      expect(screen.getByText('Feature 1')).toBeTruthy();
    });

    it('toggles content visibility when header is pressed', () => {
      render(
        <WhatsNewVersionSection release={mockRelease} isNew={false} defaultExpanded={false} />
      );

      // Initially collapsed
      expect(screen.queryByText('Feature 1')).toBeNull();

      // Press header to expand
      fireEvent.press(screen.getByTestId('version-section-header'));
      expect(screen.getByText('Feature 1')).toBeTruthy();

      // Press again to collapse
      fireEvent.press(screen.getByTestId('version-section-header'));
      expect(screen.queryByText('Feature 1')).toBeNull();
    });
  });

  describe('feature sorting', () => {
    it('renders features sorted by type (features first, then fixes)', () => {
      const releaseWithMixedTypes: WhatsNewRelease = {
        ...mockRelease,
        features: [
          { id: '1', title: 'Fix A', description: 'D', imageUrl: null, displayOrder: 0, type: 'fix' },
          { id: '2', title: 'Feature B', description: 'D', imageUrl: null, displayOrder: 1, type: 'feature' },
          { id: '3', title: 'Fix C', description: 'D', imageUrl: null, displayOrder: 2, type: 'fix' },
        ],
      };

      render(
        <WhatsNewVersionSection release={releaseWithMixedTypes} isNew={false} defaultExpanded={true} />
      );

      const features = screen.getAllByTestId(/^feature-/);
      expect(features[0].props.testID).toBe('feature-Feature B');
      expect(features[1].props.testID).toBe('feature-Fix A');
      expect(features[2].props.testID).toBe('feature-Fix C');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewVersionSection.test.tsx`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

```typescript
// components/whats-new/WhatsNewVersionSection.tsx
/**
 * @fileoverview WhatsNewVersionSection component
 *
 * A collapsible section displaying a single release version with its features.
 * Shows version number, title, date, and optionally a NEW badge.
 */

// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import WhatsNewFeatureCard from './WhatsNewFeatureCard';
import type { WhatsNewRelease } from '@/lib/whats-new';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Types
// =============================================================================

interface WhatsNewVersionSectionProps {
  /** The release data to display */
  release: WhatsNewRelease;
  /** Whether this is a new (unseen) version */
  isNew: boolean;
  /** Whether the section starts expanded */
  defaultExpanded: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formats a date string to "Mon YYYY" format.
 */
function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Collapsible section displaying a release version and its features.
 *
 * @param props - Component props
 * @returns The version section component
 */
export default function WhatsNewVersionSection({
  release,
  isNew,
  defaultExpanded,
}: WhatsNewVersionSectionProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = useMemo(() => createStyles(theme, isNew), [theme, isNew]);

  // Sort features: 'feature' type first, then 'fix' type, then by displayOrder
  const sortedFeatures = useMemo(() => {
    return [...release.features].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'feature' ? -1 : 1;
      }
      return a.displayOrder - b.displayOrder;
    });
  }, [release.features]);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        testID="version-section-header"
        style={styles.header}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`${release.title} version ${release.version}. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'show'} features.`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          <Text style={styles.headerText}>
            v{release.version} · {release.title} · {formatReleaseDate(release.createdAt)}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {sortedFeatures.map((feature) => (
            <WhatsNewFeatureCard key={feature.id} feature={feature} />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors, isNew: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: isNew ? `${theme.primary}08` : theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: isNew ? 4 : 1,
      borderLeftColor: isNew ? theme.primary : theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    newBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    newBadgeText: {
      fontSize: 10,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });
```

**Step 4: Export from index**

Add to `components/whats-new/index.ts`:

```typescript
export { default as WhatsNewVersionSection } from './WhatsNewVersionSection';
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewVersionSection.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add components/whats-new/WhatsNewVersionSection.tsx components/whats-new/index.ts __tests__/components/whats-new/WhatsNewVersionSection.test.tsx
git commit -m "feat(whats-new): add WhatsNewVersionSection collapsible component"
```

---

## Task 6: Update WhatsNewSheet for multiple releases

**Files:**

- Modify: `components/whats-new/WhatsNewSheet.tsx`
- Modify: `__tests__/components/whats-new/WhatsNewSheet.test.tsx`

**Step 1: Update the component**

Key changes:

1. Change prop from `release: WhatsNewRelease` to `releases: WhatsNewRelease[]`
2. Add `lastSeenVersion: string | null` prop to determine which is "new"
3. Change title to "The Good Stuff"
4. Render `WhatsNewVersionSection` for each release
5. First unseen version is expanded, others collapsed

**Step 2: Update tests**

Update the test file to:

1. Pass `releases` array instead of single `release`
2. Pass `lastSeenVersion` prop
3. Test that title shows "The Good Stuff"
4. Test that version sections render correctly

**Step 3: Run tests**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewSheet.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add components/whats-new/WhatsNewSheet.tsx __tests__/components/whats-new/WhatsNewSheet.test.tsx
git commit -m "refactor(whats-new): update WhatsNewSheet for multiple releases with new title"
```

---

## Task 7: Update consuming components

**Files:**

- Modify: `app/(app)/(tabs)/index.tsx`
- Modify: `components/settings/SettingsContent.tsx`

**Step 1: Update home screen usage**

In `app/(app)/(tabs)/index.tsx`, update the `useWhatsNew` usage:

- Change from `activeRelease` to `releases`
- Pass `releases` and `profile?.last_seen_version` to `WhatsNewSheet`

**Step 2: Update settings usage**

In `components/settings/SettingsContent.tsx`:

- Update `useWhatsNew` destructuring from `activeRelease` to `releases`
- Change "What's New" label to "The Good Stuff"
- Update condition from `activeRelease` to `releases.length > 0`
- Pass `releases` and `null` for lastSeenVersion (all collapsed in settings)

**Step 3: Run affected tests**

Run: `pnpm test -- __tests__/app/index.test.tsx __tests__/components/settings/SettingsContent.dev.test.tsx`
Expected: Some failures due to changed API

**Step 4: Update tests**

Update any failing tests to use the new `releases` array API.

**Step 5: Commit**

```bash
git add app/(app)/(tabs)/index.tsx components/settings/SettingsContent.tsx
git commit -m "refactor(app): update home and settings to use releases array"
```

---

## Task 8: Update CHANGELOG and run full quality suite

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Update CHANGELOG**

Add under `[Unreleased]`:

```markdown
### Added

- Full release history in What's New with collapsible version sections
- "NEW" badge and accent styling for unseen versions
- Semver sorting utility for proper version ordering

### Changed

- Rename What's New to "The Good Stuff" with playful branding
- Display all releases instead of only active release
- Version sections show: version, title, and date (e.g., "v1.2.0 · Holiday Update · Dec 2024")

### Removed

- `is_active` column from `whats_new_releases` table (all releases now visible)
```

**Step 2: Run full quality suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
Expected: All pass

**Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): add What's New release history changes"
```

---

## Task 9: Final verification and push

**Step 1: Verify all tests pass**

Run: `pnpm test`
Expected: All tests pass, coverage meets 80% threshold

**Step 2: Verify no lint/type errors**

Run: `pnpm lint && pnpm typecheck`
Expected: No errors

**Step 3: Review git log**

Run: `git log --oneline -10`
Expected: Clean commit history with all tasks

**Step 4: Push branch**

```bash
git push -u origin feat/whats-new-release-history
```

---

## Summary of Files Changed

**New Files:**

- `supabase/migrations/20251230000000_remove_is_active_from_whats_new.sql`
- `lib/semver.ts`
- `__tests__/lib/semver.test.ts`
- `components/whats-new/WhatsNewVersionSection.tsx`
- `__tests__/components/whats-new/WhatsNewVersionSection.test.tsx`

**Modified Files:**

- `lib/whats-new.ts`
- `__tests__/lib/whats-new.test.ts`
- `components/whats-new/WhatsNewSheet.tsx`
- `__tests__/components/whats-new/WhatsNewSheet.test.tsx`
- `components/whats-new/index.ts`
- `app/(app)/(tabs)/index.tsx`
- `components/settings/SettingsContent.tsx`
- `CHANGELOG.md`
