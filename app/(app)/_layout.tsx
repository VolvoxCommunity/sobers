// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Component
// =============================================================================

/**
 * Protected layout that guards all routes within the (app) group.
 *
 * Renders a loading state while auth is resolving, redirects to authentication or onboarding when required, and exposes the app's protected routes when the user has a complete profile.
 *
 * @returns The layout element that renders protected routes or redirects based on authentication and profile completeness.
 */
export default function AppLayout(): React.ReactElement {
  const { user, profile, loading } = useAuth();
  const { theme } = useTheme();

  // Show loading indicator while auth state is being determined
  // This is acceptable in a nested layout per Expo Router docs
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator testID="loading-indicator" size="large" color={theme.successAlt} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Profile is complete when user has provided their display name and sobriety date
  const hasDisplayName = !!profile?.display_name?.trim();
  const hasSobrietyDate = !!profile?.sobriety_date;
  const isProfileComplete = hasDisplayName && hasSobrietyDate;

  // Redirect to onboarding if profile is incomplete or doesn't exist
  if (!profile || !isProfileComplete) {
    return <Redirect href="/onboarding" />;
  }

  // User is authenticated with complete profile - render protected routes
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
