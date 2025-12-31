// lib/whats-new.ts

// =============================================================================
// Imports
// =============================================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logger, LogCategory } from '@/lib/logger';
import { compareSemver } from '@/lib/semver';

// =============================================================================
// Types
// =============================================================================

/**
 * Type of feature in What's New.
 */
export type WhatsNewFeatureType = 'feature' | 'fix';

/**
 * A feature highlight within a What's New release.
 */
export interface WhatsNewFeature {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  displayOrder: number;
  type: WhatsNewFeatureType;
}

/**
 * A What's New release containing feature highlights.
 */
export interface WhatsNewRelease {
  id: string;
  version: string;
  title: string;
  createdAt: string;
  features: WhatsNewFeature[];
}

/**
 * Return type for the useWhatsNew hook.
 */
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

// =============================================================================
// Constants
// =============================================================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_STORAGE_URL = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/whats-new-images`
  : '';

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to manage What's New release data and seen state.
 *
 * Fetches all releases from Supabase sorted by version descending
 * and compares against the user's last_seen_version to determine
 * if the popup should show.
 *
 * @returns Object with release data, loading state, and actions
 *
 * @example
 * ```tsx
 * const { shouldShowWhatsNew, releases, markAsSeen } = useWhatsNew();
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

      // Fetch features for all releases
      const releaseIds = releasesData.map((r) => r.id);
      const { data: featuresData, error: featuresError } = await supabase
        .from('whats_new_features')
        .select('id, title, description, image_path, display_order, type, release_id')
        .in('release_id', releaseIds)
        .order('display_order', { ascending: true });

      if (featuresError) {
        throw featuresError;
      }

      // Group features by release_id using a Map
      const featuresByRelease = new Map<string, WhatsNewFeature[]>();
      (featuresData || []).forEach((f) => {
        const feature: WhatsNewFeature = {
          id: f.id,
          title: f.title,
          description: f.description,
          imageUrl: f.image_path ? `${SUPABASE_STORAGE_URL}/${f.image_path}` : null,
          displayOrder: f.display_order,
          type: (f.type as WhatsNewFeatureType) || 'feature',
        };
        const existing = featuresByRelease.get(f.release_id) || [];
        existing.push(feature);
        featuresByRelease.set(f.release_id, existing);
      });

      // Build releases with features and sort by semver descending
      const transformedReleases: WhatsNewRelease[] = releasesData
        .map((r) => ({
          id: r.id,
          version: r.version,
          title: r.title,
          createdAt: r.created_at,
          features: featuresByRelease.get(r.id) || [],
        }))
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

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen_version: releases[0].version })
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
  }, [profile?.id, releases, refreshProfile]);

  // Fetch on mount
  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  // Determine if we should show based on version comparison
  // Only show when: not loading, has releases, user has a profile, and latest version differs
  const shouldShowWhatsNew =
    !isLoading &&
    releases.length > 0 &&
    profile !== null &&
    profile.last_seen_version !== releases[0].version;

  return {
    shouldShowWhatsNew,
    releases,
    isLoading,
    markAsSeen,
    refetch: fetchReleases,
  };
}
