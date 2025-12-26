/**
 * @fileoverview WhatsNewSheet component
 *
 * A bottom sheet modal that displays new features and updates to the user.
 * Uses GlassBottomSheet for the container and renders feature cards inside
 * a scrollable content area.
 */

// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetScrollView, BottomSheetFooter, BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import GlassBottomSheet, { type GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import WhatsNewFeatureCard from './WhatsNewFeatureCard';
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
  /** The release data to display, including version, title, and features */
  release: WhatsNewRelease;
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
 * Bottom sheet modal displaying What's New release information.
 *
 * Features:
 * - Displays release title and version number
 * - Renders scrollable list of feature cards
 * - "Got it!" button to dismiss the sheet
 * - Imperative API via ref for presentation control
 *
 * @param props - Component props containing release data and dismiss callback
 * @param ref - Ref for imperative control (present/dismiss)
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<WhatsNewSheetRef>(null);
 *
 * return (
 *   <WhatsNewSheet
 *     ref={sheetRef}
 *     release={activeRelease}
 *     onDismiss={() => markAsSeen()}
 *   />
 * );
 *
 * // To show the sheet:
 * sheetRef.current?.present();
 * ```
 */
const WhatsNewSheet = forwardRef<WhatsNewSheetRef, WhatsNewSheetProps>(
  ({ release, onDismiss }, ref) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<GlassBottomSheetRef>(null);
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Sort features: 'feature' type first, then 'fix' type
    const sortedFeatures = useMemo(() => {
      return [...release.features].sort((a, b) => {
        if (a.type === b.type) return a.displayOrder - b.displayOrder;
        return a.type === 'feature' ? -1 : 1;
      });
    }, [release.features]);

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
     * even when scrolling through many features.
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
            {sortedFeatures.map((feature) => (
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
    version: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    features: {
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
