/**
 * @fileoverview Tests for components/settings/utils.ts
 *
 * Tests the build info utility functions for settings/debug screens.
 */

import { Platform } from 'react-native';
import { getStringOrNull, getBuildInfo, formatBuildInfoForCopy } from '@/components/settings/utils';
import type { BuildInfo } from '@/components/settings/types';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      easBuildId: 'test-build-id',
      easBuildProfile: 'production',
      easBuildGitCommitHash: 'abc123',
      easBuildRunner: 'eas-build',
    },
  },
}));

// Mock expo-updates
jest.mock('expo-updates', () => ({
  channel: 'production',
  updateId: 'update-123',
  runtimeVersion: '1.0.0',
  isEmbeddedLaunch: false,
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  modelName: 'iPhone 15 Pro',
  osName: 'iOS',
  osVersion: '17.0',
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeBuildVersion: '100',
  nativeApplicationVersion: '1.0.0',
}));

// =============================================================================
// Test Suite: getStringOrNull
// =============================================================================

describe('getStringOrNull', () => {
  it('returns string for valid non-empty string', () => {
    expect(getStringOrNull('hello')).toBe('hello');
  });

  it('returns null for empty string', () => {
    expect(getStringOrNull('')).toBeNull();
  });

  it('returns null for null value', () => {
    expect(getStringOrNull(null)).toBeNull();
  });

  it('returns null for undefined value', () => {
    expect(getStringOrNull(undefined)).toBeNull();
  });

  it('returns null for number value', () => {
    expect(getStringOrNull(123)).toBeNull();
  });

  it('returns null for object value', () => {
    expect(getStringOrNull({ key: 'value' })).toBeNull();
  });

  it('returns null for array value', () => {
    expect(getStringOrNull(['a', 'b'])).toBeNull();
  });

  it('returns null for boolean value', () => {
    expect(getStringOrNull(true)).toBeNull();
  });
});

// =============================================================================
// Test Suite: getBuildInfo
// =============================================================================

describe('getBuildInfo', () => {
  it('returns complete build info from mocked modules', () => {
    const buildInfo = getBuildInfo();

    expect(buildInfo.easBuildId).toBe('test-build-id');
    expect(buildInfo.easBuildProfile).toBe('production');
    expect(buildInfo.easBuildGitCommitHash).toBe('abc123');
    expect(buildInfo.easBuildRunner).toBe('eas-build');
    expect(buildInfo.updateChannel).toBe('production');
    expect(buildInfo.updateId).toBe('update-123');
    expect(buildInfo.runtimeVersion).toBe('1.0.0');
    expect(buildInfo.isEmbeddedLaunch).toBe(false);
    expect(buildInfo.deviceModel).toBe('iPhone 15 Pro');
    expect(buildInfo.osName).toBe('iOS');
    expect(buildInfo.osVersion).toBe('17.0');
    expect(buildInfo.nativeBuildVersion).toBe('100');
    expect(buildInfo.nativeAppVersion).toBe('1.0.0');
  });
});

// =============================================================================
// Test Suite: formatBuildInfoForCopy
// =============================================================================

describe('formatBuildInfoForCopy', () => {
  const baseBuildInfo: BuildInfo = {
    easBuildId: null,
    easBuildProfile: null,
    easBuildGitCommitHash: null,
    easBuildRunner: null,
    updateChannel: null,
    updateId: null,
    runtimeVersion: null,
    isEmbeddedLaunch: true,
    deviceModel: null,
    osName: null,
    osVersion: null,
    nativeBuildVersion: null,
    nativeAppVersion: null,
  };

  it('formats minimal build info correctly', () => {
    const result = formatBuildInfoForCopy(baseBuildInfo);

    expect(result).toContain('=== Sobers Build Info ===');
    expect(result).toContain('Bundle Type: Embedded');
    expect(result).toContain('Build Profile: Development');
    expect(result).toContain('Build Runner: Development');
    expect(result).toContain('Generated:');
  });

  it('includes runtime version when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      runtimeVersion: '1.0.0',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Runtime Version: 1.0.0');
  });

  it('includes update channel when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      updateChannel: 'production',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Update Channel: production');
  });

  it('includes update ID when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      updateId: 'update-456',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Update ID: update-456');
  });

  it('shows OTA Update bundle type when not embedded', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      isEmbeddedLaunch: false,
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Bundle Type: OTA Update');
  });

  it('shows EAS Cloud runner when eas-build', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      easBuildRunner: 'eas-build',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Build Runner: EAS Cloud');
  });

  it('shows Local runner when local-build-plugin', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      easBuildRunner: 'local-build-plugin',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Build Runner: Local');
  });

  it('includes git commit hash when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      easBuildGitCommitHash: 'abc123def',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Git Commit: abc123def');
  });

  it('includes EAS build ID when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      easBuildId: 'build-789',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('EAS Build ID: build-789');
  });

  it('includes build profile when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      easBuildProfile: 'preview',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Build Profile: preview');
  });

  it('includes native app version when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      nativeAppVersion: '2.0.0',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('App Version: 2.0.0');
  });

  it('includes native build version in parentheses when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      nativeAppVersion: '2.0.0',
      nativeBuildVersion: '200',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('App Version: 2.0.0 (200)');
  });

  it('includes device model when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      deviceModel: 'Pixel 7',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('Device: Pixel 7');
  });

  it('includes OS info when present', () => {
    const buildInfo: BuildInfo = {
      ...baseBuildInfo,
      osName: 'Android',
      osVersion: '14',
    };

    const result = formatBuildInfoForCopy(buildInfo);
    expect(result).toContain('OS: Android 14');
  });

  it('formats complete build info with all fields', () => {
    const completeBuildInfo: BuildInfo = {
      easBuildId: 'build-complete-123',
      easBuildProfile: 'production',
      easBuildGitCommitHash: 'deadbeef',
      easBuildRunner: 'eas-build',
      updateChannel: 'production',
      updateId: 'update-complete-456',
      runtimeVersion: '1.2.3',
      isEmbeddedLaunch: false,
      deviceModel: 'iPhone 15 Pro Max',
      osName: 'iOS',
      osVersion: '17.2',
      nativeBuildVersion: '150',
      nativeAppVersion: '1.5.0',
    };

    const result = formatBuildInfoForCopy(completeBuildInfo);

    expect(result).toContain('=== Sobers Build Info ===');
    expect(result).toContain('App Version: 1.5.0 (150)');
    expect(result).toContain('Device: iPhone 15 Pro Max');
    expect(result).toContain('OS: iOS 17.2');
    expect(result).toContain('Runtime Version: 1.2.3');
    expect(result).toContain('Update Channel: production');
    expect(result).toContain('Update ID: update-complete-456');
    expect(result).toContain('Bundle Type: OTA Update');
    expect(result).toContain('Build Profile: production');
    expect(result).toContain('Build Runner: EAS Cloud');
    expect(result).toContain('Git Commit: deadbeef');
    expect(result).toContain('EAS Build ID: build-complete-123');
  });
});
