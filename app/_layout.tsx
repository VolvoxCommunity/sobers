// Initialize Sentry before anything else
import { initializeSentry, navigationIntegration, wrapRootComponent } from '@/lib/sentry';

import { useEffect } from 'react';
import {
  Stack,
  useRouter,
  useSegments,
  SplashScreen,
  useNavigationContainerRef,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://77ea621f12b48d67c919aa52f04460d7@o216503.ingest.us.sentry.io/4510371687890944',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Initialize Sentry once with centralized configuration
initializeSentry();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();

  // Register navigation container with Sentry
  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAuthScreen = segments[0] === 'login' || segments[0] === 'signup';

    const DEFAULT_FIRST_NAME = 'User';
    const DEFAULT_LAST_INITIAL = 'U';

    const hasName =
      profile?.first_name &&
      profile.first_name !== DEFAULT_FIRST_NAME &&
      profile.last_initial &&
      profile.last_initial !== DEFAULT_LAST_INITIAL;
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
  }, [user, profile, segments, loading, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
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
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default Sentry.wrap(
  wrapRootComponent(function RootLayout() {
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
  })
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
