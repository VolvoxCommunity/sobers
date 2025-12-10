// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by GlassBottomSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<GlassBottomSheetRef>(null);
 *
 * // Present the sheet
 * sheetRef.current?.present();
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 *
 * // Snap to specific index
 * sheetRef.current?.snapToIndex(1);
 * ```
 */
export interface GlassBottomSheetRef {
  /**
   * Presents the bottom sheet modal.
   */
  present: () => void;

  /**
   * Dismisses the bottom sheet modal.
   */
  dismiss: () => void;

  /**
   * Snaps the bottom sheet to a specific snap point index.
   *
   * @param index - The snap point index to snap to (0-based)
   */
  snapToIndex: (index: number) => void;
}

/**
 * Props for the GlassBottomSheet component.
 */
export interface GlassBottomSheetProps {
  /**
   * Snap points for the bottom sheet. Can be percentages (e.g., '50%') or pixel values.
   *
   * @example
   * ```tsx
   * snapPoints={['25%', '50%', '90%']}
   * // or
   * snapPoints={[200, 400, 600]}
   * ```
   */
  snapPoints: (string | number)[];

  /**
   * Content to render inside the bottom sheet.
   */
  children: React.ReactNode;

  /**
   * Callback fired when the bottom sheet is dismissed.
   *
   * @optional
   */
  onDismiss?: () => void;

  /**
   * Keyboard behavior configuration.
   *
   * - `'interactive'` - Sheet follows keyboard (default)
   * - `'extend'` - Sheet extends to stay above keyboard
   * - `'fillParent'` - Sheet fills parent container
   *
   * @default 'interactive'
   * @optional
   */
  keyboardBehavior?: 'interactive' | 'extend' | 'fillParent';
}

// =============================================================================
// Component
// =============================================================================

/**
 * A reusable bottom sheet component with Liquid Glass styling.
 *
 * Features:
 * - Platform-specific styling:
 *   - iOS: Blur backdrop with translucent glass background
 *   - Android: Solid surface color with elevation (no blur for performance)
 * - Imperative API via ref: present(), dismiss(), snapToIndex()
 * - Theme-aware colors from ThemeContext
 * - Configurable snap points and keyboard behavior
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<GlassBottomSheetRef>(null);
 *
 * return (
 *   <>
 *     <Button title="Open Sheet" onPress={() => sheetRef.current?.present()} />
 *     <GlassBottomSheet
 *       ref={sheetRef}
 *       snapPoints={['50%', '90%']}
 *       onDismiss={() => console.log('Sheet dismissed')}
 *     >
 *       <Text>Sheet Content</Text>
 *     </GlassBottomSheet>
 *   </>
 * );
 * ```
 */
const GlassBottomSheet = forwardRef<GlassBottomSheetRef, GlassBottomSheetProps>(
  ({ snapPoints, children, onDismiss, keyboardBehavior = 'interactive' }, ref) => {
    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const { theme, isDark } = useTheme();
    const bottomSheetRef = React.useRef<BottomSheetModal>(null);

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    React.useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    // ---------------------------------------------------------------------------
    // Backdrop Component
    // ---------------------------------------------------------------------------
    /**
     * Renders platform-specific backdrop.
     * - iOS: BlurView with translucent effect
     * - Android: Standard backdrop with opacity
     */
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => {
        if (Platform.OS === 'ios') {
          return (
            <BlurView
              intensity={20}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          );
        }

        return (
          <BottomSheetBackdrop {...props} opacity={0.5} appearsOnIndex={0} disappearsOnIndex={-1} />
        );
      },
      [isDark]
    );

    // ---------------------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------------------
    /**
     * Platform-specific background style.
     * - iOS: Translucent glass with blur
     * - Android: Solid surface color with elevation
     */
    const backgroundStyle: ViewStyle = useMemo(() => {
      if (Platform.OS === 'ios') {
        // Translucent glass effect for iOS
        return {
          backgroundColor: isDark
            ? 'rgba(28, 28, 30, 0.85)' // Dark glass with 85% opacity
            : 'rgba(255, 255, 255, 0.85)', // Light glass with 85% opacity
        };
      }

      // Solid background for Android (no blur for performance)
      return {
        backgroundColor: theme.surface,
        elevation: 8,
      };
    }, [isDark, theme.surface]);

    const handleIndicatorStyle: ViewStyle = useMemo(
      () => ({
        backgroundColor: theme.textSecondary,
        opacity: 0.5,
      }),
      [theme.textSecondary]
    );

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        keyboardBehavior={keyboardBehavior}
        onDismiss={onDismiss}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.contentContainer}>{children}</BottomSheetView>
      </BottomSheetModal>
    );
  }
);

// Set display name for debugging
GlassBottomSheet.displayName = 'GlassBottomSheet';

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
});

// =============================================================================
// Exports
// =============================================================================
export default GlassBottomSheet;
