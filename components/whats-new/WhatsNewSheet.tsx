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
import {
  BottomSheetScrollView,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
 * - Displays "The Good Stuff" title
 * - Renders scrollable list of collapsible version sections
 * - Marks new (unseen) versions with badges
 * - Automatically expands the first new version
 * - "Got it!" button to dismiss the sheet
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
    const insets = useSafeAreaInsets();
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
     * Handles the "Got it!" button press by dismissing the sheet.
     * The onDismiss callback will be triggered by GlassBottomSheet.
     */
    const handleGotIt = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    /**
     * Renders the footer with the dismiss button.
     * Using BottomSheetFooter ensures the button is always visible at the bottom,
     * even when scrolling through many releases.
     */
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View style={styles.footer}>
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
        </BottomSheetFooter>
      ),
      [insets.bottom, styles, handleGotIt]
    );

    // Track whether we've found the first new release for default expansion
    let foundFirstNew = false;

    return (
      <GlassBottomSheet
        ref={bottomSheetRef}
        snapPoints={SNAP_POINTS}
        onDismiss={onDismiss}
        footerComponent={renderFooter}
      >
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>The Good Stuff</Text>
          </View>

          <View style={styles.releases}>
            {releases.map((release) => {
              const isNew = isReleaseNew(release.version);
              const shouldExpand = isNew && !foundFirstNew;
              if (shouldExpand) foundFirstNew = true;

              return (
                <WhatsNewVersionSection
                  key={release.id}
                  release={release}
                  isNew={isNew}
                  defaultExpanded={shouldExpand}
                />
              );
            })}
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
      // Extra padding at bottom to account for the fixed footer
      paddingBottom: 100,
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
    releases: {
      marginBottom: 24,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: theme.background,
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

export default WhatsNewSheet;
