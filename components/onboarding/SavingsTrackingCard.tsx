import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { DollarSign } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import type { SpendingFrequency } from '@/lib/savings';

// =============================================================================
// Types
// =============================================================================

interface SavingsTrackingCardProps {
  /** Whether savings tracking is enabled */
  isEnabled: boolean;
  /** Callback when toggle state changes */
  onToggle: (enabled: boolean) => void;
  /** Current amount value (string for input) */
  amount: string;
  /** Callback when amount changes */
  onAmountChange: (amount: string) => void;
  /** Current frequency selection */
  frequency: SpendingFrequency;
  /** Callback when frequency changes */
  onFrequencyChange: (frequency: SpendingFrequency) => void;
  /** Error message to display */
  error: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const FREQUENCIES: { value: SpendingFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Onboarding card for optional savings tracking setup.
 *
 * Features toggle to enable/disable, amount input, and frequency picker.
 * Only shows input fields when enabled.
 *
 * @param isEnabled - Whether tracking is enabled
 * @param onToggle - Toggle callback
 * @param amount - Current amount string
 * @param onAmountChange - Amount change callback
 * @param frequency - Current frequency
 * @param onFrequencyChange - Frequency change callback
 * @param error - Error message
 */
export default function SavingsTrackingCard({
  isEnabled,
  onToggle,
  amount,
  onAmountChange,
  frequency,
  onFrequencyChange,
  error,
}: SavingsTrackingCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>TRACK YOUR SAVINGS (Optional)</Text>

      <TouchableOpacity
        testID="savings-toggle"
        style={styles.toggleRow}
        onPress={() => onToggle(!isEnabled)}
        activeOpacity={0.7}
        accessibilityRole="switch"
        accessibilityState={{ checked: isEnabled }}
        accessibilityLabel="Enable savings tracking"
      >
        <Text style={styles.toggleLabel}>I want to track money saved</Text>
        <Switch
          value={isEnabled}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={isEnabled ? theme.primary : theme.textTertiary}
        />
      </TouchableOpacity>

      {isEnabled && (
        <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.inputsContainer}>
          <Text style={styles.label}>How much did you spend on your addiction?</Text>

          <View style={styles.inputRow}>
            <View style={styles.amountInputContainer}>
              <DollarSign size={20} color={theme.textSecondary} style={styles.dollarIcon} />
              <TextInput
                testID="savings-amount-input"
                style={styles.amountInput}
                value={amount}
                onChangeText={onAmountChange}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                accessibilityLabel="Spending amount"
              />
            </View>
            <Text style={styles.perText}>per</Text>
          </View>

          <View testID="savings-frequency-picker" style={styles.frequencyContainer}>
            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                testID={`frequency-${freq.value}`}
                style={[
                  styles.frequencyButton,
                  frequency === freq.value && styles.frequencyButtonSelected,
                ]}
                onPress={() => onFrequencyChange(freq.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: frequency === freq.value }}
                accessibilityLabel={`${freq.label} frequency`}
              >
                <Text
                  style={[
                    styles.frequencyText,
                    frequency === freq.value && styles.frequencyTextSelected,
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && (
            <Animated.View entering={FadeInDown}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
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
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      flex: 1,
    },
    inputsContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    amountInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    dollarIcon: {
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      padding: 16,
      fontSize: 18,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    perText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    frequencyContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    frequencyButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    frequencyButtonSelected: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    frequencyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    frequencyTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      marginTop: 8,
    },
  });
