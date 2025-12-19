import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Share2, QrCode } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Icon variant for the primary button.
 */
type IconVariant = 'generate' | 'qr';

/**
 * Props for the InviteCodeSection component.
 */
interface InviteCodeSectionProps {
  /** Section title */
  title: string;
  /** Whether to show the empty state */
  isEmpty: boolean;
  /** Empty state message */
  emptyMessage: string;
  /** Primary button label */
  primaryButtonLabel: string;
  /** Icon variant for the primary button: 'generate' shows Share2 icon, 'qr' shows QrCode icon */
  primaryButtonIcon?: IconVariant;
  /** Whether to show the primary button as "Generate New" variant */
  showGenerateNew?: boolean;
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Callback when primary button is pressed */
  onPrimaryAction: () => void;
  /** Callback when secondary button is pressed (optional, for sponsor section) */
  onSecondaryAction?: () => void;
  /** Children to render (relationship cards) */
  children?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render a titled section for invite-code management that supports both empty and populated states.
 *
 * When `isEmpty` is true, displays `emptyMessage` and a primary action button whose icon is `Share2` if
 * `primaryButtonLabel` contains "Generate", otherwise `QrCode`. When `isEmpty` is false, renders `children`
 * and optionally a primary "Generate New" button (when `showGenerateNew` is true) and a secondary
 * "Connect to Another Sponsor" button when `onSecondaryAction` is provided.
 *
 * @returns A React element representing the invite code section.
 */
export default function InviteCodeSection({
  title,
  isEmpty,
  emptyMessage,
  primaryButtonLabel,
  primaryButtonIcon = 'generate',
  showGenerateNew = false,
  theme,
  onPrimaryAction,
  onSecondaryAction,
  children,
}: InviteCodeSectionProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View testID="profile-invite-code-section" style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isEmpty ? (
        <View>
          <Text style={styles.emptyStateText}>{emptyMessage}</Text>
          <TouchableOpacity
            testID="profile-enter-invite-code-button"
            style={styles.actionButton}
            onPress={onPrimaryAction}
            accessibilityRole="button"
            accessibilityLabel={primaryButtonLabel}
          >
            {primaryButtonIcon === 'generate' ? (
              <Share2 size={20} color={theme.primary} />
            ) : (
              <QrCode size={20} color={theme.primary} />
            )}
            <Text style={styles.actionButtonText}>{primaryButtonLabel}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {children}
          {showGenerateNew && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onPrimaryAction}
              accessibilityRole="button"
              accessibilityLabel={primaryButtonLabel}
            >
              <Share2 size={20} color={theme.primary} />
              <Text style={styles.actionButtonText}>{primaryButtonLabel}</Text>
            </TouchableOpacity>
          )}
          {onSecondaryAction && !isEmpty && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSecondaryAction}
              accessibilityRole="button"
              accessibilityLabel="Connect to Another Sponsor"
            >
              <QrCode size={20} color={theme.primary} />
              <Text style={styles.actionButtonText}>Connect to Another Sponsor</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    emptyStateText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
  });
