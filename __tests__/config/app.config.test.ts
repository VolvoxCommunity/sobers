/**
 * @fileoverview Tests for app.config.ts
 *
 * Tests the Expo app configuration including:
 * - Plugin configuration
 * - Build settings
 * - Configuration structure
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

      // expo-router can be a string or array [name, options]
      const hasExpoRouter = config.plugins?.some(
        (plugin: unknown) =>
          plugin === 'expo-router' || (Array.isArray(plugin) && plugin[0] === 'expo-router')
      );
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
      expect(config.android?.package).toBe('com.volvox.sobers');
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
  });
});
