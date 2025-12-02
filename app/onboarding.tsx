import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Calendar, LogOut, ChevronRight, ChevronLeft, Info } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import ProgressBar from '@/components/onboarding/ProgressBar';
import OnboardingStep from '@/components/onboarding/OnboardingStep';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  getDateDiffInDays,
  formatDateWithTimezone,
  parseDateAsLocal,
  DEVICE_TIMEZONE,
} from '@/lib/date';
import type { Profile } from '@/types/database';

/**
 * OnboardingScreen handles the initial user setup flow after authentication.
 *
 * The onboarding consists of two steps:
 * - Step 1: Collects user's first name and last initial for personalization
 * - Step 2: Collects the user's sobriety date to track their recovery journey
 *
 * All users complete both steps to ensure complete profile setup.
 * Upon completion, the user's profile is updated and they are redirected to the main app.
 *
 * @returns The onboarding screen component with step-based navigation
 *
 * @example
 * ```tsx
 * // Used as a route in Expo Router - navigated to automatically
 * // when user is authenticated but profile is incomplete
 * <OnboardingScreen />
 * ```
 */
export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  // Pre-fill name fields from OAuth profile if available (e.g., Google sign-in)
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastInitial, setLastInitial] = useState(profile?.last_initial ?? '');
  const [sobrietyDate, setSobrietyDate] = useState(
    // Parse stored date in user's timezone (or device timezone as fallback)
    profile?.sobriety_date
      ? parseDateAsLocal(profile.sobriety_date, profile?.timezone ?? DEVICE_TIMEZONE)
      : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Ref for field navigation
  const lastInitialRef = useRef<TextInput>(null);

  const totalSteps = 2;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'An unknown error occurred');
      }
    }
  };

  /**
   * Gets the user's timezone with fallback to device timezone.
   *
   * @param profile - The user profile object
   * @returns The user's stored timezone or device timezone as fallback
   */
  const getUserTimezone = (profile?: Profile | null): string => {
    // Use stored timezone if available, otherwise fallback to device timezone
    return profile?.timezone || DEVICE_TIMEZONE;
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the user's timezone with fallback to device timezone
      const userTimezone = getUserTimezone(profile);

      const updateData: {
        sobriety_date: string;
        first_name?: string;
        last_initial?: string;
      } = {
        // Format the sobriety date using the user's timezone
        sobriety_date: formatDateWithTimezone(sobrietyDate, userTimezone),
      };

      if (firstName && lastInitial) {
        updateData.first_name = firstName;
        updateData.last_initial = lastInitial.toUpperCase();
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + message);
      } else {
        Alert.alert('Error', message);
      }
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
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderStep1 = () => (
    <OnboardingStep>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Welcome to Sobriety Waypoint</Text>
        <Text style={styles.subtitle}>Let&apos;s get to know you better.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John"
            placeholderTextColor={theme.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => lastInitialRef.current?.focus()}
            blurOnSubmit={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Initial</Text>
          <TextInput
            ref={lastInitialRef}
            style={styles.input}
            placeholder="e.g. D"
            placeholderTextColor={theme.textTertiary}
            value={lastInitial}
            onChangeText={(text) => setLastInitial(text.toUpperCase())}
            maxLength={1}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={() => setStep(2)}
          />
        </View>

        <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(!showInfo)}>
          <Info size={16} color={theme.textSecondary} />
          <Text style={styles.infoText}>Why do we ask for this?</Text>
        </TouchableOpacity>

        {showInfo && (
          <Animated.View entering={FadeInDown} style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              We value your privacy. Your first name and last initial are used to personalize your
              experience while maintaining anonymity within the community.
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!firstName || !lastInitial || lastInitial.length !== 1) && styles.buttonDisabled,
          ]}
          onPress={() => setStep(2)}
          disabled={!firstName || !lastInitial || lastInitial.length !== 1}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <ChevronRight size={20} color={theme.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </OnboardingStep>
  );

  const renderStep2 = () => (
    <OnboardingStep>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Your Sobriety Date</Text>
        <Text style={styles.subtitle}>When did your journey begin?</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)}>
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
            maximumDate={new Date()}
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
          <Text style={styles.statsLabel}>Days Sober</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonGroup}>
          {step === 2 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(1)}
              disabled={loading}
            >
              <ChevronLeft size={20} color={theme.text} />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.flexButton, loading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Complete Setup'}</Text>
            {!loading && <ChevronRight size={20} color={theme.textOnPrimary} />}
          </TouchableOpacity>
        </View>
      </View>
    </OnboardingStep>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.safeArea}>
        <View style={styles.topBar}>
          <ProgressBar step={step} totalSteps={totalSteps} theme={theme} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? renderStep1() : renderStep2()}
        </ScrollView>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={16} color={theme.textSecondary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    topBar: {
      marginBottom: 20,
    },
    scrollContent: {
      flexGrow: 1,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
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
    footer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
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
    buttonGroup: {
      flexDirection: 'row',
      gap: 12,
    },
    secondaryButton: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
      minWidth: 100,
    },
    secondaryButtonText: {
      color: theme.text,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
    flexButton: {
      flex: 1,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
      marginBottom: 8,
    },
    signOutText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      fontWeight: '500',
    },
  });
