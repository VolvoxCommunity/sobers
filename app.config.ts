import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo configuration for Sobriety Waypoint app.
 *
 * @remarks
 * This configuration includes EAS Update settings for over-the-air updates.
 * The runtime version uses the SDK version policy for managed workflow compatibility.
 *
 * ## Firebase Configuration Strategy
 *
 * Firebase config files are loaded using a two-tier approach:
 *
 * 1. **EAS Builds (Production/Preview)**: Environment variables provide paths to Firebase config files.
 *    - `GOOGLE_SERVICES_JSON` - Path to Android's google-services.json (set via EAS file secrets)
 *    - `GOOGLE_SERVICE_INFO_PLIST` - Path to iOS's GoogleService-Info.plist (set via EAS file secrets)
 *
 * 2. **Local Development**: Falls back to local files in project root when env vars are not set.
 *    - `./google-services.json` - Android config (gitignored, must be added manually)
 *    - `./GoogleService-Info.plist` - iOS config (gitignored, must be added manually)
 *
 * To set up EAS secrets:
 * ```bash
 * eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
 * eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
 * ```
 *
 * @see {@link https://docs.expo.dev/eas-update/getting-started/ EAS Update Documentation}
 * @see {@link https://docs.expo.dev/distribution/runtime-versions/ Runtime Version Documentation}
 * @see {@link https://docs.expo.dev/build-reference/variables/#using-secrets-in-environment-variables EAS Secrets}
 * @see {@link https://rnfirebase.io/ React Native Firebase}
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
      projectId: '8d64bbe4-27d4-41ac-9421-9c2758e4765a',
    },
  },
  name: 'Sobriety Waypoint',
  owner: 'volvox-llc',
  slug: 'sobriety-waypoint',
  scheme: 'sobrietywaypoint',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/logo.png',
  version: '1.1.0',
  orientation: 'portrait',
  newArchEnabled: true,
  // =============================================================================
  // EAS Update Configuration
  // =============================================================================
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  updates: {
    url: 'https://u.expo.dev/8d64bbe4-27d4-41ac-9421-9c2758e4765a',
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  // ===========================================================================
  // iOS Configuration
  // ===========================================================================
  ios: {
    bundleIdentifier: 'com.volvox.sobrietywaypoint',
    icon: './assets/images/logo.png',
    supportsTablet: true,
    usesAppleSignIn: true, // Enable Sign in with Apple capability
    /**
     * Firebase iOS configuration file path.
     * Uses GOOGLE_SERVICE_INFO_PLIST env var (set by EAS file secrets) or falls back
     * to local file for development. The file contains Firebase project credentials
     * including API keys, project ID, and GCM sender ID.
     */
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  // ===========================================================================
  // Android Configuration
  // ===========================================================================
  android: {
    package: 'com.volvox.sobrietywaypoint',
    icon: './assets/images/logo.png',
    /**
     * Firebase Android configuration file path.
     * Uses GOOGLE_SERVICES_JSON env var (set by EAS file secrets) or falls back
     * to local file for development. The file contains Firebase project credentials
     * including API keys, project ID, and client information.
     */
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
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
        origin: 'https://sobrietywaypoint.com',
      },
    ],
    'expo-apple-authentication',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        ios: {
          // Note: Firebase requires modular headers, configured via the withModularHeaders plugin
        },
      },
    ],
    './plugins/withModularHeaders', // Required for Firebase/GoogleUtilities Swift compatibility
    // Note: Firebase config files are handled via googleServicesFile config + EAS secrets
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
        project: 'sobriety-waypoint',
        organization: 'volvox',
      },
    ],
    '@react-native-firebase/app',
    // Edge-to-edge with Material 3 theme for native Android bottom tabs
    // This replaces the standalone react-native-bottom-tabs plugin when edgeToEdgeEnabled is true
    ['react-native-edge-to-edge', { android: { parentTheme: 'Material3' } }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
