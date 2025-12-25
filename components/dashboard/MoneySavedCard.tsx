/**
 * @fileoverview Dashboard card displaying money saved since sobriety.
 *
 * Shows total savings calculated from historical spending patterns and days sober.
 * Includes breakdown by day/week/month and opens edit sheet on press.
 * Supports unconfigured state for users who haven't set up spending tracking.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { DollarSign, MoreVertical, Edit3, EyeOff } from 'lucide-react-native';
import { calculateSavings, formatCurrency, type SpendingFrequency } from '@/lib/savings';

// =============================================================================
// Types
// =============================================================================

interface ConfiguredMoneySavedCardProps {
  variant?: 'configured';
  /** Historical spending amount */
  amount: number;
  /** Spending frequency */
  frequency: SpendingFrequency;
  /** Days since sobriety start */
  daysSober: number;
  /** Callback when card is pressed (opens edit sheet) */
  onPress: () => void;
  /** Callback when hide option is selected */
  onHide: () => void;
}

interface UnconfiguredMoneySavedCardProps {
  variant: 'unconfigured';
  /** Callback when card is pressed (opens setup sheet) */
  onSetup: () => void;
  /** Callback when hide option is selected */
  onHide: () => void;
}

type MoneySavedCardProps = ConfiguredMoneySavedCardProps | UnconfiguredMoneySavedCardProps;

// =============================================================================
// Menu Component
// =============================================================================

interface MenuProps {
  isVisible: boolean;
  onClose: () => void;
  options: { label: string; icon: React.ReactNode; onPress: () => void }[];
  theme: ThemeColors;
}

function CardMenu({ isVisible, onClose, options, theme }: MenuProps) {
  const menuStyles = useMemo(() => createMenuStyles(theme), [theme]);

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <View style={menuStyles.menu}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.label}
              style={[menuStyles.menuItem, index > 0 && menuStyles.menuItemBorder]}
              onPress={() => {
                onClose();
                option.onPress();
              }}
            >
              {option.icon}
              <Text style={menuStyles.menuItemText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dashboard card displaying money saved since sobriety.
 *
 * Shows total saved, spending basis, and breakdown by day/week/month.
 * Supports two variants:
 * - configured: Shows savings data with edit and hide options
 * - unconfigured: Shows setup prompt with hide option
 *
 * @param props - Card props (variant-dependent)
 */
export default function MoneySavedCard(props: MoneySavedCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [menuVisible, setMenuVisible] = useState(false);

  // Extract configured props (with defaults for unconfigured variant)
  const isUnconfigured = props.variant === 'unconfigured';
  const amount = isUnconfigured ? 0 : props.amount;
  const frequency = isUnconfigured ? 'weekly' : props.frequency;
  const daysSober = isUnconfigured ? 0 : props.daysSober;

  // Calculate savings (safe to call unconditionally now)
  const savings = useMemo(
    () => calculateSavings(amount, frequency, daysSober),
    [amount, frequency, daysSober]
  );

  // Unconfigured variant
  if (isUnconfigured) {
    const menuOptions = [
      {
        label: 'Hide from dashboard',
        icon: <EyeOff size={18} color={theme.textSecondary} />,
        onPress: props.onHide,
      },
    ];

    return (
      <>
        <TouchableOpacity
          testID="money-saved-card"
          style={styles.card}
          onPress={props.onSetup}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Set up money saved tracking. Tap to configure."
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <DollarSign size={24} color={theme.success} />
              <Text style={styles.headerTitle}>Track Money Saved</Text>
            </View>
            <TouchableOpacity
              testID="money-saved-menu-button"
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="More options"
            >
              <MoreVertical size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.setupDescription}>
            Set up spending tracking to see how much you&apos;ve saved on your recovery journey
          </Text>

          <View style={styles.setupPrompt}>
            <Text style={styles.setupPromptText}>Tap to get started</Text>
          </View>
        </TouchableOpacity>

        <CardMenu
          isVisible={menuVisible}
          onClose={() => setMenuVisible(false)}
          options={menuOptions}
          theme={theme}
        />
      </>
    );
  }

  // Configured variant (default)
  const { onPress, onHide } = props;

  const menuOptions = [
    {
      label: 'Edit savings',
      icon: <Edit3 size={18} color={theme.textSecondary} />,
      onPress: onPress,
    },
    {
      label: 'Hide from dashboard',
      icon: <EyeOff size={18} color={theme.textSecondary} />,
      onPress: onHide,
    },
  ];

  return (
    <>
      <TouchableOpacity
        testID="money-saved-card"
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Money saved: ${formatCurrency(savings.totalSaved)}. Tap to edit.`}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <DollarSign size={24} color={theme.success} />
            <Text style={styles.headerTitle}>Money Saved</Text>
          </View>
          <TouchableOpacity
            testID="money-saved-menu-button"
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="More options"
          >
            <MoreVertical size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text testID="money-saved-total" style={styles.totalAmount}>
          {formatCurrency(savings.totalSaved)}
        </Text>

        <Text style={styles.basisText}>
          Based on {formatCurrency(amount)}/{frequency} spending
        </Text>

        <View style={styles.breakdownContainer}>
          <View testID="breakdown-day" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Day</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perDay)}</Text>
          </View>
          <View testID="breakdown-week" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Week</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perWeek)}</Text>
          </View>
          <View testID="breakdown-month" style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Month</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(savings.perMonth)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <CardMenu
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        options={menuOptions}
        theme={theme}
      />
    </>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      margin: 16,
      marginTop: 0,
      padding: 24,
      borderRadius: 16,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    menuButton: {
      padding: 4,
    },
    totalAmount: {
      fontSize: 40,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.success,
      textAlign: 'center',
      marginBottom: 8,
    },
    basisText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    breakdownContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    breakdownItem: {
      alignItems: 'center',
      backgroundColor: theme.background,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      minWidth: 90,
    },
    breakdownLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    breakdownValue: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    setupDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    setupPrompt: {
      backgroundColor: theme.primaryLight,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 20,
      alignSelf: 'center',
    },
    setupPromptText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
  });

const createMenuStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 180,
      paddingRight: 32,
    },
    menu: {
      backgroundColor: theme.card,
      borderRadius: 12,
      minWidth: 180,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    menuItemBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    menuItemText: {
      fontSize: 15,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
  });
