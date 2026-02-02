import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, Users, UserPlus, Heart } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { ConnectionIntent } from '@/types/database';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Configuration for an intent option.
 */
interface IntentOption {
  /** The intent value */
  value: ConnectionIntent | null;
  /** Display label */
  label: string;
  /** Description text */
  description: string;
  /** Icon component */
  icon: React.ReactNode;
}

/**
 * Props for the ConnectionIntentSelector component.
 */
interface ConnectionIntentSelectorProps {
  /** Currently selected intent */
  value: ConnectionIntent | null | undefined;
  /** Callback when intent changes */
  onChange: (intent: ConnectionIntent | null) => void;
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * A selector component for choosing connection intent.
 * Users must declare their intent before generating invite codes.
 *
 * @example
 * ```tsx
 * <ConnectionIntentSelector
 *   value={profile.connection_intent}
 *   onChange={(intent) => updateProfile({ connection_intent: intent })}
 *   theme={theme}
 * />
 * ```
 */
export default function ConnectionIntentSelector({
  value,
  onChange,
  theme,
  disabled = false,
}: ConnectionIntentSelectorProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const options: IntentOption[] = useMemo(
    () => [
      {
        value: 'not_looking',
        label: 'Not Looking',
        description: 'Not currently seeking connections',
        icon: <Heart size={20} color={theme.textSecondary} />,
      },
      {
        value: 'seeking_sponsor',
        label: 'Seeking a Sponsor',
        description: 'Looking for someone to guide my recovery',
        icon: <Search size={20} color={theme.primary} />,
      },
      {
        value: 'open_to_sponsoring',
        label: 'Open to Sponsoring',
        description: 'Willing to help others in their recovery',
        icon: <UserPlus size={20} color={theme.success} />,
      },
      {
        value: 'open_to_both',
        label: 'Open to Both',
        description: 'Seeking a sponsor and willing to sponsor others',
        icon: <Users size={20} color={theme.warning} />,
      },
    ],
    [theme]
  );

  return (
    <View style={styles.container} testID="connection-intent-selector">
      <Text style={styles.title}>Connection Intent</Text>
      <Text style={styles.subtitle}>Declare your availability before connecting with others</Text>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value ?? 'null'}
              testID={`intent-option-${option.value}`}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={`${option.label}: ${option.description}`}
            >
              <View style={styles.optionIcon}>{option.icon}</View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected && (
                <View style={styles.selectedIndicator} accessibilityLabel="Selected" />
              )}
            </TouchableOpacity>
          );
        })}
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
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    optionsContainer: {
      gap: 12,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    optionDisabled: {
      opacity: 0.5,
    },
    optionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionContent: {
      flex: 1,
      marginLeft: 12,
    },
    optionLabel: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    optionLabelSelected: {
      color: theme.primary,
    },
    optionDescription: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    selectedIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
  });
