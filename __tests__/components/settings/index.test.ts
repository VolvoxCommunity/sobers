/**
 * @fileoverview Tests for settings module exports
 *
 * Tests that all expected exports are available from the settings module.
 * This ensures the barrel file (index.ts) correctly re-exports all components,
 * types, constants, and utilities.
 */

import {
  SettingsContent,
  EXTERNAL_LINKS,
  noop,
  getStringOrNull,
  getBuildInfo,
  formatBuildInfoForCopy,
} from '@/components/settings';

// Types are tested at compile-time - if they don't exist, TypeScript will fail
import type { BuildInfo, SettingsContentProps } from '@/components/settings';

// =============================================================================
// Test Suite
// =============================================================================

describe('settings module exports', () => {
  describe('component exports', () => {
    it('exports SettingsContent component', () => {
      expect(SettingsContent).toBeDefined();
      expect(typeof SettingsContent).toBe('function');
    });
  });

  describe('constant exports', () => {
    it('exports EXTERNAL_LINKS object', () => {
      expect(EXTERNAL_LINKS).toBeDefined();
      expect(typeof EXTERNAL_LINKS).toBe('object');
    });

    it('exports EXTERNAL_LINKS with correct structure', () => {
      expect(EXTERNAL_LINKS).toHaveProperty('PRIVACY_POLICY');
      expect(EXTERNAL_LINKS).toHaveProperty('TERMS_OF_SERVICE');
      expect(EXTERNAL_LINKS).toHaveProperty('SOURCE_CODE');
      expect(EXTERNAL_LINKS).toHaveProperty('DEVELOPER');
    });

    it('exports EXTERNAL_LINKS with valid URLs', () => {
      expect(EXTERNAL_LINKS.PRIVACY_POLICY).toMatch(/^https?:\/\//);
      expect(EXTERNAL_LINKS.TERMS_OF_SERVICE).toMatch(/^https?:\/\//);
      expect(EXTERNAL_LINKS.SOURCE_CODE).toMatch(/^https?:\/\//);
      expect(EXTERNAL_LINKS.DEVELOPER).toMatch(/^https?:\/\//);
    });

    it('exports noop function', () => {
      expect(noop).toBeDefined();
      expect(typeof noop).toBe('function');
    });

    it('noop does nothing and returns undefined', () => {
      const result = noop();
      expect(result).toBeUndefined();
    });
  });

  describe('utility function exports', () => {
    it('exports getStringOrNull function', () => {
      expect(getStringOrNull).toBeDefined();
      expect(typeof getStringOrNull).toBe('function');
    });

    it('exports getBuildInfo function', () => {
      expect(getBuildInfo).toBeDefined();
      expect(typeof getBuildInfo).toBe('function');
    });

    it('exports formatBuildInfoForCopy function', () => {
      expect(formatBuildInfoForCopy).toBeDefined();
      expect(typeof formatBuildInfoForCopy).toBe('function');
    });
  });

  describe('type exports', () => {
    // TypeScript compile-time check: if these types don't exist, this won't compile
    it('exports BuildInfo type (compile-time check)', () => {
      // Create a mock BuildInfo to verify the type structure compiles
      const mockBuildInfo: BuildInfo = {
        easBuildId: null,
        easBuildProfile: null,
        easBuildGitCommitHash: null,
        easBuildRunner: null,
        deviceModel: null,
        osName: null,
        osVersion: null,
        nativeBuildVersion: null,
        nativeAppVersion: null,
      };

      expect(mockBuildInfo).toBeDefined();
    });

    it('exports SettingsContentProps type (compile-time check)', () => {
      // Create a mock SettingsContentProps to verify the type structure compiles
      const mockProps: SettingsContentProps = {
        onDismiss: () => {},
      };

      expect(mockProps).toBeDefined();
    });

    it('SettingsContentProps allows optional onDismiss', () => {
      // Verify onDismiss is optional
      const propsWithoutDismiss: SettingsContentProps = {};
      expect(propsWithoutDismiss).toBeDefined();
    });
  });
});
