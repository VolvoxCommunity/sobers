import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { Eye, EyeOff, Check, Clock } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { ExternalHandles, Profile } from '@/types/database';
import { getPlatformIcon, getPlatformLabel } from '@/lib/platform-icons';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';

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
  /** The relationship ID for consent-checked handle fetching */
  relationshipId: string;
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
  relationshipId,
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

  // State for consent-checked handles fetched via RPC
  const [otherHandles, setOtherHandles] = useState<ExternalHandles>({});
  const [isLoadingHandles, setIsLoadingHandles] = useState(false);

  const otherName = otherProfile?.display_name || 'Unknown';
  const hasMyHandles = myHandles && Object.keys(myHandles).length > 0;

  // Fetch handles only when there's mutual consent (via secure RPC)
  useEffect(() => {
    let isMounted = true;

    if (revealState !== 'mutual') {
      setOtherHandles({});
      return;
    }

    const fetchHandles = async () => {
      setIsLoadingHandles(true);
      try {
        const { data, error } = await supabase.rpc('get_handles_with_consent', {
          relationship_id: relationshipId,
        });

        // Guard: Only update state if component is still mounted
        if (!isMounted) return;

        if (error) {
          logger.error('Failed to fetch handles with consent', new Error(error.message), {
            category: LogCategory.DATABASE,
          });
          return;
        }

        setOtherHandles((data as ExternalHandles) || {});
      } catch (err) {
        // Guard: Only update state if component is still mounted
        if (!isMounted) return;

        logger.error('Unexpected error fetching handles', err as Error, {
          category: LogCategory.DATABASE,
        });
      } finally {
        if (isMounted) {
          setIsLoadingHandles(false);
        }
      }
    };

    fetchHandles();

    return () => {
      isMounted = false;
    };
  }, [revealState, relationshipId]);

  // Filter out empty handle values
  const filteredHandles = Object.entries(otherHandles).filter(([_, v]) => Boolean(v));
  const hasOtherHandles = filteredHandles.length > 0;

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
      {revealState === 'mutual' && isLoadingHandles && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.loadingText}>Loading contact info...</Text>
        </View>
      )}
      {revealState === 'mutual' && !isLoadingHandles && hasOtherHandles && (
        <View style={styles.handlesContainer}>
          <Text style={styles.handlesTitle}>{otherName}&apos;s Contact Info</Text>
          <View style={styles.handlesList}>
            {filteredHandles.map(([key, value]) => (
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
      {revealState === 'mutual' && !isLoadingHandles && !hasOtherHandles && (
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
    loadingContainer: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
