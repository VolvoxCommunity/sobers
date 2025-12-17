// =============================================================================
// Imports
// =============================================================================
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import type { BuildInfo } from './types';
import packageJson from '../../package.json';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely extracts a string value from config, returning null if not a valid string.
 *
 * @param value - The value to validate as a non-empty string
 * @returns The original string when `value` is a non-empty string, `null` otherwise
 */
export function getStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

/**
 * Retrieves comprehensive build information from multiple Expo APIs.
 * Combines EAS Build env vars, expo-updates, expo-device, and expo-application.
 *
 * @returns BuildInfo object with full debugging details (null values indicate local dev)
 */
export function getBuildInfo(): BuildInfo {
  const extra = Constants.expoConfig?.extra;

  return {
    // EAS Build info (from app.config.ts extra field)
    easBuildId: getStringOrNull(extra?.easBuildId),
    easBuildProfile: getStringOrNull(extra?.easBuildProfile),
    easBuildGitCommitHash: getStringOrNull(extra?.easBuildGitCommitHash),
    easBuildRunner: getStringOrNull(extra?.easBuildRunner),

    // OTA Update info (from expo-updates)
    updateChannel: getStringOrNull(Updates.channel),
    updateId: getStringOrNull(Updates.updateId),
    runtimeVersion: getStringOrNull(Updates.runtimeVersion),
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,

    // Device info (from expo-device)
    deviceModel: getStringOrNull(Device.modelName),
    osName: getStringOrNull(Device.osName),
    osVersion: getStringOrNull(Device.osVersion),

    // Application info (from expo-application)
    nativeBuildVersion: getStringOrNull(Application.nativeBuildVersion),
    nativeAppVersion: getStringOrNull(Application.nativeApplicationVersion),
  };
}

/**
 * Format build and environment information into a human-readable string suitable for copying to support or logs.
 *
 * @param buildInfo - Aggregated build metadata and environment details
 * @returns A newline-separated string containing labeled app version, device, OS, update, and build system details
 */
export function formatBuildInfoForCopy(buildInfo: BuildInfo): string {
  const lines: string[] = [
    '=== Sobers Build Info ===',
    '',
    `App Version: ${buildInfo.nativeAppVersion ?? packageJson.version}${buildInfo.nativeBuildVersion ? ` (${buildInfo.nativeBuildVersion})` : ''}`,
    `Device: ${buildInfo.deviceModel ?? Platform.OS}`,
    `OS: ${buildInfo.osName ?? Platform.OS} ${buildInfo.osVersion ?? Platform.Version}`,
    '',
  ];

  if (buildInfo.runtimeVersion) {
    lines.push(`Runtime Version: ${buildInfo.runtimeVersion}`);
  }
  if (buildInfo.updateChannel) {
    lines.push(`Update Channel: ${buildInfo.updateChannel}`);
  }
  if (buildInfo.updateId) {
    lines.push(`Update ID: ${buildInfo.updateId}`);
  }
  lines.push(`Bundle Type: ${buildInfo.isEmbeddedLaunch ? 'Embedded' : 'OTA Update'}`);
  lines.push('');

  lines.push(`Build Profile: ${buildInfo.easBuildProfile ?? 'Development'}`);
  lines.push(
    `Build Runner: ${
      buildInfo.easBuildRunner === 'eas-build'
        ? 'EAS Cloud'
        : buildInfo.easBuildRunner === 'local-build-plugin'
          ? 'Local'
          : 'Development'
    }`
  );

  if (buildInfo.easBuildGitCommitHash) {
    lines.push(`Git Commit: ${buildInfo.easBuildGitCommitHash}`);
  }
  if (buildInfo.easBuildId) {
    lines.push(`EAS Build ID: ${buildInfo.easBuildId}`);
  }

  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);

  return lines.join('\n');
}
