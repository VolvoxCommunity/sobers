import { Stack } from 'expo-router';

/**
 * Layout for the Steps tab stack navigation.
 *
 * Configures the navigation stack for:
 * - index: The 12 steps list view
 * - [id]: Individual step detail view
 */
export default function StepsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          // Use slide animation for detail screen
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
