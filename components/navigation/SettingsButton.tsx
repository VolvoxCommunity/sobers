// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================
interface SettingsButtonProps {
  /** Size of the settings icon (default: 24) */
  size?: number;
  /** Custom color override (default: theme.textSecondary) */
  color?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * A settings cogwheel button that navigates to the settings screen.
 *
 * @param size - Icon size in pixels (default: 24)
 * @param color - Custom icon color (defaults to theme.textSecondary)
 * @returns A touchable settings icon button
 *
 * @example
 * ```tsx
 * <SettingsButton />
 * <SettingsButton size={20} />
 * ```
 */
export default function SettingsButton({
  size = 24,
  color,
}: SettingsButtonProps): React.ReactElement {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      accessibilityHint="Navigates to the settings screen"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Settings size={size} color={color ?? theme.textSecondary} />
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
