import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { Copy, Share2, RefreshCw, Trash2, Clock } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { InviteCode } from '@/types/database';
import { showToast } from '@/lib/toast';
import { getTimeRemaining, formatTimeRemaining, TimeRemaining } from '@/lib/time-utils';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the PersistentInviteCard component.
 */
interface PersistentInviteCardProps {
  /** The invite code data */
  inviteCode: InviteCode;
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Callback when regenerate is pressed */
  onRegenerate: () => void;
  /** Callback when revoke is pressed */
  onRevoke: () => void;
  /** Whether actions are disabled (during loading) */
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format time remaining with "remaining" suffix for invite cards.
 */
function formatInviteTimeRemaining(time: TimeRemaining): string {
  if (time.isExpired) return 'Expired';
  const formatted = formatTimeRemaining(time, 'short');
  return `${formatted} remaining`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Displays a persistent invite code card with expiration timer and actions.
 * Part of the Intent & Ownership system - invites are visible, owned objects.
 *
 * @example
 * ```tsx
 * <PersistentInviteCard
 *   inviteCode={activeCode}
 *   theme={theme}
 *   onRegenerate={handleRegenerate}
 *   onRevoke={handleRevoke}
 * />
 * ```
 */
export default function PersistentInviteCard({
  inviteCode,
  theme,
  onRegenerate,
  onRevoke,
  disabled = false,
}: PersistentInviteCardProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Use 3 days for "expiring soon" threshold on invite codes
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(inviteCode.expires_at, 3)
  );

  // Update timer every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(inviteCode.expires_at, 3));
    }, 60000);

    return () => clearInterval(interval);
  }, [inviteCode.expires_at]);

  const handleCopy = async () => {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(inviteCode.code);
      showToast.success('Code copied to clipboard');
    } else {
      // Use expo-clipboard for React Native
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(inviteCode.code);
      showToast.success('Code copied to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Sobers! Use invite code: ${inviteCode.code}`,
      });
    } catch {
      // User cancelled or share failed silently
    }
  };

  const isUsed = !!inviteCode.used_by;
  const isRevoked = !!inviteCode.revoked_at;
  const isInactive = timeRemaining.isExpired || isUsed || isRevoked;

  return (
    <View
      style={[styles.container, isInactive && styles.containerInactive]}
      testID="persistent-invite-card"
    >
      {/* Code Display */}
      <View style={styles.codeSection}>
        <Text style={styles.codeLabel}>Your Invite Code</Text>
        <View style={styles.codeRow}>
          <Text
            style={[styles.code, isInactive && styles.codeInactive]}
            selectable
            accessibilityLabel={`Invite code: ${inviteCode.code.split('').join(' ')}`}
          >
            {inviteCode.code}
          </Text>
          {!isInactive && (
            <TouchableOpacity
              onPress={handleCopy}
              style={styles.copyButton}
              accessibilityRole="button"
              accessibilityLabel="Copy invite code"
              disabled={disabled}
            >
              <Copy size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Badge */}
      <View style={styles.statusSection}>
        {isRevoked ? (
          <View style={[styles.statusBadge, styles.statusRevoked]}>
            <Text style={styles.statusTextRevoked}>Revoked</Text>
          </View>
        ) : isUsed ? (
          <View style={[styles.statusBadge, styles.statusUsed]}>
            <Text style={styles.statusTextUsed}>Used</Text>
          </View>
        ) : timeRemaining.isExpired ? (
          <View style={[styles.statusBadge, styles.statusExpired]}>
            <Text style={styles.statusTextExpired}>Expired</Text>
          </View>
        ) : (
          <View
            style={[
              styles.statusBadge,
              styles.statusActive,
              timeRemaining.isExpiringSoon && styles.statusExpiringSoon,
            ]}
          >
            <Clock size={14} color={timeRemaining.isExpiringSoon ? theme.warning : theme.success} />
            <Text
              style={[
                styles.statusTextActive,
                timeRemaining.isExpiringSoon && styles.statusTextExpiringSoon,
              ]}
            >
              {formatInviteTimeRemaining(timeRemaining)}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {!isInactive && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Share invite code"
          >
            <Share2 size={16} color={theme.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onRegenerate}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Generate new invite code"
        >
          <RefreshCw size={16} color={theme.primary} />
          <Text style={styles.actionText}>Regenerate</Text>
        </TouchableOpacity>
        {!isInactive && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={onRevoke}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Revoke invite code"
          >
            <Trash2 size={16} color={theme.danger} />
            <Text style={styles.actionTextDanger}>Revoke</Text>
          </TouchableOpacity>
        )}
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
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    containerInactive: {
      opacity: 0.7,
      borderColor: theme.textSecondary,
    },
    codeSection: {
      marginBottom: 12,
    },
    codeLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    code: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 4,
    },
    codeInactive: {
      color: theme.textSecondary,
      textDecorationLine: 'line-through',
    },
    copyButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.primaryLight,
    },
    statusSection: {
      marginBottom: 12,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 6,
    },
    statusActive: {
      backgroundColor: theme.successLight,
    },
    statusExpiringSoon: {
      backgroundColor: theme.primaryLight, // Use primaryLight as fallback for warning state
    },
    statusExpired: {
      backgroundColor: theme.dangerLight,
    },
    statusUsed: {
      backgroundColor: theme.primaryLight,
    },
    statusRevoked: {
      backgroundColor: theme.dangerLight,
    },
    statusTextActive: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.success,
    },
    statusTextExpiringSoon: {
      color: theme.warning,
    },
    statusTextExpired: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
    },
    statusTextUsed: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    statusTextRevoked: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
    },
    actionsSection: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.primaryLight,
      gap: 6,
    },
    actionButtonDanger: {
      backgroundColor: theme.dangerLight,
    },
    actionText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    actionTextDanger: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
    },
  });
