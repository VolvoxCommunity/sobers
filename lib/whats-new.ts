// lib/whats-new.ts

// =============================================================================
// Imports
// =============================================================================
import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';
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

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string | undefined;
const SUPABASE_STORAGE_URL = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/whats-new-images`
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
