// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, Redirect, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Component
// =============================================================================

/**
 * Protected layout that guards all routes within the (app) group.
 *
 * Uses declarative `<Redirect>` component per Expo Router best practices.
 * This layout handles authentication checks and redirects:
 * - Shows loading indicator while auth state is being determined
 * - Redirects to /login if user is not authenticated
 * - Redirects to /onboarding if user profile is incomplete
 * - Renders child routes if user is fully authenticated
 *
 * @returns The protected layout with auth guards
 */
export default function AppLayout(): React.ReactElement {
  const { user, profile, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

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
      {/* Settings route with modal presentation */}
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'formSheet',
          gestureEnabled: true,
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: {
            fontFamily: 'JetBrainsMono-SemiBold',
            fontSize: 18,
          },
          headerLeft: () => null,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Close settings"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          ),
          contentStyle: { backgroundColor: theme.background },
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
