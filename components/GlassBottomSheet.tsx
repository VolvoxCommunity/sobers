// =============================================================================
// Imports
// =============================================================================
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ViewStyle } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Constants
// =============================================================================

/**
 * Backdrop opacity for iOS - lighter for glass-like effect with blur.
 */
const IOS_BACKDROP_OPACITY = 0.3;

/**
 * Backdrop opacity for Android/other platforms - higher opacity since no blur is used.
 */
const DEFAULT_BACKDROP_OPACITY = 0.5;

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

  /**
   * Keyboard blur behavior configuration for iOS.
   *
   * - `'none'` - No action when keyboard blurs
   * - `'restore'` - Restore sheet position when keyboard dismisses (recommended for iOS)
   *
   * @default 'none'
   * @optional
   */
  keyboardBlurBehavior?: 'none' | 'restore';
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
 *       onDismiss={() => {}}
 *     >
 *       <Text>Sheet Content</Text>
 *     </GlassBottomSheet>
 *   </>
 * );
 * ```
 */
const GlassBottomSheet = forwardRef<GlassBottomSheetRef, GlassBottomSheetProps>(
  (
    {
      snapPoints,
      children,
      onDismiss,
      keyboardBehavior = 'interactive',
      keyboardBlurBehavior = 'none',
    },
    ref
  ) => {
    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const { theme } = useTheme();
    const bottomSheetRef = React.useRef<BottomSheetModal>(null);
    const [isOpen, setIsOpen] = useState(false);

    // ---------------------------------------------------------------------------
    // Escape Key Handler (Web Only)
    // ---------------------------------------------------------------------------
    useEffect(() => {
      // Only add keyboard listener on web platform
      if (Platform.OS !== 'web' || !isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          bottomSheetRef.current?.dismiss();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    React.useImperativeHandle(ref, () => ({
      present: () => {
        setIsOpen(true);
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        setIsOpen(false);
        bottomSheetRef.current?.dismiss();
      },
      snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
    }));

    /**
     * Handles the sheet dismissal - updates open state and calls onDismiss callback.
     */
    const handleDismiss = useCallback(() => {
      setIsOpen(false);
      onDismiss?.();
    }, [onDismiss]);

    // ---------------------------------------------------------------------------
    // Backdrop Component
    // ---------------------------------------------------------------------------
    /**
     * Renders platform-specific backdrop.
     * - iOS: BottomSheetBackdrop with reduced opacity for glass effect
     * - Android: Standard backdrop with opacity
     *
     * Note: We use BottomSheetBackdrop on all platforms to ensure proper
     * gesture handling. The BlurView approach was causing double-tap issues
     * because it bypassed the backdrop's touch event coordination.
     */
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          opacity={Platform.OS === 'ios' ? IOS_BACKDROP_OPACITY : DEFAULT_BACKDROP_OPACITY}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      []
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
        // Translucent glass effect for iOS using theme's glassFallback color
        return {
          backgroundColor: theme.glassFallback,
        };
      }

      // Solid background for Android (no blur for performance)
      return {
        backgroundColor: theme.surface,
        elevation: 8,
      };
    }, [theme.glassFallback, theme.surface]);

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
    // Note: Children are passed directly to BottomSheetModal without a BottomSheetView wrapper.
    // This is required for BottomSheetScrollView to work correctly - it must be a direct child
    // of the modal for proper scroll gesture handling and content height calculations.
    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        keyboardBehavior={keyboardBehavior}
        keyboardBlurBehavior={keyboardBlurBehavior}
        onDismiss={handleDismiss}
        enablePanDownToClose={true}
        enableDismissOnClose={true}
        enableDynamicSizing={false}
      >
        {children}
      </BottomSheetModal>
    );
  }
);

// Set display name for debugging
GlassBottomSheet.displayName = 'GlassBottomSheet';

// =============================================================================
// Exports
// =============================================================================
export default GlassBottomSheet;
