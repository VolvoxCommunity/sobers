// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Shield,
  FileText,
  Github,
  Trash2,
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
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { logger, LogCategory } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { validateDisplayName } from '@/lib/validation';
import { hexWithAlpha } from '@/lib/format';
import { showAlert, showConfirm } from '@/lib/alert';
import packageJson from '../../package.json';

import type { SettingsContentProps } from './types';
import { EXTERNAL_LINKS, noop } from './constants';
import { getBuildInfo, formatBuildInfoForCopy } from './utils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Component
// =============================================================================

/**
 * Shared settings UI content used by both the bottom sheet and full-screen route.
 *
 * Contains all settings sections:
 * - Account (display name editing)
 * - Appearance (theme selection)
 * - About (external links)
 * - App Updates (OTA update management)
 * - Sign Out
 * - Danger Zone (account deletion)
 * - Build Info (debugging information)
 *
 * @param props - Component props
 * @param props.onDismiss - Callback to dismiss the parent container before auth actions
 *
 * @example
 * ```tsx
 * // In a bottom sheet
 * <SettingsContent onDismiss={() => sheetRef.current?.dismiss()} />
 *
 * // In a full-screen page
 * <SettingsContent onDismiss={() => router.back()} />
 * ```
 */
export function SettingsContent({ onDismiss }: SettingsContentProps) {
  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const { signOut, deleteAccount, profile, refreshProfile } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);
  const [isBuildInfoExpanded, setIsBuildInfoExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
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

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
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
   * Shows a confirmation dialog before signing out.
   *
   * Note: We dismiss the container first, then sign out. The root layout's auth guard
   * automatically redirects to /login when user becomes null.
   */
  const handleSignOut = async () => {
    const confirmed = await showConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      'Sign Out',
      'Cancel',
      true // destructive
    );

    if (confirmed) {
      try {
        // Dismiss container first, then sign out
        // Auth guard in _layout.tsx handles redirect to /login
        onDismiss?.();
        await signOut();
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Sign out failed', err, {
          category: LogCategory.AUTH,
        });
        showAlert('Error', 'Failed to sign out: ' + err.message);
      }
    }
  };

  /**
   * Handles the account deletion flow with confirmation dialogs.
   * Shows a warning about permanent data loss and requires explicit confirmation.
   */
  const handleDeleteAccount = async () => {
    const warningMessage =
      'This will permanently delete your account and all associated data including your sobriety journey, tasks, connections, and messages. This action cannot be undone.';

    const firstConfirm = await showConfirm(
      'Delete Account?',
      warningMessage + '\n\nAre you sure you want to continue?',
      'Delete Account',
      'Cancel',
      true // destructive
    );

    if (!firstConfirm) return;

    const secondConfirm = await showConfirm(
      'Final Confirmation',
      'This is your last chance to cancel. Are you absolutely sure you want to permanently delete your account?',
      'Yes, Delete My Account',
      'Cancel',
      true // destructive
    );

    if (!secondConfirm) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
      // Show success message before dismiss to ensure user sees it
      showAlert(
        'Account Deleted',
        'Your account has been deleted. We wish you well on your journey.'
      );
      // Dismiss after alert to ensure user sees confirmation
      // Auth guard in _layout.tsx handles redirect to /login
      onDismiss?.();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      logger.error('Account deletion failed in settings', err, {
        category: LogCategory.AUTH,
      });
      showAlert('Error', 'Failed to delete account: ' + err.message);
    } finally {
      setIsDeleting(false);
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
   * Saves the updated display name to Supabase and refreshes the profile.
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
      showAlert('Error', errorMessage);
      return;
    }

    // Validation using shared validation function
    const validationError = validateDisplayName(editDisplayName);
    if (validationError) {
      setNameValidationError(validationError);
      return;
    }

    setIsSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editDisplayName.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditNameModalVisible(false);
      setNameValidationError(null);

      showAlert('Success', 'Display name updated successfully');
    } catch (error: unknown) {
      // Handle both Error objects and Supabase error objects with message property
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to update display name';
      const err = error instanceof Error ? error : new Error(errorMessage);
      logger.error('Display name update failed', err, {
        category: LogCategory.DATABASE,
      });
      showAlert('Error', errorMessage);
    } finally {
      setIsSavingName(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.menuItem}
            testID="account-name-row"
            onPress={() => {
              // Guard: Prevent opening modal with empty fields when profile hasn't loaded
              if (!profile?.display_name) {
                return;
              }
              setEditDisplayName(profile.display_name);
              setIsEditNameModalVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit your display name"
          >
            <View style={styles.menuItemLeft}>
              <User size={20} color={theme.textSecondary} />
              <View>
                <Text style={styles.menuItemText}>Display Name</Text>
                <Text style={styles.menuItemSubtext}>{profile?.display_name ?? 'Loading...'}</Text>
              </View>
            </View>
            <ChevronLeft
              size={20}
              color={theme.textTertiary}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View testID="settings-theme-toggle" style={styles.themeOptions}>
            <Pressable
              style={[styles.themeOption, themeMode === 'light' && styles.themeOptionSelected]}
              onPress={() => setThemeMode('light')}
              accessibilityRole="radio"
              accessibilityState={{ checked: themeMode === 'light' }}
              accessibilityLabel="Light theme"
            >
              <Sun
                key={`sun-${themeMode}`}
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
            </Pressable>

            <Pressable
              style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionSelected]}
              onPress={() => setThemeMode('dark')}
              accessibilityRole="radio"
              accessibilityState={{ checked: themeMode === 'dark' }}
              accessibilityLabel="Dark theme"
            >
              <Moon
                key={`moon-${themeMode}`}
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
            </Pressable>

            <Pressable
              style={[styles.themeOption, themeMode === 'system' && styles.themeOptionSelected]}
              onPress={() => setThemeMode('system')}
              accessibilityRole="radio"
              accessibilityState={{ checked: themeMode === 'system' }}
              accessibilityLabel="System theme"
            >
              <Monitor
                key={`monitor-${themeMode}`}
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
            </Pressable>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <Pressable
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
          </Pressable>
          <View style={styles.separator} />
          <Pressable
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
          </Pressable>
          <View style={styles.separator} />
          <Pressable
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
          </Pressable>
        </View>
      </View>

      {/* App Updates Section */}
      {updatesSupported && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Updates</Text>
          <View style={styles.card}>
            <View style={styles.updateContainer}>
              {updateStatus === 'idle' && (
                <Pressable
                  style={styles.updateButton}
                  onPress={checkForUpdates}
                  accessibilityRole="button"
                  accessibilityLabel="Check for app updates"
                >
                  <RefreshCw size={20} color={theme.primary} />
                  <Text style={styles.updateButtonText}>Check for Updates</Text>
                </Pressable>
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
                  <Pressable
                    style={styles.checkAgainButton}
                    onPress={checkForUpdates}
                    accessibilityRole="button"
                    accessibilityLabel="Check again for updates"
                  >
                    <Text style={styles.checkAgainText}>Check Again</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'ready' && (
                <View style={styles.updateReadyContainer}>
                  <View style={styles.updateReadyInfo}>
                    <Download size={20} color={theme.primary} />
                    <Text style={styles.updateReadyText}>Update ready to install</Text>
                  </View>
                  <Pressable
                    style={styles.applyUpdateButton}
                    onPress={applyUpdate}
                    accessibilityRole="button"
                    accessibilityLabel="Restart app to apply update"
                  >
                    <Text style={styles.applyUpdateText}>Restart to Update</Text>
                  </Pressable>
                </View>
              )}

              {updateStatus === 'error' && (
                <View style={styles.updateStatusContainer}>
                  <AlertCircle size={20} color={theme.error} />
                  <Text style={[styles.updateStatusText, { color: theme.error }]}>
                    {updateError || 'Failed to check for updates'}
                  </Text>
                  <Pressable
                    style={styles.checkAgainButton}
                    onPress={checkForUpdates}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                  >
                    <Text style={styles.checkAgainText}>Try Again</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Sign Out Section */}
      <View style={styles.section}>
        <Pressable
          testID="settings-signout-button"
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
        >
          <LogOut size={20} color={theme.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Danger Zone Section */}
      <View style={styles.section}>
        <Pressable
          style={[styles.dangerZoneHeader, isDangerZoneExpanded && styles.dangerZoneHeaderExpanded]}
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
        </Pressable>
        <View style={{ maxHeight: isDangerZoneExpanded ? undefined : 0, overflow: 'hidden' }}>
          <View style={styles.dangerCard}>
            <Text style={styles.dangerDescription}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Text>
            <Pressable
              testID="settings-delete-account-button"
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
            </Pressable>
          </View>
        </View>
      </View>

      {/* Build Info Section */}
      <View style={styles.section}>
        <Pressable
          style={[styles.buildInfoHeader, isBuildInfoExpanded && styles.buildInfoHeaderExpanded]}
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
        </Pressable>
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
                <Pressable
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
                </Pressable>
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
                <Pressable
                  style={styles.buildInfoRow}
                  onPress={() => copyToClipboard(buildInfo.easBuildGitCommitHash ?? '', 'commit')}
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
                </Pressable>
              </>
            )}

            {/* EAS Build ID */}
            {buildInfo.easBuildId != null && (
              <>
                <View style={styles.buildInfoSeparator} />
                <Pressable
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
                </Pressable>
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
            <Pressable
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
            </Pressable>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sobers v{packageJson.version}</Text>
        <Text style={styles.footerSubtext}>Supporting recovery, one day at a time</Text>
        <Pressable
          onPress={() => handleOpenURL(EXTERNAL_LINKS.DEVELOPER)}
          accessibilityRole="link"
          accessibilityLabel="Visit developer website"
        >
          <Text style={styles.footerCredit}>By Bill Chirico</Text>
        </Pressable>
      </View>

      {/* Edit Display Name Modal */}
      <Modal
        visible={isEditNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsEditNameModalVisible(false);
          setNameValidationError(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setIsEditNameModalVisible(false);
            setNameValidationError(null);
          }}
        >
          <Pressable style={styles.editNameModal} onPress={noop}>
            {/* noop handler prevents tap propagation to backdrop */}
            <Text style={styles.modalTitle}>Edit Display Name</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                testID="edit-display-name-input"
                style={styles.textInput}
                value={editDisplayName}
                onChangeText={(text) => {
                  setEditDisplayName(text);
                  setNameValidationError(null);
                }}
                placeholder="How you'll appear to others"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="words"
                maxLength={30}
              />
              <Text
                style={[
                  styles.characterCount,
                  editDisplayName.length >= 25 && styles.characterCountWarning,
                ]}
              >
                {editDisplayName.length}/30 characters
              </Text>
            </View>

            {nameValidationError && (
              <Text style={styles.validationError}>{nameValidationError}</Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                testID="cancel-name-button"
                style={styles.modalCancelButton}
                onPress={() => {
                  setIsEditNameModalVisible(false);
                  setNameValidationError(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cancel name editing"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="save-name-button"
                style={[styles.modalSaveButton, isSavingName && styles.buttonDisabled]}
                onPress={handleSaveName}
                disabled={isSavingName}
                accessibilityRole="button"
                accessibilityLabel="Save display name"
                accessibilityState={{ busy: isSavingName, disabled: isSavingName }}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the Settings content based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
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
      borderColor: hexWithAlpha(theme.primary, 0.19),
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
    characterCount: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 6,
      textAlign: 'right',
    },
    characterCountWarning: {
      color: theme.warning,
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

// =============================================================================
// Exports
// =============================================================================
export default SettingsContent;
