import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Render the Stack navigator for the Steps tab.
 *
 * Configures two screens: "index" (the 12-steps list) and "[id]" (individual step detail using a slide-from-right animation).
 * Redirects to home if 12-step content is disabled in user preferences.
 *
 * @returns The Stack navigation element configured for the Steps tab.
 */
export default function StepsLayout() {
  const router = useRouter();
  const { profile } = useAuth();

  // Redirect to home if 12-step content is disabled
  // Only redirect when explicitly set to false (treat null/undefined as true for backwards compatibility)
  useEffect(() => {
    if (profile?.show_program_content === false) {
      router.replace('/(app)/(tabs)');
    }
  }, [profile?.show_program_content, router]);

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
