// =============================================================================
// Imports
// =============================================================================
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Component
// =============================================================================

/**
 * Custom tab bar background with Liquid Glass blur effect.
 *
 * On iOS, renders a BlurView for native blur effect.
 * On Android, renders a semi-transparent solid background (blur not supported).
 *
 * @returns Tab bar background element with platform-appropriate styling
 *
 * @example
 * ```tsx
 * <Tabs screenOptions={{ tabBarBackground: () => <TabBarBackground /> }}>
 * ```
 */
export default function TabBarBackground(): React.ReactElement {
  const { isDark, theme } = useTheme();

  // Android doesn't support blur, use solid background
  if (Platform.OS === 'android') {
    return (
      <View
        testID="tab-bar-background-android"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.surface }]}
      />
    );
  }

  // iOS: Use native blur effect for Liquid Glass look
  return (
    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
  );
}
