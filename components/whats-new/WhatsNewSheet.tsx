/**
 * @fileoverview WhatsNewSheet component
 *
 * A bottom sheet modal that displays release history to the user.
 * Uses GlassBottomSheet for the container and renders collapsible
 * version sections inside a scrollable content area.
 */

// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Sparkles } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import GlassBottomSheet, { type GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import WhatsNewVersionSection from './WhatsNewVersionSection';
import { compareSemver } from '@/lib/semver';
import type { WhatsNewRelease } from '@/lib/whats-new';

// =============================================================================
// Types
// =============================================================================

/**
 * Imperative methods exposed by WhatsNewSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<WhatsNewSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface WhatsNewSheetRef {
  /**
   * Presents the What's New bottom sheet modal.
   */
  present: () => void;

  /**
   * Dismisses the What's New bottom sheet modal.
   */
  dismiss: () => void;
}

/**
 * Props for the WhatsNewSheet component.
 */
interface WhatsNewSheetProps {
  /** All releases to display, sorted by version descending */
  releases: WhatsNewRelease[];
  /** User's last seen version (null if never seen any) */
  lastSeenVersion: string | null;
  /** Callback fired when the sheet is dismissed */
  onDismiss: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Snap points for the bottom sheet (90% of screen height by default) */
const SNAP_POINTS = ['90%'];

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet modal displaying What's New release history.
 *
 * Features:
 * - Displays "What's New?" title with X close button
 * - Renders scrollable list of collapsible version sections
 * - Marks new (unseen) versions with badges
 * - Automatically expands the first new version
 * - Imperative API via ref for presentation control
 *
 * @param props - Component props containing releases, lastSeenVersion, and dismiss callback
 * @param ref - Ref for imperative control (present/dismiss)
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<WhatsNewSheetRef>(null);
 *
 * return (
 *   <WhatsNewSheet
 *     ref={sheetRef}
 *     releases={allReleases}
 *     lastSeenVersion={profile?.last_seen_version ?? null}
 *     onDismiss={() => markAsSeen()}
 *   />
 * );
 *
 * // To show the sheet:
 * sheetRef.current?.present();
 * ```
 */
const WhatsNewSheet = forwardRef<WhatsNewSheetRef, WhatsNewSheetProps>(
  ({ releases, lastSeenVersion, onDismiss }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = useRef<GlassBottomSheetRef>(null);
    const styles = useMemo(() => createStyles(theme), [theme]);

    /**
     * Determines if a release version is "new" (unseen by the user).
     * A release is new if its version is greater than the last seen version.
     */
    const isReleaseNew = useCallback(
      (version: string): boolean => {
        if (!lastSeenVersion) return true; // Never seen any version = all are new
        return compareSemver(version, lastSeenVersion) > 0;
      },
      [lastSeenVersion]
    );

    // Expose present/dismiss methods via ref
    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    /**
     * Handles the close button press by dismissing the sheet.
     * The onDismiss callback will be triggered by GlassBottomSheet.
     */
    const handleClose = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    /**
     * Compute which release should be expanded by default.
     * Always expands the latest version (first in the sorted list).
     */
    const defaultExpandedReleaseId = useMemo(() => {
      return releases.length > 0 ? releases[0].id : null;
    }, [releases]);

    /**
     * Count how many releases are new (unseen by the user).
     */
    const newReleasesCount = useMemo(() => {
      return releases.filter((r) => isReleaseNew(r.version)).length;
    }, [releases, isReleaseNew]);

    /**
     * Generate dynamic subtitle based on user's viewing state.
     */
    const subtitle = useMemo(() => {
      if (!lastSeenVersion) {
        return "See what we've been building";
      }
      if (newReleasesCount > 0) {
        const plural = newReleasesCount === 1 ? 'update' : 'updates';
        return `${newReleasesCount} ${plural} since you last checked`;
      }
      return "You're all caught up!";
    }, [lastSeenVersion, newReleasesCount]);

    return (
      <GlassBottomSheet ref={bottomSheetRef} snapPoints={SNAP_POINTS} onDismiss={onDismiss}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Sparkles size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>{"What's New?"}</Text>
          <TouchableOpacity
            testID="whats-new-close-button"
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close What's New"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.releases}>
            {releases.map((release) => (
              <WhatsNewVersionSection
                key={release.id}
                release={release}
                isNew={isReleaseNew(release.version)}
                defaultExpanded={release.id === defaultExpandedReleaseId}
              />
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 24,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
      lineHeight: 20,
    },
    releases: {
      marginBottom: 24,
    },
  });

export default WhatsNewSheet;
