import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Users, Search, Check, X, Clock, UserPlus, Shield } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import type { ConnectionMatch, ConnectionIntent, PotentialMatch } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/lib/toast';
import { logger } from '@/lib/logger';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the FindSupportSection component.
 */
interface FindSupportSectionProps {
  /** Current user's ID */
  userId: string;
  /** Current user's connection intent */
  intent: ConnectionIntent | null | undefined;
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Pending matches for this user */
  pendingMatches: ConnectionMatch[];
  /** Callback to refresh matches after action */
  onMatchUpdate: () => void;
  /** Whether the section is disabled */
  disabled?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get time remaining until match expires.
 */
function getTimeRemaining(expiresAt: string): {
  days: number;
  hours: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, isExpired: true, isExpiringSoon: false };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isExpiringSoon = days < 2;

  return { days, hours, isExpired: false, isExpiringSoon };
}

/**
 * Format the user's role in this match (seeker or provider).
 */
function getUserRole(match: ConnectionMatch, visibleMatches: string): 'seeker' | 'provider' {
  return match.seeker_id === visibleMatches ? 'seeker' : 'provider';
}

/**
 * Get display text for intent.
 */
function getIntentLabel(intent: ConnectionIntent | null | undefined): string {
  switch (intent) {
    case 'seeking_sponsor':
      return 'Looking for a sponsor';
    case 'open_to_sponsoring':
      return 'Open to sponsoring';
    case 'open_to_both':
      return 'Open to both';
    default:
      return 'Not set';
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * A section for opt-in matching to find sponsors/sponsees.
 * No feeds, no browsing - system proposes matches based on mutual needs.
 * Both parties must accept to connect.
 *
 * @example
 * ```tsx
 * <FindSupportSection
 *   userId={user.id}
 *   intent={profile.connection_intent}
 *   theme={theme}
 *   pendingMatches={matches}
 *   onMatchUpdate={refreshMatches}
 * />
 * ```
 */
export default function FindSupportSection({
  userId,
  intent,
  theme,
  pendingMatches,
  onMatchUpdate,
  disabled = false,
}: FindSupportSectionProps): React.JSX.Element | null {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Check if section should be shown (computed before hooks that use intent)
  const shouldShow = intent && intent !== 'not_looking';

  const findMatches = useCallback(async () => {
    if (!shouldShow) return;
    if (disabled || isSearching) return;

    setIsSearching(true);
    try {
      // Call the database function to find potential matches
      const { data, error } = await supabase.rpc('find_potential_matches', {
        user_id: userId,
        max_results: 3,
      });

      if (error) {
        logger.error('Failed to find matches', new Error(error.message));
        showToast.error('Failed to find matches');
        return;
      }

      const potentialMatches = data as PotentialMatch[];

      if (!potentialMatches || potentialMatches.length === 0) {
        showToast.info('No matches found right now. Check back later!');
        return;
      }

      // Create match requests for each potential match
      const isSeeking = intent === 'seeking_sponsor' || intent === 'open_to_both';

      for (const match of potentialMatches) {
        const matchData = isSeeking
          ? { seeker_id: userId, provider_id: match.matched_user_id }
          : { seeker_id: match.matched_user_id, provider_id: userId };

        const { error: insertError } = await supabase.from('connection_matches').insert(matchData);

        if (insertError && !insertError.message.includes('unique')) {
          logger.warn('Failed to create match', { errorMessage: insertError.message });
        }
      }

      showToast.success(`Found ${potentialMatches.length} potential match(es)!`);
      onMatchUpdate();
    } catch (error) {
      logger.error('Error finding matches', error as Error);
      showToast.error('Something went wrong');
    } finally {
      setIsSearching(false);
    }
  }, [userId, intent, disabled, isSearching, onMatchUpdate, shouldShow]);

  const acceptMatch = useCallback(
    async (matchId: string) => {
      if (disabled || isProcessing) return;

      setIsProcessing(matchId);
      try {
        const { data, error } = await supabase.rpc('accept_match', {
          match_id: matchId,
        });

        if (error) {
          logger.error('Failed to accept match', new Error(error.message));
          showToast.error('Failed to accept match');
          return;
        }

        const result = data as ConnectionMatch;
        if (result.status === 'accepted') {
          showToast.success('Connection established!');
        } else {
          showToast.success('Match accepted! Waiting for other party.');
        }
        onMatchUpdate();
      } catch (error) {
        logger.error('Error accepting match', error as Error);
        showToast.error('Something went wrong');
      } finally {
        setIsProcessing(null);
      }
    },
    [disabled, isProcessing, onMatchUpdate]
  );

  const rejectMatch = useCallback(
    async (matchId: string) => {
      if (disabled || isProcessing) return;

      setIsProcessing(matchId);
      try {
        const { error } = await supabase.rpc('reject_match', {
          match_id: matchId,
        });

        if (error) {
          logger.error('Failed to reject match', new Error(error.message));
          showToast.error('Failed to decline match');
          return;
        }

        showToast.info('Match declined');
        onMatchUpdate();
      } catch (error) {
        logger.error('Error rejecting match', error as Error);
        showToast.error('Something went wrong');
      } finally {
        setIsProcessing(null);
      }
    },
    [disabled, isProcessing, onMatchUpdate]
  );

  // Separate matches by user's role and acceptance status
  const matchesNeedingAction = pendingMatches.filter((m) => {
    const role = getUserRole(m, userId);
    return role === 'seeker' ? m.seeker_accepted === null : m.provider_accepted === null;
  });

  const matchesWaiting = pendingMatches.filter((m) => {
    const role = getUserRole(m, userId);
    return role === 'seeker'
      ? m.seeker_accepted === true && m.provider_accepted === null
      : m.provider_accepted === true && m.seeker_accepted === null;
  });

  // Don't show if not looking or no intent set (after all hooks)
  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.container} testID="find-support-section">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={20} color={theme.primary} />
          <Text style={styles.title}>Find Support</Text>
        </View>
        <View style={styles.privacyBadge}>
          <Shield size={12} color={theme.success} />
          <Text style={styles.privacyText}>Private</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        {getIntentLabel(intent)} • System finds compatible matches for you
      </Text>

      {/* Pending matches needing action */}
      {matchesNeedingAction.length > 0 && (
        <View style={styles.matchesSection}>
          <Text style={styles.sectionLabel}>New Matches</Text>
          {matchesNeedingAction.map((match) => {
            const role = getUserRole(match, userId);
            const otherUser = role === 'seeker' ? match.provider : match.seeker;
            const timeLeft = getTimeRemaining(match.expires_at);
            const isProcessingThis = isProcessing === match.id;

            return (
              <View key={match.id} style={styles.matchCard}>
                <View style={styles.matchInfo}>
                  <View style={styles.matchIcon}>
                    <UserPlus size={20} color={theme.primary} />
                  </View>
                  <View style={styles.matchDetails}>
                    <Text style={styles.matchName}>{otherUser?.display_name || 'Anonymous'}</Text>
                    <View style={styles.matchMeta}>
                      <Clock size={12} color={theme.textSecondary} />
                      <Text
                        style={[
                          styles.matchExpiry,
                          timeLeft.isExpiringSoon && styles.matchExpiryWarn,
                        ]}
                      >
                        {timeLeft.days > 0
                          ? `${timeLeft.days}d ${timeLeft.hours}h left`
                          : `${timeLeft.hours}h left`}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.matchActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => rejectMatch(match.id)}
                    disabled={disabled || isProcessingThis}
                    accessibilityRole="button"
                    accessibilityLabel="Decline match"
                  >
                    {isProcessingThis ? (
                      <ActivityIndicator size="small" color={theme.danger} />
                    ) : (
                      <X size={18} color={theme.danger} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => acceptMatch(match.id)}
                    disabled={disabled || isProcessingThis}
                    accessibilityRole="button"
                    accessibilityLabel="Accept match"
                  >
                    {isProcessingThis ? (
                      <ActivityIndicator size="small" color={theme.success} />
                    ) : (
                      <Check size={18} color={theme.success} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Matches waiting for other party */}
      {matchesWaiting.length > 0 && (
        <View style={styles.matchesSection}>
          <Text style={styles.sectionLabel}>Waiting for Response</Text>
          {matchesWaiting.map((match) => {
            const role = getUserRole(match, userId);
            const otherUser = role === 'seeker' ? match.provider : match.seeker;
            const timeLeft = getTimeRemaining(match.expires_at);

            return (
              <View key={match.id} style={[styles.matchCard, styles.matchCardWaiting]}>
                <View style={styles.matchInfo}>
                  <View style={[styles.matchIcon, styles.matchIconWaiting]}>
                    <Clock size={20} color={theme.textSecondary} />
                  </View>
                  <View style={styles.matchDetails}>
                    <Text style={styles.matchName}>{otherUser?.display_name || 'Anonymous'}</Text>
                    <Text style={styles.matchWaitingText}>Waiting for them to respond</Text>
                  </View>
                </View>
                <Text
                  style={[styles.matchExpiry, timeLeft.isExpiringSoon && styles.matchExpiryWarn]}
                >
                  {timeLeft.days > 0 ? `${timeLeft.days}d` : `${timeLeft.hours}h`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Find matches button */}
      <TouchableOpacity
        style={[styles.findButton, isSearching && styles.findButtonDisabled]}
        onPress={findMatches}
        disabled={disabled || isSearching}
        accessibilityRole="button"
        accessibilityLabel="Find new matches"
        testID="find-matches-button"
      >
        {isSearching ? (
          <ActivityIndicator size="small" color={theme.white} />
        ) : (
          <>
            <Search size={18} color={theme.white} />
            <Text style={styles.findButtonText}>Find Matches</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Privacy note */}
      <Text style={styles.privacyNote}>
        Matches are private. Only you and your match can see each other.
      </Text>
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
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    privacyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.successLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    privacyText: {
      fontSize: 11,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.success,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    matchesSection: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    matchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    matchCardWaiting: {
      opacity: 0.7,
    },
    matchInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    matchIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    matchIconWaiting: {
      backgroundColor: theme.border,
    },
    matchDetails: {
      marginLeft: 12,
      flex: 1,
    },
    matchName: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    matchMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    matchExpiry: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    matchExpiryWarn: {
      color: theme.warning,
    },
    matchWaitingText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    matchActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rejectButton: {
      backgroundColor: theme.dangerLight,
    },
    acceptButton: {
      backgroundColor: theme.successLight,
    },
    findButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      gap: 8,
    },
    findButtonDisabled: {
      opacity: 0.6,
    },
    findButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    privacyNote: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
  });
