// =============================================================================
// Imports
// =============================================================================
import { Stack } from 'expo-router';

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
 * Contains just the profile index screen. Settings is handled as a modal
 * at the app level to allow returning to any screen.
 *
 * @returns A Stack navigator for profile-related screens
 */
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
