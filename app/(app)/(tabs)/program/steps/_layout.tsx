// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// =============================================================================
// Component
// =============================================================================

/**
 * Stack navigator for the Steps tab within Program section.
 */
export default function StepsLayout(): React.ReactElement {
  const { profile, loading } = useAuth();

  const shouldShowProgramContent = profile?.show_program_content !== false;

  if (!loading && !shouldShowProgramContent) {
    return <Redirect href="/(app)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
