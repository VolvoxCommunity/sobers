import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo configuration for Sobers app.
 *
 * @see {@link https://docs.expo.dev/workflow/configuration/ Expo Configuration}
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    /**
     * EAS Build information captured at build time.
     * These environment variables are only available during EAS Build,
     * so they will be null/undefined in local development.
     *
     * @see {@link https://docs.expo.dev/eas/environment-variables/ EAS Environment Variables}
     */
    easBuildId: process.env.EAS_BUILD_ID ?? null,
    easBuildProfile: process.env.EAS_BUILD_PROFILE ?? null,
    easBuildGitCommitHash: process.env.EAS_BUILD_GIT_COMMIT_HASH ?? null,
    easBuildRunner: process.env.EAS_BUILD_RUNNER ?? null,
    eas: {
      projectId: 'd17ee0bf-d2d6-4a29-9348-8dc79fffb815',
    },
  },
  name: 'Sobers',
  owner: 'volvox-llc',
  slug: 'sobers',
  scheme: 'sobers',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/logo.png',
  version: '1.3.0',
  orientation: 'portrait',
  newArchEnabled: true,
  // ===========================================================================
  // iOS Configuration
  // ===========================================================================
  ios: {
    bundleIdentifier: 'com.volvox.sobrietywaypoint',
    icon: './assets/images/logo.png',
    supportsTablet: true,
    usesAppleSignIn: true, // Enable Sign in with Apple capability
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    appleTeamId: 'WCBSSPMVPV',
  },
  // ===========================================================================
  // Android Configuration
  // ===========================================================================
  android: {
    package: 'com.volvox.sobers',
    icon: './assets/images/logo.png',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/logo.png',
      backgroundImage: './assets/images/logo.png',
      monochromeImage: './assets/images/logo.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-router',
      {
        // Setting the origin is required to fix a <Head> component handoff error in expo-router.
        // Without this, server/client rendering can mismatch <head> contents, causing hydration errors.
        // See: https://github.com/expo/router/issues/856
        origin: 'https://sobers.app',
      },
    ],
    'expo-apple-authentication',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    'expo-build-properties',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'sobers',
        organization: 'volvox',
      },
    ],
    // Edge-to-edge with Material 3 theme for native Android bottom tabs
    // This replaces the standalone react-native-bottom-tabs plugin when edgeToEdgeEnabled is true
    ['react-native-edge-to-edge', { android: { parentTheme: 'Material3' } }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
