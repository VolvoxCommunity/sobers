// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Shield,
  FileText,
  Github,
  Trash2,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Download,
  AlertCircle,
  Info,
  Copy,
  User,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { logger, LogCategory } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import packageJson from '../package.json';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Types
// =============================================================================
/**
 * Comprehensive build and runtime information for debugging.
 * Combines EAS Build env vars, expo-updates, expo-device, and expo-application data.
 */
interface BuildInfo {
  // EAS Build info (baked at build time via app.config.ts)
  /** Unique EAS Build ID (UUID format) */
  easBuildId: string | null;
  /** Build profile name (e.g., 'production', 'preview', 'development') */
  easBuildProfile: string | null;
  /** Git commit hash at build time */
  easBuildGitCommitHash: string | null;
  /** Build runner type ('eas-build' for cloud, 'local-build-plugin' for local) */
  easBuildRunner: string | null;

  // OTA Update info (from expo-updates)
  /** Current OTA update channel */
  updateChannel: string | null;
  /** Current running update ID (UUID) */
  updateId: string | null;
  /** Runtime version for update compatibility */
  runtimeVersion: string | null;
  /** Whether running the embedded bundle (not an OTA update) */
  isEmbeddedLaunch: boolean;

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

// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Safely extracts a string value from config, returning null if not a valid string.
 */
function getStringOrNull(value: unknown): string | null {
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
function getBuildInfo(): BuildInfo {
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
 * Formats all build information as a copyable string for debugging/support.
 *
 * @param buildInfo - The build info object to format
 * @returns Formatted string with all build details
 */
function formatBuildInfoForCopy(buildInfo: BuildInfo): string {
  const lines: string[] = [
    '=== Sobriety Waypoint Build Info ===',
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

// =============================================================================
// Constants
// =============================================================================
const EXTERNAL_LINKS = {
  PRIVACY_POLICY: 'https://www.volvoxdev.com/privacy',
  TERMS_OF_SERVICE: 'https://sobrietywaypoint.com/terms',
  SOURCE_CODE: 'https://github.com/VolvoxCommunity/Sobriety-Waypoint',
  DEVELOPER: 'https://billchirico.dev',
} as const;

/**
 * Width of header buttons (close button) used for layout symmetry.
 * The spacer element uses this same width to balance the header.
 */
const HEADER_BUTTON_WIDTH = 44;

// =============================================================================
// Component
// =============================================================================
/**
 * Settings screen for managing app preferences and user account.
 *
 * Provides the following functionality:
 * - Theme mode selection (light/dark/system)
 * - Access to legal documents (privacy policy, terms of service)
 * - Link to source code repository
 * - Sign out functionality
 * - Account deletion
 *
 * @returns Settings screen component with navigation header
 *
 * @example
 * ```tsx
 * // Navigated to via router.push('/settings')
 * <SettingsScreen />
 * ```
 */
export default function SettingsScreen() {
  const { signOut, deleteAccount, profile, refreshProfile } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [isBuildInfoExpanded, setIsBuildInfoExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastInitial, setEditLastInitial] = useState('');
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const buildInfo = getBuildInfo();
  const {
    status: updateStatus,
    isChecking,
    isDownloading,
    errorMessage: updateError,
    checkForUpdates,
    applyUpdate,
    isSupported: updatesSupported,
  } = useAppUpdates();
  const insets = useSafeAreaInsets();

  // Scroll position management for expand/collapse
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);

  const toggleBuildInfo = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsBuildInfoExpanded((prev) => !prev);
  }, []);

  const toggleDangerZone = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDangerZoneExpanded((prev) => !prev);
  }, []);

  /**
   * Handles user sign out with platform-specific confirmations.
   * Shows a confirmation dialog before signing out and navigating to login.
   */
  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        try {
          await signOut();
          router.replace('/login');
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error('Unknown error');
          logger.error('Sign out failed', err, {
            category: LogCategory.AUTH,
          });
          window.alert('Error signing out: ' + err.message);
        }
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error: unknown) {
              const err = error instanceof Error ? error : new Error('Unknown error');
              logger.error('Sign out failed', err, {
                category: LogCategory.AUTH,
              });
              Alert.alert('Error', 'Failed to sign out: ' + err.message);
            }
          },
        },
      ]);
    }
  };

  /**
   * Handles the account deletion flow with confirmation dialogs.
   * Shows a warning about permanent data loss and requires explicit confirmation.
   */
  const handleDeleteAccount = async () => {
    const warningMessage =
      'This will permanently delete your account and all associated data including your sobriety journey, tasks, connections, and messages. This action cannot be undone.';

    if (Platform.OS === 'web') {
      const firstConfirm = window.confirm(
        `Delete Account?\n\n${warningMessage}\n\nAre you sure you want to continue?`
      );
      if (!firstConfirm) return;

      const secondConfirm = window.confirm(
        'FINAL WARNING: This is your last chance to cancel. Click OK to permanently delete your account.'
      );
      if (!secondConfirm) return;

      setIsDeleting(true);
      try {
        await deleteAccount();
        window.alert('Your account has been deleted. We wish you well on your journey.');
        router.replace('/login');
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error('Account deletion failed in settings', err, {
          category: LogCategory.AUTH,
        });
        window.alert('Error deleting account: ' + err.message);
      } finally {
        setIsDeleting(false);
      }
    } else {
      Alert.alert('Delete Account?', warningMessage + '\n\nAre you sure you want to continue?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance to cancel. Are you absolutely sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      await deleteAccount();
                      Alert.alert(
                        'Account Deleted',
                        'Your account has been deleted. We wish you well on your journey.',
                        [
                          {
                            text: 'OK',
                            onPress: () => router.replace('/login'),
                          },
                        ]
                      );
                    } catch (error: unknown) {
                      const err =
                        error instanceof Error ? error : new Error('Unknown error occurred');
                      logger.error('Account deletion failed in settings', err, {
                        category: LogCategory.AUTH,
                      });
                      Alert.alert('Error', 'Failed to delete account: ' + err.message);
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]);
    }
  };

  /**
   * Copies text to clipboard and shows brief feedback.
   * Uses platform-appropriate clipboard API.
   */
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        await Clipboard.setStringAsync(text);
      }
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to copy');
      logger.error('Failed to copy to clipboard', err, {
        category: LogCategory.UI,
        fieldName,
      });
    }
  };

  /**
   * Safely opens an external URL with error handling.
   * Logs errors to Sentry if the URL fails to open.
   */
  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to open URL');
      logger.error('Failed to open external URL', err, {
        category: LogCategory.UI,
        url,
      });
    }
  };

  /**
   * Saves the updated name to Supabase and refreshes the profile.
   * Validates input before saving and handles errors with user feedback.
   */
  const handleSaveName = async () => {
    // Guard: Prevent multiple simultaneous saves
    if (isSavingName) {
      return;
    }

    // Guard: Ensure profile is loaded before attempting save
    if (!profile?.id) {
      const errorMessage = 'Unable to save - profile not loaded';
      logger.error('Name save attempted with null profile', new Error(errorMessage), {
        category: LogCategory.DATABASE,
      });
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
      return;
    }

    // Validation
    const trimmedFirstName = editFirstName.trim();
    const trimmedLastInitial = editLastInitial.trim();

    if (!trimmedFirstName) {
      setNameValidationError('First name is required');
      return;
    }
    if (trimmedLastInitial.length !== 1) {
      setNameValidationError('Last initial must be exactly 1 character');
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: trimmedFirstName,
          last_initial: trimmedLastInitial.toUpperCase(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditNameModalVisible(false);
      setNameValidationError(null);

      if (Platform.OS === 'web') {
        window.alert('Name updated successfully');
      } else {
        Alert.alert('Success', 'Name updated successfully');
      }
    } catch (error: unknown) {
      // Handle both Error objects and Supabase error objects with message property
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to update name';
      const err = error instanceof Error ? error : new Error(errorMessage);
      logger.error('Name update failed', err, {
        category: LogCategory.DATABASE,
      });
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsSavingName(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.outerContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerSpacer} accessibilityElementsHidden={true} />
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
          >
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 8 }]}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollPositionRef.current = e.nativeEvent.contentOffset.y;
          }}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuItem}
                testID="account-name-row"
                onPress={() => {
                  setEditFirstName(profile?.first_name ?? '');
                  setEditLastInitial(profile?.last_initial ?? '');
                  setIsEditNameModalVisible(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit your name"
              >
                <View style={styles.menuItemLeft}>
                  <User size={20} color={theme.textSecondary} />
                  <View>
                    <Text style={styles.menuItemText}>Name</Text>
                    <Text style={styles.menuItemSubtext}>
                      {profile?.first_name && profile?.last_initial
                        ? `${profile.first_name} ${profile.last_initial}.`
                        : 'Loading...'}
                    </Text>
                  </View>
                </View>
                <ChevronLeft
                  size={20}
                  color={theme.textTertiary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.card}>
              <View style={styles.themeOptions}>
                <TouchableOpacity
                  style={[styles.themeOption, themeMode === 'light' && styles.themeOptionSelected]}
                  onPress={() => setThemeMode('light')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: themeMode === 'light' }}
                  accessibilityLabel="Light theme"
                >
                  <Sun
                    size={24}
                    color={themeMode === 'light' ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      themeMode === 'light' && styles.themeOptionTextSelected,
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionSelected]}
                  onPress={() => setThemeMode('dark')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: themeMode === 'dark' }}
                  accessibilityLabel="Dark theme"
                >
                  <Moon
                    size={24}
                    color={themeMode === 'dark' ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      themeMode === 'dark' && styles.themeOptionTextSelected,
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.themeOption, themeMode === 'system' && styles.themeOptionSelected]}
                  onPress={() => setThemeMode('system')}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: themeMode === 'system' }}
                  accessibilityLabel="System theme"
                >
                  <Monitor
                    size={24}
                    color={themeMode === 'system' ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      themeMode === 'system' && styles.themeOptionTextSelected,
                    ]}
                  >
                    System
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenURL(EXTERNAL_LINKS.PRIVACY_POLICY)}
                accessibilityRole="link"
                accessibilityLabel="View Privacy Policy"
              >
                <View style={styles.menuItemLeft}>
                  <Shield size={20} color={theme.textSecondary} />
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                </View>
                <ChevronLeft
                  size={20}
                  color={theme.textTertiary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenURL(EXTERNAL_LINKS.TERMS_OF_SERVICE)}
                accessibilityRole="link"
                accessibilityLabel="View Terms of Service"
              >
                <View style={styles.menuItemLeft}>
                  <FileText size={20} color={theme.textSecondary} />
                  <Text style={styles.menuItemText}>Terms of Service</Text>
                </View>
                <ChevronLeft
                  size={20}
                  color={theme.textTertiary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
              <View style={styles.separator} />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleOpenURL(EXTERNAL_LINKS.SOURCE_CODE)}
                accessibilityRole="link"
                accessibilityLabel="View source code on GitHub"
              >
                <View style={styles.menuItemLeft}>
                  <Github size={20} color={theme.textSecondary} />
                  <Text style={styles.menuItemText}>Source Code</Text>
                </View>
                <ChevronLeft
                  size={20}
                  color={theme.textTertiary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {updatesSupported && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Updates</Text>
              <View style={styles.card}>
                <View style={styles.updateContainer}>
                  {updateStatus === 'idle' && (
                    <TouchableOpacity
                      style={styles.updateButton}
                      onPress={checkForUpdates}
                      accessibilityRole="button"
                      accessibilityLabel="Check for app updates"
                    >
                      <RefreshCw size={20} color={theme.primary} />
                      <Text style={styles.updateButtonText}>Check for Updates</Text>
                    </TouchableOpacity>
                  )}

                  {(isChecking || isDownloading) && (
                    <View style={styles.updateStatusContainer}>
                      <ActivityIndicator size="small" color={theme.primary} />
                      <Text style={styles.updateStatusText}>
                        {isChecking ? 'Checking for updates...' : 'Downloading update...'}
                      </Text>
                    </View>
                  )}

                  {updateStatus === 'up-to-date' && (
                    <View style={styles.updateStatusContainer}>
                      <CheckCircle size={20} color={theme.success} />
                      <Text style={[styles.updateStatusText, { color: theme.success }]}>
                        App is up to date
                      </Text>
                      <TouchableOpacity
                        style={styles.checkAgainButton}
                        onPress={checkForUpdates}
                        accessibilityRole="button"
                        accessibilityLabel="Check again for updates"
                      >
                        <Text style={styles.checkAgainText}>Check Again</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {updateStatus === 'ready' && (
                    <View style={styles.updateReadyContainer}>
                      <View style={styles.updateReadyInfo}>
                        <Download size={20} color={theme.primary} />
                        <Text style={styles.updateReadyText}>Update ready to install</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.applyUpdateButton}
                        onPress={applyUpdate}
                        accessibilityRole="button"
                        accessibilityLabel="Restart app to apply update"
                      >
                        <Text style={styles.applyUpdateText}>Restart to Update</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {updateStatus === 'error' && (
                    <View style={styles.updateStatusContainer}>
                      <AlertCircle size={20} color={theme.error} />
                      <Text style={[styles.updateStatusText, { color: theme.error }]}>
                        {updateError || 'Failed to check for updates'}
                      </Text>
                      <TouchableOpacity
                        style={styles.checkAgainButton}
                        onPress={checkForUpdates}
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                      >
                        <Text style={styles.checkAgainText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out of your account"
            >
              <LogOut size={20} color={theme.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.dangerZoneHeader,
                isDangerZoneExpanded && styles.dangerZoneHeaderExpanded,
              ]}
              onPress={toggleDangerZone}
              accessibilityRole="button"
              accessibilityState={{ expanded: isDangerZoneExpanded }}
              accessibilityLabel="Danger Zone section"
              accessibilityHint="Double tap to expand or collapse"
            >
              <View style={styles.dangerZoneHeaderLeft}>
                <AlertTriangle size={18} color={theme.danger} />
                <Text style={styles.dangerSectionTitle}>DANGER ZONE</Text>
              </View>
              {isDangerZoneExpanded ? (
                <ChevronUp size={20} color={theme.danger} />
              ) : (
                <ChevronDown size={20} color={theme.danger} />
              )}
            </TouchableOpacity>
            <View style={{ maxHeight: isDangerZoneExpanded ? undefined : 0, overflow: 'hidden' }}>
              <View style={styles.dangerCard}>
                <Text style={styles.dangerDescription}>
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </Text>
                <TouchableOpacity
                  style={[styles.deleteAccountButton, isDeleting && styles.buttonDisabled]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel="Delete your account permanently"
                  accessibilityState={{ disabled: isDeleting }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={theme.white} />
                  ) : (
                    <>
                      <Trash2 size={20} color={theme.white} />
                      <Text style={styles.deleteAccountText}>Delete Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.buildInfoHeader,
                isBuildInfoExpanded && styles.buildInfoHeaderExpanded,
              ]}
              onPress={toggleBuildInfo}
              accessibilityRole="button"
              accessibilityState={{ expanded: isBuildInfoExpanded }}
              accessibilityLabel="Build Information section"
              accessibilityHint="Double tap to expand or collapse"
            >
              <View style={styles.buildInfoHeaderLeft}>
                <Info size={18} color={theme.primary} />
                <Text style={styles.buildInfoSectionTitle}>BUILD INFO</Text>
              </View>
              {isBuildInfoExpanded ? (
                <ChevronUp size={20} color={theme.primary} />
              ) : (
                <ChevronDown size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
            <View style={{ maxHeight: isBuildInfoExpanded ? undefined : 0, overflow: 'hidden' }}>
              <View style={styles.buildInfoCard}>
                {/* App Version & Build Number */}
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>App Version</Text>
                  <Text style={styles.buildInfoValue}>
                    {buildInfo.nativeAppVersion ?? packageJson.version}
                    {buildInfo.nativeBuildVersion ? ` (${buildInfo.nativeBuildVersion})` : ''}
                  </Text>
                </View>
                <View style={styles.buildInfoSeparator} />

                {/* Device Info */}
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>Device</Text>
                  <Text style={styles.buildInfoValue}>{buildInfo.deviceModel ?? Platform.OS}</Text>
                </View>
                <View style={styles.buildInfoSeparator} />
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>OS</Text>
                  <Text style={styles.buildInfoValue}>
                    {buildInfo.osName ?? Platform.OS} {buildInfo.osVersion ?? Platform.Version}
                  </Text>
                </View>
                <View style={styles.buildInfoSeparator} />

                {/* Runtime Version */}
                {buildInfo.runtimeVersion != null && (
                  <>
                    <View style={styles.buildInfoRow}>
                      <Text style={styles.buildInfoLabel}>Runtime</Text>
                      <Text style={styles.buildInfoValue}>{buildInfo.runtimeVersion}</Text>
                    </View>
                    <View style={styles.buildInfoSeparator} />
                  </>
                )}

                {/* Update Channel & ID */}
                {buildInfo.updateChannel != null && (
                  <>
                    <View style={styles.buildInfoRow}>
                      <Text style={styles.buildInfoLabel}>Channel</Text>
                      <Text style={styles.buildInfoValue}>{buildInfo.updateChannel}</Text>
                    </View>
                    <View style={styles.buildInfoSeparator} />
                  </>
                )}
                {buildInfo.updateId != null && (
                  <>
                    <TouchableOpacity
                      style={styles.buildInfoRow}
                      onPress={() => copyToClipboard(buildInfo.updateId ?? '', 'updateId')}
                      accessibilityRole="button"
                      accessibilityLabel="Copy update ID"
                    >
                      <Text style={styles.buildInfoLabel}>Update ID</Text>
                      <View style={styles.buildInfoCopyRow}>
                        <Text style={styles.buildInfoValueMono}>
                          {buildInfo.updateId.slice(0, 8)}...
                        </Text>
                        {copiedField === 'updateId' ? (
                          <CheckCircle size={14} color={theme.success} />
                        ) : (
                          <Copy size={14} color={theme.textTertiary} />
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.buildInfoSeparator} />
                  </>
                )}

                {/* Build Profile & Runner */}
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>Build Profile</Text>
                  <Text style={styles.buildInfoValue}>
                    {buildInfo.easBuildProfile ?? 'Development'}
                  </Text>
                </View>
                <View style={styles.buildInfoSeparator} />
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>Build Runner</Text>
                  <Text style={styles.buildInfoValue}>
                    {buildInfo.easBuildRunner === 'eas-build'
                      ? 'EAS Cloud'
                      : buildInfo.easBuildRunner === 'local-build-plugin'
                        ? 'Local'
                        : 'Development'}
                  </Text>
                </View>

                {/* Git Commit */}
                {buildInfo.easBuildGitCommitHash != null && (
                  <>
                    <View style={styles.buildInfoSeparator} />
                    <TouchableOpacity
                      style={styles.buildInfoRow}
                      onPress={() =>
                        copyToClipboard(buildInfo.easBuildGitCommitHash ?? '', 'commit')
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Copy commit hash"
                    >
                      <Text style={styles.buildInfoLabel}>Commit</Text>
                      <View style={styles.buildInfoCopyRow}>
                        <Text style={styles.buildInfoValueMono}>
                          {buildInfo.easBuildGitCommitHash.slice(0, 7)}
                        </Text>
                        {copiedField === 'commit' ? (
                          <CheckCircle size={14} color={theme.success} />
                        ) : (
                          <Copy size={14} color={theme.textTertiary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {/* EAS Build ID */}
                {buildInfo.easBuildId != null && (
                  <>
                    <View style={styles.buildInfoSeparator} />
                    <TouchableOpacity
                      style={styles.buildInfoRow}
                      onPress={() => copyToClipboard(buildInfo.easBuildId ?? '', 'buildId')}
                      accessibilityRole="button"
                      accessibilityLabel="Copy build ID"
                    >
                      <Text style={styles.buildInfoLabel}>EAS Build ID</Text>
                      <View style={styles.buildInfoCopyRow}>
                        <Text style={styles.buildInfoValueMono}>
                          {buildInfo.easBuildId.slice(0, 8)}...
                        </Text>
                        {copiedField === 'buildId' ? (
                          <CheckCircle size={14} color={theme.success} />
                        ) : (
                          <Copy size={14} color={theme.textTertiary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </>
                )}

                {/* OTA vs Embedded indicator */}
                <View style={styles.buildInfoSeparator} />
                <View style={styles.buildInfoRow}>
                  <Text style={styles.buildInfoLabel}>Bundle</Text>
                  <Text style={styles.buildInfoValue}>
                    {buildInfo.isEmbeddedLaunch ? 'Embedded' : 'OTA Update'}
                  </Text>
                </View>

                {/* Development mode note */}
                {!buildInfo.easBuildId && !buildInfo.easBuildProfile && (
                  <Text style={styles.buildInfoNote}>
                    Running in development mode. Full build details available in production.
                  </Text>
                )}

                {/* Copy All Button */}
                <View style={styles.buildInfoSeparator} />
                <TouchableOpacity
                  style={styles.copyAllButton}
                  onPress={() => copyToClipboard(formatBuildInfoForCopy(buildInfo), 'all')}
                  accessibilityRole="button"
                  accessibilityLabel="Copy all build information to clipboard"
                >
                  {copiedField === 'all' ? (
                    <>
                      <CheckCircle size={16} color={theme.success} />
                      <Text style={[styles.copyAllText, { color: theme.success }]}>Copied!</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={16} color={theme.primary} />
                      <Text style={styles.copyAllText}>Copy All Build Info</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sobriety Waypoint v{packageJson.version}</Text>
            <Text style={styles.footerSubtext}>Supporting recovery, one day at a time</Text>
            <TouchableOpacity
              onPress={() => handleOpenURL(EXTERNAL_LINKS.DEVELOPER)}
              accessibilityRole="link"
              accessibilityLabel="Visit developer website"
            >
              <Text style={styles.footerCredit}>By Bill Chirico</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Name Modal */}
        <Modal
          visible={isEditNameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsEditNameModalVisible(false);
            setNameValidationError(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editNameModal}>
              <Text style={styles.modalTitle}>Edit Name</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  testID="edit-first-name-input"
                  style={styles.textInput}
                  value={editFirstName}
                  onChangeText={(text) => {
                    setEditFirstName(text);
                    setNameValidationError(null);
                  }}
                  placeholder="Enter first name"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Initial</Text>
                <TextInput
                  testID="edit-last-initial-input"
                  style={styles.textInput}
                  value={editLastInitial}
                  onChangeText={(text) => {
                    setEditLastInitial(text.toUpperCase().slice(0, 1));
                    setNameValidationError(null);
                  }}
                  placeholder="Enter last initial"
                  placeholderTextColor={theme.textTertiary}
                  maxLength={1}
                  autoCapitalize="characters"
                />
              </View>

              {nameValidationError && (
                <Text style={styles.validationError}>{nameValidationError}</Text>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  testID="cancel-name-button"
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setIsEditNameModalVisible(false);
                    setNameValidationError(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="save-name-button"
                  style={[styles.modalSaveButton, isSavingName && styles.buttonDisabled]}
                  onPress={handleSaveName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color={theme.white} />
                  ) : (
                    <Text style={styles.modalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
/**
 * Creates StyleSheet for the Settings screen based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerSpacer: {
      width: HEADER_BUTTON_WIDTH,
    },
    closeButton: {
      width: HEADER_BUTTON_WIDTH,
      height: HEADER_BUTTON_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    themeOptions: {
      flexDirection: 'row',
      padding: 12,
      gap: 10,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.card,
    },
    themeOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    themeOptionText: {
      marginTop: 8,
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    themeOptionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.card,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuItemText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    menuItemSubtext: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    separator: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: 48,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.dangerLight,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
    },
    signOutText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
      marginLeft: 8,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    footerText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      fontWeight: '600',
    },
    footerSubtext: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 4,
    },
    footerCredit: {
      fontSize: 11,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 12,
      fontStyle: 'italic',
      opacity: 0.7,
    },
    dangerZoneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.dangerLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
    },
    dangerZoneHeaderExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    dangerZoneHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dangerSectionTitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dangerCard: {
      backgroundColor: theme.dangerLight,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      padding: 16,
      paddingTop: 12,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.dangerBorder,
      marginTop: -1,
    },
    dangerDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      marginBottom: 16,
      lineHeight: 20,
    },
    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.danger,
      padding: 14,
      borderRadius: 12,
      gap: 8,
    },
    deleteAccountText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    updateContainer: {
      padding: 16,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
      gap: 10,
    },
    updateButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    updateStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10,
      padding: 8,
    },
    updateStatusText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    checkAgainButton: {
      marginLeft: 8,
    },
    checkAgainText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
      textDecorationLine: 'underline',
    },
    updateReadyContainer: {
      alignItems: 'center',
      gap: 12,
    },
    updateReadyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    updateReadyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.text,
    },
    applyUpdateButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    applyUpdateText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    buildInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.primaryLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.primary + '30',
    },
    buildInfoHeaderExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    buildInfoHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    buildInfoSectionTitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    buildInfoCard: {
      backgroundColor: theme.card,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      padding: 16,
      paddingTop: 12,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.borderLight,
      marginTop: -1,
    },
    buildInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    buildInfoLabel: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    buildInfoValue: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.text,
    },
    buildInfoValueMono: {
      fontSize: 13,
      fontFamily: 'JetBrainsMono-Regular',
      color: theme.text,
    },
    buildInfoCopyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    buildInfoSeparator: {
      height: 1,
      backgroundColor: theme.borderLight,
    },
    buildInfoNote: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
    },
    copyAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      marginTop: 8,
      backgroundColor: theme.primaryLight,
      borderRadius: 8,
    },
    copyAllText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    editNameModal: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    validationError: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalCancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    modalSaveButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
  });
