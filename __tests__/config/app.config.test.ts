/**
 * @fileoverview Tests for app.config.ts
 *
 * Tests the Expo app configuration including:
 * - Plugin configuration
 * - Build settings
 * - Configuration structure
 * - Firebase configuration via environment variables
 */

import appConfig from '../../app.config';

describe('app.config.ts', () => {
  // Store original env vars to restore after tests
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment after each test
    process.env = { ...originalEnv };
  });
  describe('Plugin Configuration', () => {
    it('includes essential plugins', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.plugins).toBeDefined();
      expect(Array.isArray(config.plugins)).toBe(true);
    });

    it('includes expo-router plugin', () => {
      const config = appConfig({ config: {} } as any);

      const hasExpoRouter = config.plugins?.includes('expo-router');
      expect(hasExpoRouter).toBe(true);
    });

    it('includes expo-apple-authentication plugin', () => {
      const config = appConfig({ config: {} } as any);

      const hasAppleAuth = config.plugins?.some(
        (plugin: any) => plugin === 'expo-apple-authentication'
      );
      expect(hasAppleAuth).toBe(true);
    });

    it('includes expo-splash-screen with configuration', () => {
      const config = appConfig({ config: {} } as any);

      const splashScreenPlugin = config.plugins?.find(
        (plugin: any) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      );

      expect(splashScreenPlugin).toBeDefined();
      expect(Array.isArray(splashScreenPlugin)).toBe(true);
    });

    it('includes commonly used expo plugins', () => {
      const config = appConfig({ config: {} } as any);

      // These plugins are explicitly listed for configuration/native module setup
      const expectedPlugins = ['expo-font', 'expo-secure-store', 'expo-web-browser'];

      expectedPlugins.forEach((pluginName) => {
        const hasPlugin = config.plugins?.includes(pluginName);
        expect(hasPlugin).toBe(true);
      });
    });
  });

  describe('App Metadata', () => {
    it('has required metadata fields', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.name).toBeDefined();
      expect(config.slug).toBeDefined();
      expect(config.version).toBeDefined();
    });

    it('uses correct bundle identifiers', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.ios?.bundleIdentifier).toBe('com.volvox.sobrietywaypoint');
      expect(config.android?.package).toBe('com.volvox.sobrietywaypoint');
    });
  });

  describe('Platform Configuration', () => {
    it('configures iOS platform', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.ios).toBeDefined();
      expect(config.ios?.supportsTablet).toBeDefined();
    });

    it('configures Android platform', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.android).toBeDefined();
      expect(config.android?.adaptiveIcon).toBeDefined();
    });

    it('configures web platform', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.web).toBeDefined();
    });
  });

  describe('Build Configuration', () => {
    it('sets appropriate orientation', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.orientation).toBeDefined();
    });

    it('configures splash screen via plugin', () => {
      const config = appConfig({ config: {} } as any);

      // Splash screen is configured via expo-splash-screen plugin, not top-level splash property
      const splashScreenPlugin = config.plugins?.find(
        (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ) as [string, { image?: string; resizeMode?: string }] | undefined;

      expect(splashScreenPlugin).toBeDefined();
      expect(splashScreenPlugin?.[1]?.image).toBeDefined();
      expect(splashScreenPlugin?.[1]?.resizeMode).toBeDefined();
    });

    it('configures updates', () => {
      const config = appConfig({ config: {} } as any);

      expect(config.updates).toBeDefined();
    });
  });

  describe('Firebase Configuration', () => {
    describe('iOS googleServicesFile', () => {
      it('uses environment variable when GOOGLE_SERVICE_INFO_PLIST is set', () => {
        process.env.GOOGLE_SERVICE_INFO_PLIST = '/tmp/eas-secret/GoogleService-Info.plist';

        const config = appConfig({ config: {} } as any);

        expect(config.ios?.googleServicesFile).toBe('/tmp/eas-secret/GoogleService-Info.plist');
      });

      it('falls back to local file when GOOGLE_SERVICE_INFO_PLIST is not set', () => {
        delete process.env.GOOGLE_SERVICE_INFO_PLIST;

        const config = appConfig({ config: {} } as any);

        expect(config.ios?.googleServicesFile).toBe('./GoogleService-Info.plist');
      });

      it('falls back to local file when GOOGLE_SERVICE_INFO_PLIST is empty string', () => {
        process.env.GOOGLE_SERVICE_INFO_PLIST = '';

        const config = appConfig({ config: {} } as any);

        // Empty string is falsy, so it should fall back to local file
        expect(config.ios?.googleServicesFile).toBe('./GoogleService-Info.plist');
      });
    });

    describe('Android googleServicesFile', () => {
      it('uses environment variable when GOOGLE_SERVICES_JSON is set', () => {
        process.env.GOOGLE_SERVICES_JSON = '/tmp/eas-secret/google-services.json';

        const config = appConfig({ config: {} } as any);

        expect(config.android?.googleServicesFile).toBe('/tmp/eas-secret/google-services.json');
      });

      it('falls back to local file when GOOGLE_SERVICES_JSON is not set', () => {
        delete process.env.GOOGLE_SERVICES_JSON;

        const config = appConfig({ config: {} } as any);

        expect(config.android?.googleServicesFile).toBe('./google-services.json');
      });

      it('falls back to local file when GOOGLE_SERVICES_JSON is empty string', () => {
        process.env.GOOGLE_SERVICES_JSON = '';

        const config = appConfig({ config: {} } as any);

        // Empty string is falsy, so it should fall back to local file
        expect(config.android?.googleServicesFile).toBe('./google-services.json');
      });
    });

    describe('Firebase plugin configuration', () => {
      it('includes @react-native-firebase/app plugin', () => {
        const config = appConfig({ config: {} } as any);

        const hasFirebasePlugin = config.plugins?.includes('@react-native-firebase/app');
        expect(hasFirebasePlugin).toBe(true);
      });

      it('includes withModularHeaders plugin for Firebase compatibility', () => {
        const config = appConfig({ config: {} } as any);

        const hasModularHeadersPlugin = config.plugins?.includes('./plugins/withModularHeaders');
        expect(hasModularHeadersPlugin).toBe(true);
      });
    });
  });
});
