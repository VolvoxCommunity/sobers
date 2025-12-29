// =============================================================================
// Types
// =============================================================================

/**
 * Comprehensive build and runtime information for debugging.
 * Combines EAS Build env vars, expo-device, and expo-application data.
 */
export interface BuildInfo {
  // EAS Build info (baked at build time via app.config.ts)
  /** Unique EAS Build ID (UUID format) */
  easBuildId: string | null;
  /** Build profile name (e.g., 'production', 'preview', 'development') */
  easBuildProfile: string | null;
  /** Git commit hash at build time */
  easBuildGitCommitHash: string | null;
  /** Build runner type ('eas-build' for cloud, 'local-build-plugin' for local) */
  easBuildRunner: string | null;

  // Device info (from expo-device)
  /** Device model name (e.g., "iPhone 15 Pro", "Pixel 8") */
  deviceModel: string | null;
  /** Operating system name */
  osName: string | null;
  /** Operating system version */
  osVersion: string | null;

  // Application info (from expo-application)
  /** Native build number (increments with each store submission) */
  nativeBuildVersion: string | null;
  /** App version shown in app stores */
  nativeAppVersion: string | null;
}

/**
 * Props for SettingsContent component.
 */
export interface SettingsContentProps {
  /**
   * Callback invoked when the user confirms sign out or account deletion.
   * Used to dismiss the parent container (modal, sheet, etc.) before the action.
   */
  onDismiss?: () => void;
}
