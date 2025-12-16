// =============================================================================
// Imports
// =============================================================================
import React, { useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { GlassView as ExpoGlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the GlassView component.
 */
export interface GlassViewProps {
  /** Content to render inside the glass container */
  children: React.ReactNode;

  /** Glass effect intensity: 'regular' (default) or 'clear' */
  effectStyle?: 'regular' | 'clear';

  /** Override the theme's default glass tint color */
  tintColor?: string;

  /** Additional styles applied to the container */
  style?: StyleProp<ViewStyle>;

  /** Test ID for testing */
  testID?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * A themed glass effect container that renders iOS liquid glass effects
 * with graceful fallback for unsupported platforms.
 *
 * @remarks
 * - On iOS 26+: Uses native UIVisualEffectView for liquid glass blur
 * - On other platforms: Renders semi-transparent styled View as fallback
 * - Always interactive for consistent touch feedback
 *
 * @example
 * ```tsx
 * // Default usage (regular effect, theme tint)
 * <GlassView style={styles.card}>
 *   <Text>Content</Text>
 * </GlassView>
 *
 * // Clear effect for headers
 * <GlassView effectStyle="clear">
 *   <Text>Header</Text>
 * </GlassView>
 * ```
 */
export function GlassView({
  children,
  effectStyle = 'regular',
  tintColor,
  style,
  testID,
}: GlassViewProps) {
  const { theme } = useTheme();

  // Check glass availability during render for better testability
  const supportsGlass = isLiquidGlassAvailable();

  const fallbackStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: theme.glassFallback,
          borderWidth: 1,
          borderColor: theme.glassBorder,
          // Subtle shadow for depth (replaces blur's natural depth)
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4, // Android shadow
        },
      }),
    [theme.glassFallback, theme.glassBorder, theme.shadow]
  );

  if (supportsGlass) {
    return (
      <ExpoGlassView
        glassEffectStyle={effectStyle}
        tintColor={tintColor ?? theme.glassTint}
        isInteractive={true}
        style={style}
        testID={testID}
      >
        {children}
      </ExpoGlassView>
    );
  }

  // Fallback for unsupported platforms
  return (
    <View style={[fallbackStyles.container, style]} testID={testID}>
      {children}
    </View>
  );
}
