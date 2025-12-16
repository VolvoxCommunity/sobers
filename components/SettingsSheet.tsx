// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, X } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { SettingsContent } from '@/components/settings';

// =============================================================================
// Types
// =============================================================================

/**
 * Imperative methods exposed by SettingsSheet via ref.
 */
export interface SettingsSheetRef {
  /**
   * Presents the settings sheet.
   */
  present: () => void;

  /**
   * Dismisses the settings sheet.
   */
  dismiss: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet for managing user settings with Liquid Glass styling.
 *
 * This component wraps the shared SettingsContent in a GlassBottomSheet
 * with appropriate header and scroll behavior.
 *
 * @example
 * ```tsx
 * const settingsSheetRef = useRef<SettingsSheetRef>(null);
 *
 * // Open the sheet
 * settingsSheetRef.current?.present();
 *
 * <SettingsSheet ref={settingsSheetRef} />
 * ```
 */
const SettingsSheet = forwardRef<SettingsSheetRef>((props, ref) => {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const { theme } = useTheme();
  const sheetRef = useRef<GlassBottomSheetRef>(null);

  // ---------------------------------------------------------------------------
  // Imperative API
  // ---------------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  /**
   * Handler for close button press and dismiss callback for SettingsContent.
   * Triggers the sheet dismiss animation.
   */
  const handleDismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <GlassBottomSheet ref={sheetRef} snapPoints={['90%']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Settings size={24} color={theme.primary} />
        </View>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          testID="close-icon-button"
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <X size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <SettingsContent onDismiss={handleDismiss} />
        {/* Bottom padding to ensure content can scroll fully into view */}
        <View style={styles.bottomPadding} />
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
});

// Set display name for debugging
SettingsSheet.displayName = 'SettingsSheet';

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the Settings sheet based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
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
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      padding: 20,
      // flexGrow ensures content can expand and scroll properly with dynamic content
      flexGrow: 1,
    },
    bottomPadding: {
      // Small padding for visual breathing room at the bottom of the sheet
      height: 20,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default SettingsSheet;
