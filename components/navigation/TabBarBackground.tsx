// =============================================================================
// Imports
// =============================================================================
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Component
// =============================================================================

/**
 * Custom tab bar background with Liquid Glass blur effect.
 *
 * Uses expo-blur's BlurView on all platforms:
 * - iOS: Native UIVisualEffectView for real-time blur
 * - Android: Semi-transparent tinted overlay via expo-blur's built-in fallback
 *   (blurMethod defaults to 'none', which applies a tinted background color
 *   derived from the tint style and intensity)
 *
 * @returns Tab bar background element with cross-platform blur styling
 *
 * @example
 * ```tsx
 * <Tabs screenOptions={{ tabBarBackground: () => <TabBarBackground /> }}>
 * ```
 */
export default function TabBarBackground(): React.ReactElement {
  const { isDark } = useTheme();

  return (
    <BlurView
      intensity={80}
      tint={isDark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
      testID="tab-bar-blur-view"
    />
  );
}
