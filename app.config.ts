import { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo configuration for Sobriety Waypoint app.
 *
 * @remarks
 * This configuration includes EAS Update settings for over-the-air updates.
 * The runtime version uses the SDK version policy for managed workflow compatibility.
 *
 * @see {@link https://docs.expo.dev/eas-update/getting-started/ EAS Update Documentation}
 * @see {@link https://docs.expo.dev/distribution/runtime-versions/ Runtime Version Documentation}
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
  version: '1.0.0',
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
  ios: {
    bundleIdentifier: 'com.volvox.sobrietywaypoint',
    icon: './assets/images/logo.png',
    supportsTablet: true,
    usesAppleSignIn: true, // Enable Sign in with Apple capability
    googleServicesFile: './GoogleService-Info.plist', // Firebase config for iOS
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.volvox.sobrietywaypoint',
    icon: './assets/images/logo.png',
    googleServicesFile: './google-services.json', // Firebase config for Android
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
    'expo-router',
    'expo-apple-authentication',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-build-properties',
      {
        ios: {
          // Note: Firebase requires modular headers, configured via withModularHeaders plugin below
        },
      },
    ],
    './plugins/withModularHeaders', // Required for Firebase/GoogleUtilities Swift compatibility
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
    [
      '@react-native-firebase/app',
      {
        // iOS uses GoogleService-Info.plist from project root (configured via ios.googleServicesFile)
        // Android uses google-services.json from project root (configured via android.googleServicesFile)
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
