// Initialize Sentry before anything else using centralized configuration
import { initializeSentry, navigationIntegration, wrapRootComponent } from '@/lib/sentry';
import { logger, LogCategory } from '@/lib/logger';

// Initialize Sentry once with centralized configuration from lib/sentry.ts
// This handles environment detection, privacy hooks, and all integrations
initializeSentry();

/* eslint-disable import/first -- Sentry and Analytics must initialize before React components load */
// Initialize Firebase Analytics for event tracking (skip during SSR)
// Dynamic import prevents build failures - Firebase SDK requires browser APIs
// Note: Async init means early events may be dropped (handled gracefully by analytics module)
if (typeof window !== 'undefined') {
  import('@/lib/analytics')
    .then((analytics) => analytics.initializeAnalytics())
    .catch((error) => {
      // Log but don't crash - analytics is non-critical
      logger.error(
        'Failed to initialize analytics',
        error instanceof Error ? error : new Error(String(error)),
        {
          category: LogCategory.ANALYTICS,
        }
      );
    });
}
import { useEffect, useRef } from 'react';
import {
  Stack,
  useRouter,
  useSegments,
  usePathname,
  SplashScreen,
  useNavigationContainerRef,
  useRootNavigationState,
} from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { trackScreenView } from '@/lib/analytics';
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
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  // Check if the navigator is ready before attempting navigation
  // This prevents "action was not handled by any navigator" warnings
  const navigatorReady = rootNavigationState?.key != null;

  // Register navigation container with Sentry
  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  // Track screen views on navigation
  useEffect(() => {
    if (pathname && pathname !== previousPathname.current) {
      // Convert pathname to readable screen name
      // Examples: '/' → 'Home', '/login' → 'Login', '/manage-tasks' → 'Manage Tasks'
      const screenName = pathname === '/' ? 'Home' : pathname.replace(/^\//, '').replace(/-/g, ' ');
      trackScreenView(screenName);
      previousPathname.current = pathname;
    }
  }, [pathname]);

  /**
   * Maps the current pathname to a human-readable page title.
   * Used for the browser tab title on web.
   *
   * Note: Dynamic routes like /steps/[id] use UUIDs in the URL, so we show
   * a generic "Step Details" title. The actual step number (1-12) is only
   * available from the database after the step data is fetched.
   */
  const getPageTitle = (): string => {
    // Guard against null pathname (can occur on first render before router is ready)
    if (!pathname) {
      return 'Sobriety Waypoint';
    }

    const titles: Record<string, string> = {
      '/': 'Home',
      '/login': 'Sign In',
      '/signup': 'Sign Up',
      '/onboarding': 'Get Started',
      '/journey': 'Journey',
      '/tasks': 'Tasks',
      '/manage-tasks': 'Manage Tasks',
      '/profile': 'Profile',
      '/settings': 'Settings',
      '/steps': 'Steps',
    };

    // Check for exact match first
    if (titles[pathname]) {
      return `${titles[pathname]} | Sobriety Waypoint`;
    }

    // Handle dynamic routes like /steps/[id]
    // Note: The URL contains the step's UUID, not the step number (1-12).
    // The step number is only available from the database, so we use a generic title here.
    // This could be enhanced in the future by adding the step number to the route params
    // or using a separate metadata API to fetch the step number for more specific titles (better for SEO).
    if (pathname.startsWith('/steps/')) {
      return 'Step Details | Sobriety Waypoint';
    }

    // Default fallback
    return 'Sobriety Waypoint';
  };

  const pageTitle = getPageTitle();

  useEffect(() => {
    // Wait for both auth loading to complete AND navigator to be ready
    if (loading || !navigatorReady) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    // Profile is complete when user has provided their display name and sobriety date during onboarding.
    // Check for non-empty trimmed values to guard against whitespace-only or empty strings.
    const hasDisplayName = !!profile?.display_name?.trim();
    const hasSobrietyDate = !!profile?.sobriety_date;
    const isProfileComplete = hasDisplayName && hasSobrietyDate;

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

  // SEO meta tags rendered unconditionally for search engine and social media crawlers
  // Title updates dynamically based on current route for better browser tab UX
  const seoHead = (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content="Your companion on the journey to recovery" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Sobriety Waypoint" />
      <meta property="og:description" content="Your companion on the journey to recovery" />
      <meta property="og:site_name" content="Sobriety Waypoint" />
      <meta property="og:image" content="https://sobrietywaypoint.com/assets/images/banner.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Sobriety Waypoint" />
      <meta name="twitter:description" content="Your companion on the journey to recovery" />
      <meta name="twitter:image" content="https://sobrietywaypoint.com/assets/images/banner.png" />
    </Head>
  );

  if (loading) {
    return (
      <>
        {seoHead}
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator testID="loading-indicator" size="large" color={theme.successAlt} />
        </View>
      </>
    );
  }

  return (
    <>
      {seoHead}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        {/* Settings route kept as fallback - primary access via bottom sheet in profile.tsx */}
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
    <GestureHandlerRootView style={styles.container}>
      <ErrorBoundary>
        <KeyboardProvider>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </KeyboardProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
