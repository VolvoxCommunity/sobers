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
  version: '1.3.0',
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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.volvox.sobrietywaypoint',
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
    'expo-router',
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
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
