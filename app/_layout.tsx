// Initialize Sentry before anything else using centralized configuration
import { initializeSentry, navigationIntegration, wrapRootComponent } from '@/lib/sentry';
import { logger, LogCategory } from '@/lib/logger';

// Initialize Sentry once with centralized configuration from lib/sentry.ts
// This handles environment detection, privacy hooks, and all integrations
initializeSentry();

/* eslint-disable import/first -- Sentry and Analytics must initialize before React components load */
// Initialize Amplitude Analytics for event tracking (skip during SSR)
// Dynamic import prevents build failures - analytics SDK requires browser APIs
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
import { Stack, usePathname, SplashScreen, useNavigationContainerRef } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { Analytics } from '@vercel/analytics/react';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { DevToolsProvider } from '@/contexts/DevToolsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StyleSheet, Platform, AppState, type AppStateStatus } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { createToastConfig } from '@/lib/toast';
import { useFonts } from 'expo-font';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { trackScreenView, trackEvent, AnalyticsEvents } from '@/lib/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
/* eslint-enable import/first */

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

/**
 * Render a themed Toast positioned at the top of the screen.
 *
 * Requires a ThemeProvider in the component tree so the current theme can be read.
 *
 * @returns A Toast React element configured with the current theme and positioned at the top with a 60px offset.
 */
function ToastWrapper(): React.ReactElement {
  const { isDark } = useTheme();
  return <Toast config={createToastConfig(isDark)} position="top" topOffset={60} />;
}

/**
 * Root navigation component that always renders the Stack immediately.
 *
 * Per Expo Router best practices, the root layout must mount the navigator
 * immediately without any conditional logic blocking it. Auth guards and
 * loading states are handled in nested layouts like `(app)/_layout.tsx`.
 *
 * @returns The root Stack navigator with all top-level routes
 */
function RootLayoutNav(): React.ReactElement {
  const { isDark } = useTheme();
  const navigationRef = useNavigationContainerRef();
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Register navigation container with Sentry
  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  // Track app opened and daily check-in on mount
  useEffect(() => {
    const trackAppOpened = async () => {
      // Track app opened
      trackEvent(AnalyticsEvents.APP_OPENED, {
        timestamp: new Date().toISOString(),
      });

      // Track session started
      trackEvent(AnalyticsEvents.APP_SESSION_STARTED, {
        timestamp: new Date().toISOString(),
      });

      // Check for daily check-in (first open of the day)
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastCheckIn = await AsyncStorage.getItem('last_daily_check_in');

        if (lastCheckIn !== today) {
          trackEvent(AnalyticsEvents.DAILY_CHECK_IN, {
            date: today,
            is_first_today: true,
          });
          await AsyncStorage.setItem('last_daily_check_in', today);
        }
      } catch {
        // Silently fail - analytics is non-critical
      }
    };

    trackAppOpened();
  }, []);

  // Track app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background
        const sessionDuration = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        trackEvent(AnalyticsEvents.APP_BACKGROUNDED, {
          session_duration_seconds: sessionDuration,
        });
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground - start new session
        sessionStartTimeRef.current = Date.now();
        trackEvent(AnalyticsEvents.APP_SESSION_STARTED, {
          timestamp: new Date().toISOString(),
        });
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

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
   * Note: Dynamic routes like /program/steps/[id] use UUIDs in the URL, so we show
   * a generic "Step Details" title. The actual step number (1-12) is only
   * available from the database after the step data is fetched.
   */
  const getPageTitle = (): string => {
    // Guard against null pathname (can occur on first render before router is ready)
    if (!pathname) {
      return 'Sobers';
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
      '/program/steps': 'Program',
    };

    // Check for exact match first
    if (titles[pathname]) {
      return `${titles[pathname]} | Sobers`;
    }

    // Handle dynamic routes like /program/steps/[id]
    // Note: The URL contains the step's UUID, not the step number (1-12).
    // The step number is only available from the database, so we use a generic title here.
    // This could be enhanced in the future by adding the step number to the route params
    // or using a separate metadata API to fetch the step number for more specific titles (better for SEO).
    if (pathname.startsWith('/program/steps/')) {
      return 'Step Details | Sobers';
    }

    // Default fallback
    return 'Sobers';
  };

  const pageTitle = getPageTitle();

  // SEO meta tags rendered unconditionally for search engine and social media crawlers
  // Title updates dynamically based on current route for better browser tab UX
  const seoHead = (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content="Your companion on the journey to recovery" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Sobers" />
      <meta property="og:description" content="Your companion on the journey to recovery" />
      <meta property="og:site_name" content="Sobers" />
      <meta property="og:image" content="https://sobers.app/assets/images/banner.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Sobers" />
      <meta name="twitter:description" content="Your companion on the journey to recovery" />
      <meta name="twitter:image" content="https://sobers.app/assets/images/banner.png" />
    </Head>
  );

  // IMPORTANT: Root layout must always render the Stack immediately per Expo Router docs.
  // Auth guards and loading states are handled in nested layouts like (app)/_layout.tsx.
  // This prevents "navigation before mounting" errors and follows best practices.
  return (
    <>
      {seoHead}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Public routes - accessible without authentication */}
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="onboarding" />
        {/* Protected routes - auth guard in (app)/_layout.tsx */}
        <Stack.Screen name="(app)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

/**
 * Root layout component that sets up providers and renders the app.
 *
 * This is the entry point for navigation. It wraps the entire app with:
 * - GestureHandlerRootView for gesture handling
 * - ErrorBoundary for crash reporting
 * - KeyboardProvider for keyboard-aware views
 * - BottomSheetModalProvider for bottom sheets
 * - ThemeProvider for theming
 * - AuthProvider for authentication state
 *
 * Font loading is handled here, showing splash screen until fonts are ready.
 */
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
          <ThemeProvider>
            <DevToolsProvider>
              <AuthProvider>
                <BottomSheetModalProvider>
                  <RootLayoutNav />
                </BottomSheetModalProvider>
              </AuthProvider>
            </DevToolsProvider>
            <ToastWrapper />
          </ThemeProvider>
        </KeyboardProvider>
        {/* Vercel Analytics - web only, inside ErrorBoundary for safety */}
        {Platform.OS === 'web' && <Analytics />}
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
