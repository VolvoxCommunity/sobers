// =============================================================================
// Imports
// =============================================================================
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { logger, LogCategory } from '@/lib/logger';
import packageJson from '../package.json';

// =============================================================================
// Constants
// =============================================================================
const EXTERNAL_LINKS = {
  PRIVACY_POLICY: 'https://www.volvoxdev.com/privacy',
  TERMS_OF_SERVICE: 'https://sobrietywaypoint.com/terms',
  SOURCE_CODE: 'https://github.com/VolvoxCommunity/Sobriety-Waypoint',
  DEVELOPER: 'https://billchirico.dev',
} as const;

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
  const { signOut, deleteAccount } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDangerZoneExpanded, setIsDangerZoneExpanded] = useState(false);

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

  const styles = createStyles(theme);

  return (
    <View style={styles.outerContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
          >
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
              onPress={() => setIsDangerZoneExpanded(!isDangerZoneExpanded)}
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
            {isDangerZoneExpanded && (
              <View style={styles.dangerCard}>
                <Text style={styles.dangerDescription}>
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </Text>
                <TouchableOpacity
                  style={[styles.deleteAccountButton, isDeleting && styles.buttonDisabled]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
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
            )}
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
      </SafeAreaView>
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
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    closeButton: {
      padding: 4,
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
      flexGrow: 1,
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
  });
