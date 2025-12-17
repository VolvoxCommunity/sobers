import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  Linking,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { validateDisplayName } from '@/lib/validation';
import { showAlert } from '@/lib/alert';
import { Calendar, LogOut, Info, Square, CheckSquare } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import OnboardingStep from '@/components/onboarding/OnboardingStep';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getDateDiffInDays,
  formatDateWithTimezone,
  parseDateAsLocal,
  getUserTimezone,
} from '@/lib/date';
import { trackEvent, AnalyticsEvents, calculateDaysSoberBucket } from '@/lib/analytics';

// =============================================================================
// Constants
// =============================================================================

/**
 * Character count threshold for warning color display (25 out of 30).
 * When user reaches this many characters, the count display changes to warning color.
 */
const CHARACTER_WARNING_THRESHOLD = 25;

/**
 * Maximum allowed characters for display name (enforced by validation).
 */
const MAX_DISPLAY_NAME_LENGTH = 30;

/**
 * Debounce delay in milliseconds for real-time validation feedback.
 *
 * 300ms is chosen as a balance between providing immediate feedback to the user
 * and avoiding excessive validation calls while typing. This value helps ensure
 * validation is responsive but not triggered on every keystroke.
 */
const VALIDATION_DEBOUNCE_MS = 300;

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the onboarding screen displayed after authentication to collect the user's display name and sobriety date.
 *
 * Updates the user's profile with the provided values, refreshes profile state, and navigates to the main app when the profile is complete.
 *
 * @returns The React element for the onboarding screen
 */
export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  // Pre-fill display name from OAuth profile if available (e.g., Google sign-in)
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  // Initialize error state with validation result to prevent race condition where
  // form could be valid before debounced validation runs
  const [displayNameError, setDisplayNameError] = useState<string | null>(() =>
    validateDisplayName(profile?.display_name ?? '')
  );

  // Track onboarding start time for analytics duration calculation
  const [onboardingStartTime] = useState(() => Date.now());

  // Stable maximum date for DateTimePicker to prevent iOS crash when value > maximumDate.
  // Using useMemo ensures we don't create a new Date on every render, which could cause
  // the maximumDate to be slightly before the stored sobrietyDate due to timing.
  const maximumDate = useMemo(() => new Date(), []);

  const [sobrietyDate, setSobrietyDate] = useState(() => {
    // Parse stored date in user's timezone (or device timezone as fallback)
    if (profile?.sobriety_date) {
      const parsedDate = parseDateAsLocal(profile.sobriety_date, getUserTimezone(profile));
      // Clamp to maximumDate to prevent iOS DateTimePicker crash
      // (iOS throws 'Start date cannot be later in time than end date!' if value > maximumDate)
      return parsedDate > maximumDate ? maximumDate : parsedDate;
    }
    return maximumDate;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  // Track when we're waiting for profile to update after form submission
  const [awaitingProfileUpdate, setAwaitingProfileUpdate] = useState(false);

  // Refresh profile on mount to catch any pending updates (e.g., Apple Sign In)
  // Apple Sign In updates the profile AFTER navigation to onboarding happens,
  // so we need to re-fetch to get the display_name that was just set.
  useEffect(() => {
    // Small delay to allow any in-flight profile updates to complete
    const timeoutId = setTimeout(() => {
      refreshProfile();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [refreshProfile]);

  // Sync display name from profile or user_metadata when available
  // Priority: profile.display_name > user_metadata.display_name
  // This handles:
  // 1. Profile data arriving after initial render
  // 2. Apple Sign In storing name in user_metadata (when profile doesn't exist yet)
  useEffect(() => {
    const sourceDisplayName =
      profile?.display_name?.trim() ||
      (user?.user_metadata?.display_name as string | undefined)?.trim();

    if (sourceDisplayName) {
      setDisplayName((prev) => (prev.trim() ? prev : sourceDisplayName));
    }
  }, [profile?.display_name, user?.user_metadata?.display_name]);

  // Navigate to main app when profile becomes complete after submission
  // This ensures we only navigate AFTER React has processed the profile state update
  useEffect(() => {
    if (!awaitingProfileUpdate) return;

    // Profile is complete - navigate to main app
    if (profile?.sobriety_date && profile?.display_name) {
      router.replace('/(tabs)');
      return;
    }

    // Add timeout protection to prevent user getting stuck indefinitely
    // if profile refresh fails silently or profile never becomes complete
    const timeout = setTimeout(() => {
      if (awaitingProfileUpdate) {
        setAwaitingProfileUpdate(false);
        setLoading(false);
        showAlert(
          'Profile Update Timeout',
          'Your profile update is taking longer than expected. Please try again.'
        );
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
    // Note: router is intentionally excluded from deps because:
    // We only want navigation to trigger when awaitingProfileUpdate or profile changes,
    // not when the router object changes (which is assumed to be referentially stable in Expo Router based on current behavior, but this is not a guaranteed invariant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingProfileUpdate, profile]);

  // Track onboarding started on mount
  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_STARTED);
  }, []);

  // Debounced validation for display name
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const error = validateDisplayName(displayName);
      setDisplayNameError(error);
    }, VALIDATION_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [displayName]);

  /**
   * Validates that the form is complete and valid for submission.
   * Requires valid display name and accepted terms.
   */
  const isFormValid = useMemo(() => {
    const hasValidDisplayName = displayName.trim() !== '' && displayNameError === null;
    return hasValidDisplayName && isTermsAccepted;
  }, [displayName, displayNameError, isTermsAccepted]);

  /**
   * Character count for display name with visual feedback.
   * Color changes to warning when approaching limit.
   */
  const characterCount = displayName.length;
  const isNearLimit = characterCount >= CHARACTER_WARNING_THRESHOLD;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      if (error instanceof Error) {
        showAlert('Error', error.message);
      } else {
        showAlert('Error', 'An unknown error occurred');
      }
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    // Synchronous validation before submit - debounce may not have fired yet
    // This prevents submitting invalid names if user types quickly and clicks submit
    const validationError = validateDisplayName(displayName);
    if (validationError) {
      setDisplayNameError(validationError);
      return;
    }

    // Clear any previous error when validation succeeds
    setDisplayNameError(null);

    setLoading(true);
    try {
      const userTimezone = getUserTimezone(profile);

      const profileData = {
        id: user.id,
        email: user.email || '',
        // Format the sobriety date using the user's timezone
        sobriety_date: formatDateWithTimezone(sobrietyDate, userTimezone),
        // Record when the user accepted the Privacy Policy and Terms of Service
        terms_accepted_at: new Date().toISOString(),
        // Trim whitespace before saving (consistent with validation)
        display_name: displayName.trim(),
        // Capture the user's timezone for date calculations
        timezone: userTimezone,
      };

      // Use upsert to create the profile if it doesn't exist (for both OAuth and email/password users),
      // or update it if the user is restarting onboarding and a profile already exists.
      const { error } = await supabase.from('profiles').upsert(profileData, {
        onConflict: 'id',
      });

      if (error) throw error;

      // Track onboarding completion with duration
      const durationSeconds = Math.floor((Date.now() - onboardingStartTime) / 1000);
      trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
        duration_seconds: durationSeconds,
      });

      // Refresh the profile state in AuthContext
      // refreshProfile() catches errors internally and returns null on failure,
      // so we proceed to set awaitingProfileUpdate regardless since the database
      // update has already succeeded. The useEffect will only navigate if the
      // profile state contains the expected fields.
      await refreshProfile();

      // Note: We can't check profile state here due to React's async state updates.
      // The profile variable in this closure still holds the old value - the actual
      // completeness check happens in the useEffect that watches awaitingProfileUpdate.

      // Signal that we're ready to navigate once React processes the profile update
      // The useEffect watching awaitingProfileUpdate will handle the actual navigation
      // after React has propagated the new profile state through the component tree.
      // Note: Navigation only occurs if profile has all required fields (checked in useEffect)
      setAwaitingProfileUpdate(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      showAlert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSobrietyDate(selectedDate);
      // Track sobriety date set
      const today = new Date();
      const daysSober = Math.floor(
        (today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      trackEvent(AnalyticsEvents.ONBOARDING_SOBRIETY_DATE_SET, {
        days_sober_bucket: calculateDaysSoberBucket(daysSober),
      });
    }
  };

  /**
   * Opens the privacy policy URL in the default browser.
   */
  const openPrivacyPolicy = useCallback(() => {
    Linking.openURL('https://www.volvoxdev.com/privacy');
  }, []);

  /**
   * Opens the terms of service URL in the default browser.
   */
  const openTermsOfService = useCallback(() => {
    Linking.openURL('https://www.volvoxdev.com/terms');
  }, []);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.safeArea}>
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <OnboardingStep>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Welcome to Sobers</Text>
              <Text style={styles.subtitle}>Let&apos;s set up your profile.</Text>
            </View>

            {/* Card 1: About You - Display Name */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>👤 ABOUT YOU</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={[styles.input, displayNameError && styles.inputError]}
                  placeholder="e.g. John D."
                  placeholderTextColor={theme.textTertiary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  accessibilityLabel="Display Name"
                />
                <View style={styles.inputFooter}>
                  <Text
                    style={[styles.characterCount, isNearLimit && styles.characterCountWarning]}
                  >
                    {characterCount}/{MAX_DISPLAY_NAME_LENGTH} characters
                  </Text>
                </View>
                {displayNameError && (
                  <Animated.View entering={FadeInDown}>
                    <Text style={styles.errorText}>{displayNameError}</Text>
                  </Animated.View>
                )}
              </View>

              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowInfo(!showInfo)}
                accessibilityRole="button"
                accessibilityLabel={showInfo ? 'Hide information' : 'Show information'}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Info size={16} color={theme.textSecondary} />
                <Text style={styles.infoText}>How you&apos;ll appear to others</Text>
              </TouchableOpacity>

              {showInfo && (
                <Animated.View entering={FadeInDown} style={styles.infoBox}>
                  <Text style={styles.infoBoxText}>
                    Your display name is how you&apos;ll be identified in the app. Choose any name
                    you&apos;re comfortable with - it can be your real name, initials, or a
                    nickname.
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* Card 2: Your Journey - Sobriety Date */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 YOUR JOURNEY</Text>

              <TouchableOpacity
                style={styles.dateDisplay}
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select sobriety date"
              >
                <Calendar size={32} color={theme.primary} />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateLabel}>Sobriety Date</Text>
                  <Text style={styles.dateValue}>
                    {sobrietyDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>

              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={sobrietyDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={maximumDate}
                />
              )}

              {Platform.OS === 'web' && showDatePicker && (
                <View style={styles.webDatePicker}>
                  <input
                    type="date"
                    value={formatDateWithTimezone(sobrietyDate, getUserTimezone(profile))}
                    max={formatDateWithTimezone(new Date(), getUserTimezone(profile))}
                    onChange={(e) => {
                      setSobrietyDate(parseDateAsLocal(e.target.value, getUserTimezone(profile)));
                      setShowDatePicker(false);
                    }}
                    style={{
                      padding: '12px',
                      fontSize: '16px',
                      fontFamily: theme.fontRegular,
                      borderRadius: '8px',
                      border: `2px solid ${theme.primary}`,
                      marginBottom: '16px',
                      width: '100%',
                    }}
                  />
                </View>
              )}

              <View style={styles.statsContainer}>
                <Text style={styles.statsCount}>
                  {getDateDiffInDays(sobrietyDate, new Date(), getUserTimezone(profile))}
                </Text>
                <Text style={styles.statsLabel}>Days</Text>
              </View>
            </View>

            {/* Terms Acceptance */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setIsTermsAccepted(!isTermsAccepted)}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isTermsAccepted }}
              accessibilityLabel="Accept terms and privacy policy"
              accessibilityHint="Toggles acceptance of Privacy Policy and Terms of Service"
            >
              {isTermsAccepted ? (
                <CheckSquare size={24} color={theme.primary} />
              ) : (
                <Square size={24} color={theme.textSecondary} />
              )}
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={openPrivacyPolicy}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy link"
                >
                  Privacy Policy
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={openTermsOfService}
                  accessible={true}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service link"
                >
                  Terms of Service
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Complete Setup Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={!isFormValid || loading}
                accessibilityRole="button"
                accessibilityLabel="Complete Setup"
                accessibilityState={{ busy: loading, disabled: !isFormValid || loading }}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign Out Button - Inside ScrollView to avoid keyboard overlap */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              <LogOut size={16} color={theme.textSecondary} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </OnboardingStep>
        </KeyboardAwareScrollView>
      </View>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      paddingTop: Platform.OS === 'android' ? 40 : 60,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    headerContainer: {
      marginBottom: 32,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.textSecondary,
      marginBottom: 20,
      letterSpacing: 1,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    inputError: {
      borderColor: theme.danger,
    },
    inputFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    characterCount: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
    },
    characterCountWarning: {
      color: theme.warning,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      marginTop: 4,
    },
    infoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      gap: 6,
    },
    infoText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    infoBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    infoBoxText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    dateDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 24,
    },
    dateTextContainer: {
      marginLeft: 16,
    },
    dateLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    webDatePicker: {
      marginBottom: 24,
    },
    statsContainer: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.background,
      borderRadius: 16,
    },
    statsCount: {
      fontSize: 48,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
      marginBottom: 4,
    },
    statsLabel: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    termsText: {
      flex: 1,
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    termsLink: {
      color: theme.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    footer: {
      marginBottom: 24,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
    },
    buttonText: {
      color: theme.white,
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
      marginTop: 8,
    },
    signOutText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      fontWeight: '500',
    },
  });
