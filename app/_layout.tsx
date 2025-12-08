// Initialize Sentry before anything else using centralized configuration
import { initializeSentry, navigationIntegration, wrapRootComponent } from '@/lib/sentry';

// Initialize Sentry once with centralized configuration from lib/sentry.ts
// This handles environment detection, privacy hooks, and all integrations
initializeSentry();
/* eslint-disable import/first -- Sentry must initialize before React components load */
import { useEffect } from 'react';
import {
  Stack,
  useRouter,
  useSegments,
  SplashScreen,
  useNavigationContainerRef,
  useRootNavigationState,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useFonts } from 'expo-font';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
/* eslint-enable import/first */

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Controls app routing and renders the root navigation UI based on authentication and profile state.
 *
 * Observes authentication, profile completeness, and current route segments to perform routing guards
 * (redirecting to `/login`, `/onboarding`, or `/(tabs)` as appropriate). While auth state is loading,
 * displays a centered loading indicator. When not loading, renders the app's Stack navigator and StatusBar.
 *
 * @returns The root navigation JSX element containing the app's Stack and StatusBar
 */
function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const { isDark, theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const rootNavigationState = useRootNavigationState();

  // Check if the navigator is ready before attempting navigation
  // This prevents "action was not handled by any navigator" warnings
  const navigatorReady = rootNavigationState?.key != null;

  // Register navigation container with Sentry
  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  useEffect(() => {
    // Wait for both auth loading to complete AND navigator to be ready
    if (loading || !navigatorReady) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    // Profile is complete when user has provided their name and sobriety date during onboarding
    // Check for non-null values (null indicates user hasn't completed onboarding).
    // Also validate against placeholder values ('User', 'U') to catch legacy data or edge cases.
    const hasName =
      profile !== null &&
      profile.first_name !== null &&
      profile.last_initial !== null &&
      profile.first_name !== 'User' &&
      profile.last_initial !== 'U';
    const hasSobrietyDate = !!profile?.sobriety_date;
    const isProfileComplete = hasName && hasSobrietyDate;

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (!user && !inAuthScreen) {
      router.replace('/login');
    } else if (user && profile && isProfileComplete && (inAuthScreen || inOnboarding)) {
      router.replace('/(tabs)');
    } else if (user && profile && !isProfileComplete && !inOnboarding) {
      router.replace('/onboarding');
    } else if (user && !profile && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, profile, segments, loading, router, navigatorReady]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
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
                <Text style={{ color: theme.primary, fontSize: 17, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            ),
            contentStyle: { backgroundColor: theme.background },
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default wrapRootComponent(function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'JetBrainsMono-Regular': JetBrainsMono_400Regular,
    'JetBrainsMono-Medium': JetBrainsMono_500Medium,
    'JetBrainsMono-SemiBold': JetBrainsMono_600SemiBold,
    'JetBrainsMono-Bold': JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
