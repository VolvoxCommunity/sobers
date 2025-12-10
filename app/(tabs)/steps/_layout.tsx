import { Stack } from 'expo-router';

/**
 * Render the Stack navigator for the Steps tab.
 *
 * Configures two screens: "index" (the 12-steps list) and "[id]" (individual step detail using a slide-from-right animation).
 *
 * @returns The Stack navigation element configured for the Steps tab.
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