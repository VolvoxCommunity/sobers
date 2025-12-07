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

    it('does not include redundant plugins after cleanup', () => {
      const config = appConfig({ config: {} } as any);
      
      // These plugins are now auto-linked and should not be explicitly listed
      const redundantPlugins = ['expo-font', 'expo-secure-store', 'expo-web-browser'];
      
      redundantPlugins.forEach(pluginName => {
        const hasPlugin = config.plugins?.includes(pluginName);
        expect(hasPlugin).toBe(false);
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
      
      expect(config.ios?.bundleIdentifier).toBe('com.volvoxcommunity.sobrietywaypoint');
      expect(config.android?.package).toBe('com.volvoxcommunity.sobrietywaypoint');
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

    it('configures splash screen', () => {
      const config = appConfig({ config: {} } as any);
      
      expect(config.splash).toBeDefined();
      expect(config.splash?.image).toBeDefined();
      expect(config.splash?.resizeMode).toBeDefined();
    });

    it('configures updates', () => {
      const config = appConfig({ config: {} } as any);
      
      expect(config.updates).toBeDefined();
    });
  });
});