// =============================================================================
// Imports
// =============================================================================
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarScrollPadding } from '@/constants/layout';

// =============================================================================
// Hook
// =============================================================================

/**
 * Custom hook that calculates the bottom padding needed for scrollable content
 * above the tab bar, accounting for platform-specific tab bar heights and safe areas.
 *
 * This hook encapsulates the repeated pattern of:
 * 1. Getting safe area insets
 * 2. Determining platform-specific extra padding
 * 3. Calculating the total scroll padding
 *
 * @param extraPadding - Optional custom extra padding to override platform defaults
 * @returns The calculated bottom padding value in points
 *
 * @example
 * ```tsx
 * function MyScreen() {
 *   const tabBarPadding = useTabBarPadding();
 *
 *   return (
 *     <ScrollView contentContainerStyle={{ paddingBottom: tabBarPadding }}>
 *       {content}
 *     </ScrollView>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom extra padding
 * const tabBarPadding = useTabBarPadding(32);
 * ```
 *
 * @example
 * ```tsx
 * // Using with StyleSheet.create via useMemo
 * function MyScreen() {
 *   const tabBarPadding = useTabBarPadding();
 *   const insets = useSafeAreaInsets();
 *
 *   const styles = useMemo(() => StyleSheet.create({
 *     bottomPadding: { height: tabBarPadding },
 *   }), [tabBarPadding]);
 *
 *   return <View style={styles.bottomPadding} />;
 * }
 * ```
 */
export function useTabBarPadding(extraPadding?: number): number {
  const insets = useSafeAreaInsets();

  const padding = useMemo(() => {
    // If extraPadding is provided, pass it; otherwise let getTabBarScrollPadding use its default
    return extraPadding !== undefined
      ? getTabBarScrollPadding(insets.bottom, extraPadding)
      : getTabBarScrollPadding(insets.bottom);
  }, [insets.bottom, extraPadding]);

  return padding;
}
