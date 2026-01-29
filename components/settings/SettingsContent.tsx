// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDevTools } from '@/contexts/DevToolsContext';
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Github,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Copy,
  User,
  Bell,
  Bug,
  Terminal,
  Clock,
  BarChart2,
  RotateCcw,
  Zap,
  Layout,
  Sparkles,
  Calendar,
  BookOpen,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { logger, LogCategory } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { formatDateWithTimezone, parseDateAsLocal, getUserTimezone } from '@/lib/date';
import { captureSentryException } from '@/lib/sentry';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { validateDisplayName } from '@/lib/validation';
import { hexWithAlpha } from '@/lib/format';
import { showConfirm } from '@/lib/alert';
import { showToast } from '@/lib/toast';
import { useWhatsNew } from '@/lib/whats-new';
import { WhatsNewSheet, type WhatsNewSheetRef } from '@/components/whats-new';
import packageJson from '../../package.json';

import type { SettingsContentProps } from './types';
import { EXTERNAL_LINKS, noop } from './constants';
import { getBuildInfo, formatBuildInfoForCopy } from './utils';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Developer Tools Section (DEV only)
// =============================================================================

interface DevToolsSectionProps {
  theme: ReturnType<typeof useTheme>['theme'];
  styles: ReturnType<typeof createStyles>;
  profile: ReturnType<typeof useAuth>['profile'];
  refreshProfile: ReturnType<typeof useAuth>['refreshProfile'];
}

/**
 * Renders a Developer Tools section exposing debug utilities for testing toasts, error reporting, analytics, and test data manipulation.
 *
 * Includes controls for triggering test toasts, sending a test Sentry error, firing a test analytics event, copying the current user ID, resetting onboarding, clearing slip-ups, adjusting a time-travel offset (days), and toggles for verbose logging and analytics debug.
 *
 * @param props - DevToolsSectionProps containing theme, styles, profile, and refreshProfile used to render controls and perform actions
 */
function DevToolsSection({ theme, styles, profile, refreshProfile }: DevToolsSectionProps) {
  const router = useRouter();
  const {
    verboseLogging,
    setVerboseLogging,
    timeTravelDays,
    setTimeTravelDays,
    analyticsDebug,
    setAnalyticsDebug,
  } = useDevTools();

  const [timeTravelInput, setTimeTravelInput] = useState(timeTravelDays.toString());

  // Handle test Sentry error
  const handleTestSentryError = useCallback(() => {
    const testError = new Error('Test Sentry Error from Developer Tools');
    captureSentryException(testError, { source: 'dev_tools', test: true });
    showToast.success('Test error sent to Sentry');
    logger.info('Test Sentry error triggered', { category: LogCategory.ERROR });
  }, []);

  // Handle copy user ID
  const handleCopyUserId = useCallback(async () => {
    if (profile?.id) {
      await Clipboard.setStringAsync(profile.id);
      showToast.success('User ID copied to clipboard');
    } else {
      showToast.error('No user ID available');
    }
  }, [profile?.id]);

  // Handle reset onboarding
  const handleResetOnboarding = useCallback(async () => {
    if (!profile?.id) {
      showToast.error('No profile to reset');
      return;
    }

    const confirmed = await showConfirm(
      'Reset Onboarding',
      'This will clear your profile data and redirect you to onboarding. Continue?',
      'Reset',
      'Cancel',
      true
    );

    if (confirmed) {
      try {
        // Clear the onboarding-related fields to make the profile "incomplete"
        // This triggers the onboarding redirect without deleting the profile
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: null,
            sobriety_date: null,
          })
          .eq('id', profile.id);

        if (error) throw error;

        showToast.success('Profile reset. Redirecting to onboarding...');
        logger.info('Profile reset via dev tools', { category: LogCategory.AUTH });

        // Refresh profile state and navigate to onboarding
        await refreshProfile();
        router.replace('/onboarding');
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        showToast.error('Failed to reset profile');
        logger.error('Failed to reset profile', err, { category: LogCategory.AUTH });
      }
    }
  }, [profile?.id, refreshProfile, router]);

  // Handle time travel
  const handleApplyTimeTravel = useCallback(() => {
    const days = parseInt(timeTravelInput, 10);
    if (!isNaN(days)) {
      setTimeTravelDays(days);
      if (days === 0) {
        showToast.info('Time travel disabled');
      } else {
        showToast.success(`Time traveling ${days > 0 ? '+' : ''}${days} days`);
      }
    }
  }, [timeTravelInput, setTimeTravelDays]);

  // Handle fire test event
  const handleFireTestEvent = useCallback(() => {
    trackEvent('dev_tools_test_event', {
      timestamp: new Date().toISOString(),
      source: 'developer_tools',
    });
    showToast.success('Test analytics event fired');
    logger.info('Test analytics event fired', { category: LogCategory.ANALYTICS });
  }, []);

  // Handle clear slip-ups
  const handleClearSlipUps = useCallback(async () => {
    if (!profile?.id) {
      showToast.error('No profile found');
      return;
    }

    const confirmed = await showConfirm(
      'Clear Slip-Ups',
      'This will delete all slip-up records. Your sobriety streak will reset to your original sobriety date. Continue?',
      'Clear',
      'Cancel',
      true
    );

    if (confirmed) {
      try {
        const { error } = await supabase.from('slip_ups').delete().eq('user_id', profile.id);

        if (error) throw error;

        showToast.success('All slip-ups cleared');
        logger.info('Slip-ups cleared via dev tools', { category: LogCategory.DATABASE });

        // Refresh profile to update any dependent state
        await refreshProfile();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        showToast.error('Failed to clear slip-ups');
        logger.error('Failed to clear slip-ups', err, { category: LogCategory.DATABASE });
      }
    }
  }, [profile?.id, refreshProfile]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Developer Tools</Text>
      <View style={styles.card}>
        {/* Toast Testing */}
        <View style={styles.devToolsContainer}>
          <Text style={styles.devToolsDescription}>Test toast notifications</Text>
          <View style={styles.toastButtonsRow}>
            <Pressable
              style={[styles.toastButton, styles.toastButtonSuccess]}
              onPress={() => showToast.success('Success! This is a test message.')}
              accessibilityRole="button"
              accessibilityLabel="Test success toast"
              testID="test-toast-success"
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.toastButtonText}>Success</Text>
            </Pressable>
            <Pressable
              style={[styles.toastButton, styles.toastButtonError]}
              onPress={() => showToast.error('Error! Something went wrong.')}
              accessibilityRole="button"
              accessibilityLabel="Test error toast"
              testID="test-toast-error"
            >
              <AlertCircle size={18} color="#fff" />
              <Text style={styles.toastButtonText}>Error</Text>
            </Pressable>
            <Pressable
              style={[styles.toastButton, styles.toastButtonInfo]}
              onPress={() => showToast.info('Info: Here is some information.')}
              accessibilityRole="button"
              accessibilityLabel="Test info toast"
              testID="test-toast-info"
            >
              <Bell size={18} color="#fff" />
              <Text style={styles.toastButtonText}>Info</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.separator} />

        {/* Error & Logging */}
        <Pressable
          style={styles.menuItem}
          onPress={handleTestSentryError}
          accessibilityRole="button"
          testID="test-sentry-error"
        >
          <View style={styles.menuItemLeft}>
            <Bug size={20} color={theme.error} />
            <Text style={styles.menuItemText}>Test Sentry Error</Text>
          </View>
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={styles.menuItem}
          onPress={() => setVerboseLogging(!verboseLogging)}
          accessibilityRole="switch"
          accessibilityState={{ checked: verboseLogging }}
          testID="toggle-verbose-logging"
        >
          <View style={styles.menuItemLeft}>
            <Terminal size={20} color={theme.text} />
            <Text style={styles.menuItemText}>Verbose Logging</Text>
          </View>
          <View style={[styles.toggle, verboseLogging && styles.toggleActive]}>
            <Text style={styles.toggleText}>{verboseLogging ? 'ON' : 'OFF'}</Text>
          </View>
        </Pressable>

        <View style={styles.separator} />

        {/* User & Data */}
        <Pressable
          style={styles.menuItem}
          onPress={handleCopyUserId}
          accessibilityRole="button"
          testID="copy-user-id"
        >
          <View style={styles.menuItemLeft}>
            <Copy size={20} color={theme.text} />
            <View>
              <Text style={styles.menuItemText}>Copy User ID</Text>
              {profile?.id && (
                <Text style={styles.menuItemSubtext}>{profile.id.substring(0, 8)}...</Text>
              )}
            </View>
          </View>
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={styles.menuItem}
          onPress={handleResetOnboarding}
          accessibilityRole="button"
          testID="reset-onboarding"
        >
          <View style={styles.menuItemLeft}>
            <RotateCcw size={20} color={theme.error} />
            <Text style={styles.menuItemText}>Reset Onboarding</Text>
          </View>
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={styles.menuItem}
          onPress={handleClearSlipUps}
          accessibilityRole="button"
          testID="clear-slip-ups"
        >
          <View style={styles.menuItemLeft}>
            <Trash2 size={20} color={theme.warning} />
            <Text style={styles.menuItemText}>Clear Slip-Ups</Text>
          </View>
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        {/* Time Travel */}
        <View style={styles.devToolsContainer}>
          <View style={styles.menuItemLeft}>
            <Clock size={20} color={theme.primary} />
            <Text style={styles.menuItemText}>Time Travel (days)</Text>
          </View>
          <View style={styles.timeTravelRow}>
            <TextInput
              style={styles.timeTravelInput}
              value={timeTravelInput}
              onChangeText={setTimeTravelInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              testID="time-travel-input"
            />
            <Pressable
              style={styles.timeTravelButton}
              onPress={handleApplyTimeTravel}
              accessibilityRole="button"
              testID="apply-time-travel"
            >
              <Text style={styles.timeTravelButtonText}>Apply</Text>
            </Pressable>
            {timeTravelDays !== 0 && (
              <Pressable
                style={[styles.timeTravelButton, styles.timeTravelResetButton]}
                onPress={() => {
                  setTimeTravelInput('0');
                  setTimeTravelDays(0);
                  showToast.info('Time travel reset');
                }}
                accessibilityRole="button"
                testID="reset-time-travel"
              >
                <Text style={styles.timeTravelButtonText}>Reset</Text>
              </Pressable>
            )}
          </View>
          {timeTravelDays !== 0 && (
            <Text style={styles.timeTravelStatus}>
              Currently: {timeTravelDays > 0 ? '+' : ''}
              {timeTravelDays} days
            </Text>
          )}
        </View>

        <View style={styles.separator} />

        {/* Analytics */}
        <Pressable
          style={styles.menuItem}
          onPress={handleFireTestEvent}
          accessibilityRole="button"
          testID="fire-test-event"
        >
          <View style={styles.menuItemLeft}>
            <Zap size={20} color={theme.warning} />
            <Text style={styles.menuItemText}>Fire Test Analytics Event</Text>
          </View>
          <ChevronRight size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.separator} />

        <Pressable
          style={styles.menuItem}
          onPress={() => {
            setAnalyticsDebug(!analyticsDebug);
            showToast.info(analyticsDebug ? 'Analytics debug disabled' : 'Analytics debug enabled');
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: analyticsDebug }}
          testID="toggle-analytics-debug"
        >
          <View style={styles.menuItemLeft}>
            <BarChart2 size={20} color={theme.text} />
            <Text style={styles.menuItemText}>Analytics Debug</Text>
          </View>
          <View style={[styles.toggle, analyticsDebug && styles.toggleActive]}>
            <Text style={styles.toggleText}>{analyticsDebug ? 'ON' : 'OFF'}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Shared settings UI content used by both the bottom sheet and full-screen route.
 *
 * Contains all settings sections:
 * - Your Journey (display name and sobriety start date editing)
 * - Appearance (theme selection)
 * - Features (12-step content toggle, savings card visibility)
 * - About (external links)
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
  const whatsNewRef = useRef<WhatsNewSheetRef>(null);
  const { releases } = useWhatsNew();

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
  const [isSavingDashboard, setIsSavingDashboard] = useState(false);
  const [isSavingTwelveStep, setIsSavingTwelveStep] = useState(false);
  const [showSobrietyDatePicker, setShowSobrietyDatePicker] = useState(false);
  const [selectedSobrietyDate, setSelectedSobrietyDate] = useState<Date>(new Date());
  const buildInfo = getBuildInfo();

  // User's timezone (stored in profile) with device timezone as fallback
  const userTimezone = getUserTimezone(profile);

  // Stable maximum date for DateTimePicker to prevent iOS crash when value > maximumDate.
  const maximumDate = useMemo(() => new Date(), []);

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
        showToast.error('Failed to sign out: ' + err.message);
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
      showToast.success('Your account has been deleted. We wish you well on your journey.');
      // Dismiss after alert to ensure user sees confirmation
      // Auth guard in _layout.tsx handles redirect to /login
      onDismiss?.();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      logger.error('Account deletion failed in settings', err, {
        category: LogCategory.AUTH,
      });
      showToast.error('Failed to delete account: ' + err.message);
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
      showToast.error(errorMessage);
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

      showToast.success('Display name updated successfully');
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
      showToast.error(errorMessage);
    } finally {
      setIsSavingName(false);
    }
  };

  /**
   * Handles toggling the savings card visibility.
   * Updates profile in Supabase and refreshes profile state.
   */
  const handleToggleSavingsCard = useCallback(async () => {
    if (!profile?.id || isSavingDashboard) return;

    setIsSavingDashboard(true);
    try {
      const newValue = !profile.hide_savings_card;
      const { error } = await supabase
        .from('profiles')
        .update({ hide_savings_card: newValue })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

      // Track settings change
      trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
        setting: 'show_savings_card',
        value: !newValue, // newValue is hide_savings_card, so invert for show
      });

      showToast.success(newValue ? 'Savings card hidden' : 'Savings card visible');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update setting');
      logger.error('Failed to toggle savings card visibility', err, {
        category: LogCategory.DATABASE,
      });
      showToast.error('Failed to update. Please try again.');
    } finally {
      setIsSavingDashboard(false);
    }
  }, [profile?.id, profile?.hide_savings_card, isSavingDashboard, refreshProfile]);

  /**
   * Handles toggling the 12-step content visibility.
   * Updates profile in Supabase and refreshes profile state.
   */
  const handleToggleTwelveStepContent = useCallback(async () => {
    if (!profile?.id || isSavingTwelveStep) return;

    setIsSavingTwelveStep(true);
    try {
      const currentValue = profile.show_program_content !== false;
      const newValue = !currentValue;
      const { error } = await supabase
        .from('profiles')
        .update({ show_program_content: newValue })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

      // Track settings change
      trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
        setting: 'show_program_content',
        value: newValue,
      });

      showToast.success(newValue ? '12-step content enabled' : '12-step content hidden');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update setting');
      logger.error('Failed to toggle 12-step content visibility', err, {
        category: LogCategory.DATABASE,
      });
      showToast.error('Failed to update. Please try again.');
    } finally {
      setIsSavingTwelveStep(false);
    }
  }, [profile?.id, profile?.show_program_content, isSavingTwelveStep, refreshProfile]);

  /**
   * Opens the sobriety date picker with the current sobriety date pre-selected.
   */
  const handleEditSobrietyDate = useCallback(() => {
    if (profile?.sobriety_date) {
      // Parse using the user's stored timezone to maintain consistency
      const parsedDate = parseDateAsLocal(profile.sobriety_date, userTimezone);
      // Clamp to maximumDate to prevent iOS DateTimePicker crash
      setSelectedSobrietyDate(parsedDate > maximumDate ? maximumDate : parsedDate);
    }
    setShowSobrietyDatePicker(true);
  }, [profile?.sobriety_date, userTimezone, maximumDate]);

  /**
   * Updates the sobriety date in the database after confirmation.
   */
  const updateSobrietyDate = useCallback(
    async (newDate: Date) => {
      if (!profile) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(newDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        showToast.error('Sobriety date cannot be in the future');
        return;
      }

      const confirmMessage = `Update your sobriety date to ${newDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}?`;

      const confirmed = await showConfirm(
        'Confirm Date Change',
        confirmMessage,
        'Update',
        'Cancel'
      );

      if (!confirmed) return;

      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            sobriety_date: formatDateWithTimezone(newDate, userTimezone),
          })
          .eq('id', profile.id);

        if (error) throw error;

        await refreshProfile();

        showToast.success('Sobriety date updated successfully');
      } catch (error: unknown) {
        logger.error('Sobriety date update failed', error as Error, {
          category: LogCategory.DATABASE,
        });
        const message = error instanceof Error ? error.message : 'Failed to update sobriety date.';
        showToast.error(message);
      }
    },
    [profile, userTimezone, refreshProfile]
  );

  /**
   * Shared handler for confirming a sobriety date selection.
   * Closes the date picker and triggers the update.
   * Used by both iOS (Update button) and Android (native OK) date pickers.
   */
  const handleSobrietyDateConfirm = useCallback(
    (date: Date | undefined) => {
      setShowSobrietyDatePicker(false);
      if (date) {
        updateSobrietyDate(date);
      }
    },
    [updateSobrietyDate]
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Your Journey Section - Merged Account and Journey */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Journey</Text>
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
          <View style={styles.separator} />
          <Pressable
            style={styles.menuItem}
            testID="settings-journey-date-row"
            onPress={handleEditSobrietyDate}
            accessibilityRole="button"
            accessibilityLabel="Edit your journey start date"
          >
            <View style={styles.menuItemLeft}>
              <Calendar size={20} color={theme.textSecondary} />
              <View>
                <Text style={styles.menuItemText}>Journey Start Date</Text>
                <Text style={styles.menuItemSubtext}>
                  {profile?.sobriety_date
                    ? parseDateAsLocal(profile.sobriety_date, userTimezone).toLocaleDateString(
                        'en-US',
                        {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )
                    : 'Not set'}
                </Text>
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
              onPress={() => {
                setThemeMode('light');
                trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
                  setting: 'theme',
                  value: 'light',
                });
              }}
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
              onPress={() => {
                setThemeMode('dark');
                trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
                  setting: 'theme',
                  value: 'dark',
                });
              }}
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
              onPress={() => {
                setThemeMode('system');
                trackEvent(AnalyticsEvents.SETTINGS_CHANGED, {
                  setting: 'theme',
                  value: 'system',
                });
              }}
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

      {/* Features Section (renamed from Dashboard) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.card}>
          <Pressable
            testID="settings-twelve-step-toggle"
            style={styles.menuItem}
            onPress={handleToggleTwelveStepContent}
            disabled={isSavingTwelveStep}
            accessibilityRole="switch"
            accessibilityState={{ checked: profile?.show_program_content !== false }}
            accessibilityLabel="Show 12 Step Content"
          >
            <View style={styles.menuItemLeft}>
              <BookOpen size={20} color={theme.textSecondary} />
              <View>
                <Text style={styles.menuItemText}>Show 12 Step Content</Text>
                <Text style={styles.menuItemSubtext}>
                  Display the Program tab with steps, daily readings, prayers, literature, and
                  meeting tracker
                </Text>
              </View>
            </View>
            {isSavingTwelveStep ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <View
                style={[
                  styles.toggle,
                  profile?.show_program_content !== false && styles.toggleActive,
                ]}
              >
                <Text style={styles.toggleText}>
                  {profile?.show_program_content !== false ? 'ON' : 'OFF'}
                </Text>
              </View>
            )}
          </Pressable>
          <View style={styles.separator} />
          <Pressable
            testID="settings-show-savings-toggle"
            style={styles.menuItem}
            onPress={handleToggleSavingsCard}
            disabled={isSavingDashboard}
            accessibilityRole="switch"
            accessibilityState={{ checked: !profile?.hide_savings_card }}
            accessibilityLabel="Show savings card on dashboard"
          >
            <View style={styles.menuItemLeft}>
              <Layout size={20} color={theme.textSecondary} />
              <View>
                <Text style={styles.menuItemText}>Show savings card</Text>
                <Text style={styles.menuItemSubtext}>Display money saved on home screen</Text>
              </View>
            </View>
            {isSavingDashboard ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <View style={[styles.toggle, !profile?.hide_savings_card && styles.toggleActive]}>
                <Text style={styles.toggleText}>{profile?.hide_savings_card ? 'OFF' : 'ON'}</Text>
              </View>
            )}
          </Pressable>
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
          <View style={styles.separator} />
          <Pressable
            testID="settings-whats-new-row"
            style={styles.menuItem}
            onPress={() => {
              if (releases.length > 0) {
                whatsNewRef.current?.present();
              } else {
                showToast.info("You're all caught up! No new updates.");
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="View What's New"
          >
            <View style={styles.menuItemLeft}>
              <Sparkles size={20} color={theme.textSecondary} />
              <Text style={styles.menuItemText}>{"What's New?"}</Text>
            </View>
            <ChevronLeft
              size={20}
              color={theme.textTertiary}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
        </View>
      </View>

      {/* Sign Out Section */}
      <View style={styles.section}>
        <Pressable
          testID="settings-logout-button"
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

      {/* Developer Tools Section - Only visible in development */}
      {__DEV__ && (
        <DevToolsSection
          theme={theme}
          styles={styles}
          profile={profile}
          refreshProfile={refreshProfile}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text testID="settings-version" style={styles.footerText}>
          Sobers v{packageJson.version}
        </Text>
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
                testID="edit-name-cancel-button"
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
                testID="edit-name-save-button"
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

      {/* Sobriety Date Picker - Web */}
      {Platform.OS === 'web' && showSobrietyDatePicker && (
        <Modal visible={showSobrietyDatePicker} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowSobrietyDatePicker(false)}>
            <Pressable style={styles.datePickerModal} onPress={noop}>
              <Text style={styles.modalTitle}>Edit Journey Start Date</Text>
              <input
                type="date"
                value={formatDateWithTimezone(selectedSobrietyDate, userTimezone)}
                max={formatDateWithTimezone(new Date(), userTimezone)}
                onChange={(e) =>
                  setSelectedSobrietyDate(parseDateAsLocal(e.target.value, userTimezone))
                }
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  marginTop: 16,
                  marginBottom: 16,
                  width: '100%',
                }}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowSobrietyDatePicker(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date selection"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => {
                    updateSobrietyDate(selectedSobrietyDate);
                    setShowSobrietyDatePicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Update sobriety date"
                >
                  <Text style={styles.modalSaveText}>Update</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Sobriety Date Picker - iOS */}
      {Platform.OS === 'ios' && showSobrietyDatePicker && (
        <Modal visible={showSobrietyDatePicker} transparent animationType="slide">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => handleSobrietyDateConfirm(undefined)}
          >
            <Pressable style={styles.datePickerModal} onPress={noop}>
              <Text style={styles.modalTitle}>Edit Journey Start Date</Text>
              <DateTimePicker
                value={selectedSobrietyDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) setSelectedSobrietyDate(date);
                }}
                maximumDate={maximumDate}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => handleSobrietyDateConfirm(undefined)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel date selection"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={() => handleSobrietyDateConfirm(selectedSobrietyDate)}
                  accessibilityRole="button"
                  accessibilityLabel="Update sobriety date"
                >
                  <Text style={styles.modalSaveText}>Update</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Sobriety Date Picker - Android */}
      {Platform.OS === 'android' && showSobrietyDatePicker && (
        <DateTimePicker
          value={selectedSobrietyDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleSobrietyDateConfirm(date)}
          maximumDate={maximumDate}
        />
      )}

      {/* What's New Sheet
       * Note: onDismiss is intentionally empty here because viewing What's New from
       * Settings is a manual action. We don't mark the release as "seen" so that the
       * auto-popup on the home screen can still trigger for users who haven't dismissed
       * it there. The home screen handles marking releases as seen.
       */}
      {releases.length > 0 && (
        <WhatsNewSheet
          ref={whatsNewRef}
          releases={releases}
          lastSeenVersion={profile?.last_seen_version ?? null}
          onDismiss={() => {}}
        />
      )}
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
      flex: 1,
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
    datePickerModal: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
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
    devToolsContainer: {
      padding: 16,
    },
    devToolsDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 12,
      textAlign: 'center',
    },
    toastButtonsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    toastButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 10,
      gap: 6,
    },
    toastButtonSuccess: {
      backgroundColor: theme.successAlt,
    },
    toastButtonError: {
      backgroundColor: theme.error,
    },
    toastButtonInfo: {
      backgroundColor: theme.info,
    },
    toastButtonText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    toggle: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: theme.borderLight,
    },
    toggleActive: {
      backgroundColor: theme.primary,
    },
    toggleText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    timeTravelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    timeTravelInput: {
      flex: 1,
      height: 44,
      backgroundColor: theme.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    timeTravelButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.primary,
      borderRadius: 10,
    },
    timeTravelResetButton: {
      backgroundColor: theme.textSecondary,
    },
    timeTravelButtonText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    timeTravelStatus: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      marginTop: 8,
      textAlign: 'center',
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default SettingsContent;
