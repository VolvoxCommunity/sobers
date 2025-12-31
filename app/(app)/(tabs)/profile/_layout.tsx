// =============================================================================
// Imports
// =============================================================================
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Constants
// =============================================================================

export const unstable_settings = {
  initialRouteName: 'index',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Stack navigator for the profile tab.
 *
 * Enables navigation from the profile screen to settings and other
 * profile-related screens while keeping the tab bar visible.
 *
 * @returns A Stack navigator for profile-related screens
 */
export default function ProfileLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontFamily: 'JetBrainsMono-SemiBold',
            fontSize: 18,
          },
          headerBackTitle: 'Profile',
        }}
      />
    </Stack>
  );
}
