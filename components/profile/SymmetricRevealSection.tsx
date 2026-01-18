import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Eye, EyeOff, MessageCircle, Phone, Send, Shield, Check, Clock } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { ExternalHandles, Profile } from '@/types/database';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Reveal state between two users.
 */
type RevealState = 'none' | 'you_pending' | 'them_pending' | 'mutual';

/**
 * Props for the SymmetricRevealSection component.
 */
interface SymmetricRevealSectionProps {
  /** Whether the current user has opted in to reveal */
  myConsent: boolean;
  /** Whether the other user has opted in to reveal */
  theirConsent: boolean;
  /** The other user's profile (for displaying revealed handles) */
  otherProfile: Profile | null;
  /** Current user's handles (for displaying when mutual) */
  myHandles: ExternalHandles | undefined;
  /** Relationship type to determine labels */
  relationshipType: 'sponsor' | 'sponsee';
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Callback when consent toggle changes */
  onConsentChange: (consent: boolean) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the reveal state based on both parties' consent.
 */
function getRevealState(myConsent: boolean, theirConsent: boolean): RevealState {
  if (myConsent && theirConsent) return 'mutual';
  if (myConsent && !theirConsent) return 'you_pending';
  if (!myConsent && theirConsent) return 'them_pending';
  return 'none';
}

/**
 * Get icon for a platform.
 */
function getPlatformIcon(key: string, theme: ThemeColors): React.ReactNode {
  switch (key) {
    case 'discord':
      return <MessageCircle size={16} color={theme.primary} />;
    case 'telegram':
      return <Send size={16} color={theme.info} />;
    case 'whatsapp':
    case 'phone':
      return <Phone size={16} color={theme.success} />;
    case 'signal':
      return <Shield size={16} color={theme.warning} />;
    default:
      return <MessageCircle size={16} color={theme.textSecondary} />;
  }
}

/**
 * Get label for a platform key.
 */
function getPlatformLabel(key: string): string {
  const labels: Record<string, string> = {
    discord: 'Discord',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    signal: 'Signal',
    phone: 'Phone',
  };
  return labels[key] || key;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Displays the symmetric reveal section for a connection.
 * Shows consent toggle and revealed handles when mutual consent is achieved.
 *
 * @example
 * ```tsx
 * <SymmetricRevealSection
 *   myConsent={relationship.sponsee_reveal_consent}
 *   theirConsent={relationship.sponsor_reveal_consent}
 *   otherProfile={relationship.sponsor}
 *   myHandles={profile.external_handles}
 *   relationshipType="sponsor"
 *   theme={theme}
 *   onConsentChange={(consent) => updateConsent(consent)}
 * />
 * ```
 */
export default function SymmetricRevealSection({
  myConsent,
  theirConsent,
  otherProfile,
  myHandles,
  relationshipType,
  theme,
  onConsentChange,
  disabled = false,
}: SymmetricRevealSectionProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const revealState = getRevealState(myConsent, theirConsent);

  const otherName = otherProfile?.display_name || 'Unknown';
  const otherHandles = otherProfile?.external_handles || {};
  const hasOtherHandles = Object.keys(otherHandles).length > 0;
  const hasMyHandles = myHandles && Object.keys(myHandles).length > 0;

  return (
    <View style={styles.container} testID="symmetric-reveal-section">
      {/* Consent Toggle */}
      <View style={styles.consentRow}>
        <View style={styles.consentInfo}>
          {myConsent ? (
            <Eye size={18} color={theme.primary} />
          ) : (
            <EyeOff size={18} color={theme.textSecondary} />
          )}
          <View style={styles.consentText}>
            <Text style={styles.consentLabel}>Share my contact info</Text>
            <Text style={styles.consentDescription}>
              {myConsent
                ? hasMyHandles
                  ? 'Your handles will be visible when mutual'
                  : 'Add contact methods in Settings first'
                : 'Your contact info is hidden'}
            </Text>
          </View>
        </View>
        <Switch
          value={myConsent}
          onValueChange={onConsentChange}
          disabled={disabled}
          trackColor={{ false: theme.border, true: theme.primaryLight }}
          thumbColor={myConsent ? theme.primary : theme.card}
          accessibilityLabel="Toggle contact info sharing"
        />
      </View>

      {/* Status Display */}
      <View style={styles.statusContainer}>
        {revealState === 'none' && (
          <View style={styles.statusRow}>
            <EyeOff size={14} color={theme.textSecondary} />
            <Text style={styles.statusText}>Neither party has opted to share contact info</Text>
          </View>
        )}

        {revealState === 'you_pending' && (
          <View style={[styles.statusRow, styles.statusPending]}>
            <Clock size={14} color={theme.warning} />
            <Text style={[styles.statusText, styles.statusTextPending]}>
              {"You've opted in. Waiting for "}
              {otherName}
              {' to share.'}
            </Text>
          </View>
        )}

        {revealState === 'them_pending' && (
          <View style={[styles.statusRow, styles.statusPending]}>
            <Clock size={14} color={theme.info} />
            <Text style={[styles.statusText, styles.statusTextInfo]}>
              {otherName} wants to share. Toggle on to reveal mutually.
            </Text>
          </View>
        )}

        {revealState === 'mutual' && (
          <View style={[styles.statusRow, styles.statusMutual]}>
            <Check size={14} color={theme.success} />
            <Text style={[styles.statusText, styles.statusTextMutual]}>
              Mutual consent! Contact info revealed.
            </Text>
          </View>
        )}
      </View>

      {/* Revealed Handles */}
      {revealState === 'mutual' && hasOtherHandles && (
        <View style={styles.handlesContainer}>
          <Text style={styles.handlesTitle}>{otherName}&apos;s Contact Info</Text>
          <View style={styles.handlesList}>
            {Object.entries(otherHandles).map(([key, value]) => (
              <View key={key} style={styles.handleRow}>
                {getPlatformIcon(key, theme)}
                <Text style={styles.handlePlatform}>{getPlatformLabel(key)}:</Text>
                <Text style={styles.handleValue} selectable>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No handles warning */}
      {revealState === 'mutual' && !hasOtherHandles && (
        <View style={styles.noHandlesContainer}>
          <Text style={styles.noHandlesText}>
            {otherName} hasn&apos;t added any contact methods yet.
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    consentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    consentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 10,
    },
    consentText: {
      flex: 1,
    },
    consentLabel: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    consentDescription: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusContainer: {
      marginTop: 12,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      padding: 10,
      borderRadius: 8,
      gap: 8,
    },
    statusPending: {
      backgroundColor: theme.primaryLight,
    },
    statusMutual: {
      backgroundColor: theme.successLight,
    },
    statusText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      flex: 1,
    },
    statusTextPending: {
      color: theme.warning,
    },
    statusTextInfo: {
      color: theme.info,
    },
    statusTextMutual: {
      color: theme.success,
    },
    handlesContainer: {
      marginTop: 12,
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    handlesTitle: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    handlesList: {
      gap: 8,
    },
    handleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    handlePlatform: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    handleValue: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.text,
      fontWeight: '500',
    },
    noHandlesContainer: {
      marginTop: 12,
      backgroundColor: theme.primaryLight,
      padding: 10,
      borderRadius: 8,
    },
    noHandlesText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.warning,
    },
  });
