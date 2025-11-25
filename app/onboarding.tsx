import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Calendar, LogOut } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const needsName =
    profile?.first_name === 'User' ||
    !profile?.first_name ||
    !profile?.last_initial ||
    profile?.last_initial === 'U';

  const [step, setStep] = useState(needsName ? 1 : 2);
  const [firstName, setFirstName] = useState(
    profile?.first_name !== 'User' ? profile?.first_name || '' : ''
  );
  const [lastInitial, setLastInitial] = useState(
    profile?.last_initial !== 'U' ? profile?.last_initial || '' : ''
  );
  const [sobrietyDate, setSobrietyDate] = useState(
    profile?.sobriety_date ? new Date(profile.sobriety_date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ref for field navigation
  const lastInitialRef = useRef<TextInput>(null);

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

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updateData: {
        sobriety_date: string;
        first_name?: string;
        last_initial?: string;
      } = {
        sobriety_date: sobrietyDate.toISOString().split('T')[0],
      };

      if (needsName && firstName && lastInitial) {
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

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSobrietyDate(selectedDate);
    }
  };

  const styles = createStyles(theme);

  if (step === 1 && needsName) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Sobriety Waypoint</Text>
          <Text style={styles.subtitle}>Let&apos;s get to know you</Text>

          <View style={styles.nameContainer}>
            <Text style={styles.sectionTitle}>What&apos;s your name?</Text>
            <Text style={styles.sectionSubtitle}>
              We only ask for your first name and last initial to protect your privacy.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John"
                placeholderTextColor={theme.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => lastInitialRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Initial</Text>
              <TextInput
                ref={lastInitialRef}
                style={styles.input}
                placeholder="D"
                placeholderTextColor={theme.textTertiary}
                value={lastInitial}
                onChangeText={(text) => setLastInitial(text.toUpperCase())}
                maxLength={1}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={() => setStep(2)}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!firstName || !lastInitial || lastInitial.length !== 1) && styles.buttonDisabled,
            ]}
            onPress={() => setStep(2)}
            disabled={!firstName || !lastInitial || lastInitial.length !== 1}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={theme.textSecondary} />
            <Text style={styles.signOutText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Sobriety Date</Text>
        <Text style={styles.subtitle}>When did you begin your sobriety journey?</Text>

        <View style={styles.dateContainer}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Calendar size={24} color="#007AFF" />
            <Text style={styles.dateText}>
              {sobrietyDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {(showDatePicker || Platform.OS === 'web') && Platform.OS !== 'web' && (
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
                value={sobrietyDate.toISOString().split('T')[0]}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setSobrietyDate(new Date(e.target.value));
                  setShowDatePicker(false);
                }}
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  fontFamily: theme.fontRegular,
                  borderRadius: '8px',
                  border: '2px solid #007AFF',
                  marginBottom: '16px',
                }}
              />
            </View>
          )}

          <View style={styles.daysContainer}>
            <Text style={styles.daysCount}>
              {Math.floor((new Date().getTime() - sobrietyDate.getTime()) / (1000 * 60 * 60 * 24))}
            </Text>
            <Text style={styles.daysLabel}>Days Sober</Text>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          {needsName && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(1)}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              needsName ? styles.flexButton : styles.fullWidthButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleComplete}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Complete Setup'}</Text>
          </TouchableOpacity>
        </View>

        {!needsName && (
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color={theme.textSecondary} />
            <Text style={styles.signOutText}>Back to Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 32,
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
      marginBottom: 40,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 24,
      lineHeight: 20,
    },
    nameContainer: {
      marginBottom: 32,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    roleContainer: {
      marginBottom: 32,
    },
    roleCard: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    roleCardSelected: {
      borderColor: '#007AFF',
      backgroundColor: '#f0fdf4',
    },
    roleIcon: {
      marginRight: 16,
    },
    roleContent: {
      flex: 1,
    },
    roleTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 4,
    },
    roleTextSelected: {
      color: '#007AFF',
    },
    roleDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    dateContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: '#007AFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 32,
    },
    webDatePicker: {
      marginBottom: 24,
    },
    dateText: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    daysContainer: {
      alignItems: 'center',
    },
    daysCount: {
      fontSize: 64,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: '#007AFF',
    },
    daysLabel: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 8,
    },
    button: {
      backgroundColor: '#007AFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
    buttonGroup: {
      flexDirection: 'row',
      gap: 12,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      flex: 1,
    },
    secondaryButtonText: {
      color: '#374151',
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
    flexButton: {
      flex: 2,
    },
    fullWidthButton: {
      flex: 1,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      padding: 12,
    },
    signOutText: {
      marginLeft: 8,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      fontWeight: '600',
    },
  });
