# What's New Popup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a "What's New" bottom sheet that shows feature highlights with optional screenshots when users have unseen release content.

**Architecture:** Supabase tables store release content with RLS for public read. A `useWhatsNew` hook fetches active release and compares against `profiles.last_seen_version`. The WhatsNewSheet component uses GlassBottomSheet with scrollable feature cards. Home screen auto-shows after 2.5s delay; Settings provides manual access.

**Tech Stack:** React Native, Expo, Supabase (Postgres + Storage), TypeScript, GlassBottomSheet, BottomSheetScrollView

---

## Task 1: Database Migration - Create Tables and Update Profiles

**Files:**

- Create: `supabase/migrations/20251225000000_add_whats_new_tables.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Add What's New feature tables
-- Description: Creates tables for storing release announcements and feature highlights

-- Create whats_new_releases table
create table if not exists public.whats_new_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create whats_new_features table
create table if not exists public.whats_new_features (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references public.whats_new_releases(id) on delete cascade,
  title text not null,
  description text not null,
  image_path text,
  display_order int not null default 0,
  created_at timestamptz default now()
);

-- Add last_seen_version to profiles
alter table public.profiles
  add column if not exists last_seen_version text;

-- Create indexes for performance
create index if not exists idx_whats_new_releases_active on public.whats_new_releases(is_active) where is_active = true;
create index if not exists idx_whats_new_features_release on public.whats_new_features(release_id);

-- RLS Policies: Public read access for releases and features
alter table public.whats_new_releases enable row level security;
alter table public.whats_new_features enable row level security;

create policy "Anyone can read active releases"
  on public.whats_new_releases for select
  using (true);

create policy "Anyone can read features"
  on public.whats_new_features for select
  using (true);

-- Trigger to update updated_at timestamp
create or replace function update_whats_new_releases_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger whats_new_releases_updated_at
  before update on public.whats_new_releases
  for each row
  execute function update_whats_new_releases_updated_at();

-- Create storage bucket for images (run via Supabase dashboard or CLI)
-- Note: Storage bucket 'whats-new-images' should be created with public read access
```

**Step 2: Apply migration locally**

Run: `pnpm exec supabase db push` or apply via Supabase dashboard

**Step 3: Commit**

```bash
git add supabase/migrations/20251225000000_add_whats_new_tables.sql
git commit -m "feat(supabase): add What's New tables and profile column"
```

---

## Task 2: Add TypeScript Types

**Files:**

- Modify: `types/database.ts` (add to existing types)
- Create: `lib/whats-new.ts`

**Step 1: Read current database types**

Check existing type patterns in `types/database.ts`.

**Step 2: Create whats-new types and hook file**

````typescript
// lib/whats-new.ts

// =============================================================================
// Imports
// =============================================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logger, LogCategory } from '@/lib/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * A feature highlight within a What's New release.
 */
export interface WhatsNewFeature {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  displayOrder: number;
}

/**
 * A What's New release containing feature highlights.
 */
export interface WhatsNewRelease {
  id: string;
  version: string;
  title: string;
  features: WhatsNewFeature[];
}

/**
 * Return type for the useWhatsNew hook.
 */
export interface UseWhatsNewResult {
  /** Whether there's unseen content to show */
  shouldShowWhatsNew: boolean;
  /** The active release data, if any */
  activeRelease: WhatsNewRelease | null;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Mark the current release as seen */
  markAsSeen: () => Promise<void>;
  /** Refetch release data */
  refetch: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const SUPABASE_STORAGE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/whats-new-images`
  : '';

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to manage What's New release data and seen state.
 *
 * Fetches the active release from Supabase and compares against
 * the user's last_seen_version to determine if the popup should show.
 *
 * @returns Object with release data, loading state, and actions
 *
 * @example
 * ```tsx
 * const { shouldShowWhatsNew, activeRelease, markAsSeen } = useWhatsNew();
 *
 * useEffect(() => {
 *   if (shouldShowWhatsNew) {
 *     sheetRef.current?.present();
 *   }
 * }, [shouldShowWhatsNew]);
 * ```
 */
export function useWhatsNew(): UseWhatsNewResult {
  const { profile, refreshProfile } = useAuth();
  const [activeRelease, setActiveRelease] = useState<WhatsNewRelease | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetches the active release and its features from Supabase.
   */
  const fetchActiveRelease = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch active release
      const { data: releaseData, error: releaseError } = await supabase
        .from('whats_new_releases')
        .select('id, version, title')
        .eq('is_active', true)
        .single();

      if (releaseError) {
        // No active release is not an error condition
        if (releaseError.code === 'PGRST116') {
          setActiveRelease(null);
          return;
        }
        throw releaseError;
      }

      if (!releaseData) {
        setActiveRelease(null);
        return;
      }

      // Fetch features for this release
      const { data: featuresData, error: featuresError } = await supabase
        .from('whats_new_features')
        .select('id, title, description, image_path, display_order')
        .eq('release_id', releaseData.id)
        .order('display_order', { ascending: true });

      if (featuresError) {
        throw featuresError;
      }

      // Transform features with full image URLs
      const features: WhatsNewFeature[] = (featuresData || []).map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        imageUrl: f.image_path ? `${SUPABASE_STORAGE_URL}/${f.image_path}` : null,
        displayOrder: f.display_order,
      }));

      setActiveRelease({
        id: releaseData.id,
        version: releaseData.version,
        title: releaseData.title,
        features,
      });
    } catch (error) {
      logger.error("Failed to fetch What's New release", error as Error, {
        category: LogCategory.DATABASE,
      });
      setActiveRelease(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Marks the current release as seen by updating the profile.
   */
  const markAsSeen = useCallback(async () => {
    if (!profile?.id || !activeRelease) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_version: activeRelease.version })
        .eq('id', profile.id);

      if (error) throw error;

      // Refresh profile to update local state
      await refreshProfile();
    } catch (error) {
      logger.error("Failed to mark What's New as seen", error as Error, {
        category: LogCategory.DATABASE,
      });
      // Don't throw - this is a non-critical operation
    }
  }, [profile?.id, activeRelease, refreshProfile]);

  // Fetch on mount
  useEffect(() => {
    fetchActiveRelease();
  }, [fetchActiveRelease]);

  // Determine if we should show based on version comparison
  const shouldShowWhatsNew =
    !isLoading && activeRelease !== null && profile?.last_seen_version !== activeRelease.version;

  return {
    shouldShowWhatsNew,
    activeRelease,
    isLoading,
    markAsSeen,
    refetch: fetchActiveRelease,
  };
}
````

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add lib/whats-new.ts
git commit -m "feat(whats-new): add useWhatsNew hook and types"
```

---

## Task 3: Write Tests for useWhatsNew Hook

**Files:**

- Create: `__tests__/lib/whats-new.test.ts`

**Step 1: Write the test file**

```typescript
// __tests__/lib/whats-new.test.ts

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useWhatsNew } from '@/lib/whats-new';

// Mock Supabase
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseOrder = jest.fn();
const mockSupabaseEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'whats_new_releases') {
        return {
          select: mockSupabaseSelect.mockReturnValue({
            eq: mockSupabaseEq.mockReturnValue({
              single: mockSupabaseSingle,
            }),
          }),
        };
      }
      if (table === 'whats_new_features') {
        return {
          select: mockSupabaseSelect.mockReturnValue({
            eq: mockSupabaseEq.mockReturnValue({
              order: mockSupabaseOrder,
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: mockSupabaseUpdate.mockReturnValue({
            eq: mockSupabaseEq.mockReturnValue({ error: null }),
          }),
        };
      }
      return {};
    }),
  },
}));

// Mock AuthContext
const mockRefreshProfile = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-123', last_seen_version: null },
    refreshProfile: mockRefreshProfile,
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    DATABASE: 'DATABASE',
  },
}));

describe('useWhatsNew', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no active release exists', () => {
    it('returns shouldShowWhatsNew as false', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
    });
  });

  describe('when active release exists', () => {
    const mockRelease = {
      id: 'release-123',
      version: '1.2.0',
      title: "What's New in Sobers",
    };

    const mockFeatures = [
      {
        id: 'feature-1',
        title: 'Money Saved Dashboard',
        description: 'Track your savings',
        image_path: 'v1.2.0/savings.png',
        display_order: 0,
      },
      {
        id: 'feature-2',
        title: 'Dark Mode',
        description: 'Easy on the eyes',
        image_path: null,
        display_order: 1,
      },
    ];

    beforeEach(() => {
      mockSupabaseSingle.mockResolvedValue({ data: mockRelease, error: null });
      mockSupabaseOrder.mockResolvedValue({ data: mockFeatures, error: null });
    });

    it('returns shouldShowWhatsNew as true when user has not seen this version', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(true);
      expect(result.current.activeRelease).not.toBeNull();
      expect(result.current.activeRelease?.version).toBe('1.2.0');
      expect(result.current.activeRelease?.features).toHaveLength(2);
    });

    it('transforms features with correct image URLs', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const features = result.current.activeRelease?.features;
      expect(features?.[0].imageUrl).toContain('v1.2.0/savings.png');
      expect(features?.[1].imageUrl).toBeNull();
    });

    it('markAsSeen updates profile and refreshes', async () => {
      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsSeen();
      });

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'UNKNOWN', message: 'Database error' },
      });

      const { result } = renderHook(() => useWhatsNew());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowWhatsNew).toBe(false);
      expect(result.current.activeRelease).toBeNull();
    });
  });
});
```

**Step 2: Run tests**

Run: `pnpm test -- __tests__/lib/whats-new.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/lib/whats-new.test.ts
git commit -m "test(whats-new): add useWhatsNew hook tests"
```

---

## Task 4: Create WhatsNewFeatureCard Component

**Files:**

- Create: `components/whats-new/WhatsNewFeatureCard.tsx`
- Create: `__tests__/components/whats-new/WhatsNewFeatureCard.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/whats-new/WhatsNewFeatureCard.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WhatsNewFeatureCard from '@/components/whats-new/WhatsNewFeatureCard';

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      card: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      fontRegular: 'System',
    },
  }),
}));

describe('WhatsNewFeatureCard', () => {
  const mockFeature = {
    id: 'feature-1',
    title: 'Money Saved Dashboard',
    description: 'Track how much you\'ve saved since sobriety',
    imageUrl: 'https://example.com/image.png',
    displayOrder: 0,
  };

  it('renders feature title and description', () => {
    render(<WhatsNewFeatureCard feature={mockFeature} />);

    expect(screen.getByText('Money Saved Dashboard')).toBeTruthy();
    expect(screen.getByText('Track how much you\'ve saved since sobriety')).toBeTruthy();
  });

  it('renders without image when imageUrl is null', () => {
    const featureWithoutImage = { ...mockFeature, imageUrl: null };
    render(<WhatsNewFeatureCard feature={featureWithoutImage} />);

    expect(screen.getByText('Money Saved Dashboard')).toBeTruthy();
    // Should not crash
  });

  it('shows skeleton while image loads', () => {
    render(<WhatsNewFeatureCard feature={mockFeature} />);

    // Image container should exist
    expect(screen.getByTestId('feature-card-image-container')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewFeatureCard.test.tsx`
Expected: FAIL (component doesn't exist yet)

**Step 3: Write the component**

````typescript
// components/whats-new/WhatsNewFeatureCard.tsx

// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { WhatsNewFeature } from '@/lib/whats-new';

// =============================================================================
// Types
// =============================================================================

interface WhatsNewFeatureCardProps {
  /** The feature to display */
  feature: WhatsNewFeature;
}

// =============================================================================
// Constants
// =============================================================================

const IMAGE_HEIGHT = 180;
const SKELETON_BACKGROUND = 'rgba(128, 128, 128, 0.1)';

// =============================================================================
// Component
// =============================================================================

/**
 * A card displaying a single What's New feature with optional image.
 *
 * Shows a skeleton loader while the image loads, then reveals the image.
 * If no image is provided, only the title and description are shown.
 *
 * @param feature - The feature data to display
 *
 * @example
 * ```tsx
 * <WhatsNewFeatureCard
 *   feature={{
 *     id: '1',
 *     title: 'Money Saved',
 *     description: 'Track your savings',
 *     imageUrl: 'https://example.com/image.png',
 *     displayOrder: 0,
 *   }}
 * />
 * ```
 */
export default function WhatsNewFeatureCard({ feature }: WhatsNewFeatureCardProps) {
  const { theme } = useTheme();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {feature.imageUrl && (
        <View testID="feature-card-image-container" style={styles.imageContainer}>
          {isImageLoading && (
            <View style={styles.skeleton}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          )}
          <Image
            source={{ uri: feature.imageUrl }}
            style={[styles.image, isImageLoading && styles.imageHidden]}
            contentFit="cover"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{feature.title}</Text>
        <Text style={styles.description}>{feature.description}</Text>
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    imageContainer: {
      height: IMAGE_HEIGHT,
      backgroundColor: SKELETON_BACKGROUND,
    },
    skeleton: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: SKELETON_BACKGROUND,
    },
    image: {
      width: '100%',
      height: IMAGE_HEIGHT,
    },
    imageHidden: {
      opacity: 0,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });
````

**Step 4: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewFeatureCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/whats-new/WhatsNewFeatureCard.tsx __tests__/components/whats-new/WhatsNewFeatureCard.test.tsx
git commit -m "feat(whats-new): add WhatsNewFeatureCard component"
```

---

## Task 5: Create WhatsNewSheet Component

**Files:**

- Create: `components/whats-new/WhatsNewSheet.tsx`
- Create: `__tests__/components/whats-new/WhatsNewSheet.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/whats-new/WhatsNewSheet.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import WhatsNewSheet, { WhatsNewSheetRef } from '@/components/whats-new/WhatsNewSheet';
import type { WhatsNewRelease } from '@/lib/whats-new';

// Mock GlassBottomSheet
jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef(
      ({ children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void }, ref: React.Ref<unknown>) => {
        const [isVisible, setIsVisible] = React.useState(false);

        React.useImperativeHandle(ref, () => ({
          present: () => setIsVisible(true),
          dismiss: () => {
            setIsVisible(false);
            onDismiss?.();
          },
          snapToIndex: jest.fn(),
        }));

        if (!isVisible) return null;
        return <View testID="glass-bottom-sheet">{children}</View>;
      }
    ),
  };
});

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000000',
      textSecondary: '#666666',
      primary: '#007AFF',
      white: '#ffffff',
      card: '#ffffff',
      border: '#e0e0e0',
      fontRegular: 'System',
    },
  }),
}));

// Mock BottomSheetScrollView
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => children,
  BottomSheetFooter: ({ children }: { children: React.ReactNode }) => children,
}));

describe('WhatsNewSheet', () => {
  const mockRelease: WhatsNewRelease = {
    id: 'release-1',
    version: '1.2.0',
    title: 'What\'s New in Sobers',
    features: [
      {
        id: 'feature-1',
        title: 'Money Saved Dashboard',
        description: 'Track your savings',
        imageUrl: null,
        displayOrder: 0,
      },
    ],
  };

  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders release title and version', () => {
    const ref = React.createRef<WhatsNewSheetRef>();
    render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);

    // Present the sheet
    ref.current?.present();

    expect(screen.getByText('What\'s New in Sobers')).toBeTruthy();
    expect(screen.getByText('Version 1.2.0')).toBeTruthy();
  });

  it('renders all features', () => {
    const ref = React.createRef<WhatsNewSheetRef>();
    const releaseWithMultipleFeatures = {
      ...mockRelease,
      features: [
        { id: '1', title: 'Feature 1', description: 'Desc 1', imageUrl: null, displayOrder: 0 },
        { id: '2', title: 'Feature 2', description: 'Desc 2', imageUrl: null, displayOrder: 1 },
      ],
    };

    render(<WhatsNewSheet ref={ref} release={releaseWithMultipleFeatures} onDismiss={mockOnDismiss} />);
    ref.current?.present();

    expect(screen.getByText('Feature 1')).toBeTruthy();
    expect(screen.getByText('Feature 2')).toBeTruthy();
  });

  it('calls onDismiss when Got it button is pressed', () => {
    const ref = React.createRef<WhatsNewSheetRef>();
    render(<WhatsNewSheet ref={ref} release={mockRelease} onDismiss={mockOnDismiss} />);
    ref.current?.present();

    const button = screen.getByText('Got it!');
    fireEvent.press(button);

    expect(mockOnDismiss).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewSheet.test.tsx`
Expected: FAIL

**Step 3: Write the component**

````typescript
// components/whats-new/WhatsNewSheet.tsx

// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetScrollView, BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import WhatsNewFeatureCard from './WhatsNewFeatureCard';
import type { WhatsNewRelease } from '@/lib/whats-new';

// =============================================================================
// Types
// =============================================================================

/**
 * Imperative methods exposed by WhatsNewSheet via ref.
 */
export interface WhatsNewSheetRef {
  /** Presents the sheet */
  present: () => void;
  /** Dismisses the sheet */
  dismiss: () => void;
}

interface WhatsNewSheetProps {
  /** The release data to display */
  release: WhatsNewRelease;
  /** Callback when sheet is dismissed (after Got it! or swipe) */
  onDismiss: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const SNAP_POINTS = ['70%', '90%'];

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet displaying What's New release content.
 *
 * Shows the release title, version, and scrollable list of features.
 * A "Got it!" button in the footer dismisses the sheet and triggers onDismiss.
 *
 * @param release - The release data to display
 * @param onDismiss - Callback when sheet is dismissed
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<WhatsNewSheetRef>(null);
 *
 * <WhatsNewSheet
 *   ref={sheetRef}
 *   release={activeRelease}
 *   onDismiss={handleMarkAsSeen}
 * />
 *
 * // Present the sheet
 * sheetRef.current?.present();
 * ```
 */
const WhatsNewSheet = forwardRef<WhatsNewSheetRef, WhatsNewSheetProps>(
  ({ release, onDismiss }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = useRef<GlassBottomSheetRef>(null);
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    /**
     * Handles the Got it! button press.
     * Dismisses the sheet which triggers onDismiss via the sheet's onDismiss prop.
     */
    const handleGotIt = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    /**
     * Renders the footer with the Got it! button.
     */
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <View {...props} style={styles.footer}>
          <TouchableOpacity
            testID="whats-new-got-it-button"
            style={styles.button}
            onPress={handleGotIt}
            accessibilityRole="button"
            accessibilityLabel="Dismiss What's New"
          >
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      ),
      [styles, handleGotIt]
    );

    return (
      <GlassBottomSheet
        ref={bottomSheetRef}
        snapPoints={SNAP_POINTS}
        onDismiss={onDismiss}
        footerComponent={renderFooter}
      >
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{release.title}</Text>
            <Text style={styles.version}>Version {release.version}</Text>
          </View>

          <View style={styles.features}>
            {release.features.map((feature) => (
              <WhatsNewFeatureCard key={feature.id} feature={feature} />
            ))}
          </View>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

WhatsNewSheet.displayName = 'WhatsNewSheet';

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 100, // Space for footer
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
      paddingTop: 8,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    version: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    features: {
      gap: 0, // Cards have their own marginBottom
    },
    footer: {
      padding: 20,
      paddingBottom: 32,
      backgroundColor: 'transparent',
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default WhatsNewSheet;
export type { WhatsNewSheetProps };
````

**Step 4: Create index file for exports**

```typescript
// components/whats-new/index.ts
export { default as WhatsNewSheet, type WhatsNewSheetRef } from './WhatsNewSheet';
export { default as WhatsNewFeatureCard } from './WhatsNewFeatureCard';
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- __tests__/components/whats-new/WhatsNewSheet.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add components/whats-new/
git add __tests__/components/whats-new/WhatsNewSheet.test.tsx
git commit -m "feat(whats-new): add WhatsNewSheet component"
```

---

## Task 6: Integrate into Home Screen

**Files:**

- Modify: `app/(app)/(tabs)/index.tsx`

**Step 1: Add imports and hook usage**

Add to imports:

```typescript
import { useWhatsNew } from '@/lib/whats-new';
import { WhatsNewSheet, WhatsNewSheetRef } from '@/components/whats-new';
```

**Step 2: Add state and refs**

Add after existing refs:

```typescript
const whatsNewRef = useRef<WhatsNewSheetRef>(null);
const { shouldShowWhatsNew, activeRelease, markAsSeen } = useWhatsNew();
const hasShownWhatsNewThisSession = useRef(false);
```

**Step 3: Add effect to auto-show**

Add after existing useEffects:

```typescript
// Auto-show What's New after delay if there's unseen content
useEffect(() => {
  if (shouldShowWhatsNew && !hasShownWhatsNewThisSession.current) {
    hasShownWhatsNewThisSession.current = true;
    const timer = setTimeout(() => {
      whatsNewRef.current?.present();
    }, 2500);
    return () => clearTimeout(timer);
  }
}, [shouldShowWhatsNew]);
```

**Step 4: Add dismiss handler**

```typescript
const handleWhatsNewDismiss = useCallback(async () => {
  await markAsSeen();
}, [markAsSeen]);
```

**Step 5: Add component to render**

Add before closing `</ScrollView>`:

```typescript
{activeRelease && (
  <WhatsNewSheet
    ref={whatsNewRef}
    release={activeRelease}
    onDismiss={handleWhatsNewDismiss}
  />
)}
```

**Step 6: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS

**Step 7: Commit**

```bash
git add app/(app)/(tabs)/index.tsx
git commit -m "feat(home): integrate What's New popup on home screen"
```

---

## Task 7: Add What's New Row to Settings

**Files:**

- Modify: `components/settings/SettingsContent.tsx`

**Step 1: Add imports**

```typescript
import { Sparkles } from 'lucide-react-native';
import { useWhatsNew } from '@/lib/whats-new';
import { WhatsNewSheet, WhatsNewSheetRef } from '@/components/whats-new';
```

**Step 2: Add hook and ref in component**

After existing hooks:

```typescript
const whatsNewRef = useRef<WhatsNewSheetRef>(null);
const { activeRelease } = useWhatsNew();
```

**Step 3: Add What's New row in About section**

Add after Source Code row (before closing `</View>` of About card):

```typescript
<View style={styles.separator} />
<Pressable
  testID="settings-whats-new-row"
  style={styles.menuItem}
  onPress={() => whatsNewRef.current?.present()}
  disabled={!activeRelease}
  accessibilityRole="button"
  accessibilityLabel="View What's New"
>
  <View style={styles.menuItemLeft}>
    <Sparkles size={20} color={theme.textSecondary} />
    <Text style={styles.menuItemText}>What's New</Text>
  </View>
  <ChevronLeft
    size={20}
    color={theme.textTertiary}
    style={{ transform: [{ rotate: '180deg' }] }}
  />
</Pressable>
```

**Step 4: Add sheet component before Modal**

Add before `{/* Edit Display Name Modal */}`:

```typescript
{/* What's New Sheet */}
{activeRelease && (
  <WhatsNewSheet
    ref={whatsNewRef}
    release={activeRelease}
    onDismiss={() => {}}
  />
)}
```

**Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS

**Step 6: Commit**

```bash
git add components/settings/SettingsContent.tsx
git commit -m "feat(settings): add What's New row in About section"
```

---

## Task 8: Update Database Types

**Files:**

- Modify: `types/database.ts`

**Step 1: Add Profile type update**

Find the Profile interface and add:

```typescript
last_seen_version?: string | null;
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add types/database.ts
git commit -m "feat(types): add last_seen_version to Profile type"
```

---

## Task 9: Update CHANGELOG and Run Quality Checks

**Files:**

- Modify: `CHANGELOG.md`

**Step 1: Add changelog entries**

Add under `## [Unreleased]` > `### Added`:

```markdown
- Add What's New popup showing feature highlights when users have unseen release content
- Add `whats_new_releases` and `whats_new_features` Supabase tables for release content
- Add `last_seen_version` field to profiles for tracking seen releases
- Add WhatsNewSheet and WhatsNewFeatureCard components with skeleton image loading
- Add useWhatsNew hook for fetching and managing release state
- Add "What's New" row in Settings for manual access to release content
```

**Step 2: Run full quality suite**

Run: `pnpm format && pnpm lint && pnpm typecheck && pnpm build:web && pnpm test`
Expected: All pass

**Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document What's New popup feature"
```

---

## Task 10: Final Verification and Push

**Step 1: Verify all commits**

Run: `git log --oneline -10`
Expected: 9 commits for this feature

**Step 2: Run full test suite one more time**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Push to remote**

Run: `git push -u origin feat/whats-new-popup`

---

## Summary

This implementation creates:

1. **Database schema** - Two new tables and a profile column
2. **useWhatsNew hook** - Fetches release, compares versions, handles marking as seen
3. **WhatsNewFeatureCard** - Displays feature with skeleton-loaded image
4. **WhatsNewSheet** - Bottom sheet with scrollable features and dismiss button
5. **Home screen integration** - Auto-shows after 2.5s delay for unseen content
6. **Settings integration** - Manual access via "What's New" row

All components follow existing patterns (GlassBottomSheet, theme context, imperative refs) and include comprehensive tests.
