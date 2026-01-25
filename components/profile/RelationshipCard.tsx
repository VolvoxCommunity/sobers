import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart, UserMinus, CheckCircle, Plus } from 'lucide-react-native';
import type { ThemeColors } from '@/contexts/ThemeContext';
import { useDaysSober } from '@/hooks/useDaysSober';
import type { Profile, ExternalHandles, SponsorSponseeRelationship } from '@/types/database';
import SymmetricRevealSection from '@/components/profile/SymmetricRevealSection';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Task statistics for a sponsee.
 */
interface TaskStats {
  /** Total number of tasks assigned */
  total: number;
  /** Number of completed tasks */
  completed: number;
}

/**
 * Props for the RelationshipCard component.
 */
interface RelationshipCardProps {
  /** The user ID to fetch days sober for */
  userId: string;
  /** Profile information of the related user */
  profile: Profile | null;
  /** ISO date string of when the relationship was established */
  connectedAt: string;
  /** Type of relationship: 'sponsor' or 'sponsee' */
  relationshipType: 'sponsor' | 'sponsee';
  /** Theme object from ThemeContext */
  theme: ThemeColors;
  /** Callback when disconnect button is pressed */
  onDisconnect: () => void;
  /** Optional task statistics (only shown for sponsees) */
  taskStats?: TaskStats;
  /** Optional callback when "Assign a task" link is pressed (only shown when no tasks assigned) */
  onAssignTask?: () => void;
  /** Full relationship object for symmetric reveal consent */
  relationship?: SponsorSponseeRelationship;
  /** Current user's external handles */
  myHandles?: ExternalHandles;
  /** Callback when consent changes */
  onConsentChange?: (consent: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Displays a card for a sponsor or sponsee relationship showing avatar, name,
 * connection date, optional sobriety days, optional task completion stats,
 * and a disconnect button.
 *
 * @param props - Component props
 * @returns The relationship card component
 *
 * @example
 * ```tsx
 * <RelationshipCard
 *   userId="user-123"
 *   profile={sponseeProfile}
 *   connectedAt="2024-02-01T00:00:00Z"
 *   relationshipType="sponsee"
 *   theme={theme}
 *   onDisconnect={() => {}}
 *   taskStats={{ total: 5, completed: 3 }}
 *   onAssignTask={() => router.push('/tasks')}
 * />
 * ```
 */
export default function RelationshipCard({
  userId,
  profile,
  connectedAt,
  relationshipType,
  theme,
  onDisconnect,
  taskStats,
  onAssignTask,
  relationship,
  myHandles,
  onConsentChange,
}: RelationshipCardProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { daysSober, loading: loadingDaysSober } = useDaysSober(userId);

  const displayName = profile?.display_name ?? 'Unknown';
  const initial = (displayName[0] || '?').toUpperCase();
  const formattedDate = new Date(connectedAt).toLocaleDateString();

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`${relationshipType === 'sponsor' ? 'Sponsor' : 'Sponsee'} ${displayName}`}
    >
      <View style={styles.header}>
        <View style={styles.avatar} accessibilityRole="image">
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>Connected {formattedDate}</Text>
          {profile?.sobriety_date && (
            <View
              style={styles.sobrietyInfo}
              accessibilityLabel={
                loadingDaysSober
                  ? 'Loading days sober'
                  : `${daysSober} ${daysSober === 1 ? 'day' : 'days'} sober`
              }
            >
              <Heart size={14} color={theme.primary} fill={theme.primary} />
              <Text style={styles.sobrietyText}>
                {loadingDaysSober
                  ? '...'
                  : `${daysSober} ${daysSober === 1 ? 'day' : 'days'} sober`}
              </Text>
            </View>
          )}
          {taskStats && relationshipType === 'sponsee' && taskStats.total > 0 && (
            <View
              style={styles.taskStatsInfo}
              accessibilityLabel={`${taskStats.completed} out of ${taskStats.total} tasks completed`}
            >
              <CheckCircle size={14} color={theme.success} />
              <Text style={styles.taskStatsText}>
                {taskStats.completed}/{taskStats.total} tasks completed
              </Text>
            </View>
          )}
          {taskStats && relationshipType === 'sponsee' && taskStats.total === 0 && onAssignTask && (
            <TouchableOpacity
              style={styles.assignTaskLink}
              onPress={onAssignTask}
              accessibilityRole="link"
              accessibilityLabel="Assign a task"
              accessibilityHint="Opens the task creation screen"
            >
              <Plus size={14} color={theme.primary} />
              <Text style={styles.assignTaskText}>Assign a task</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Symmetric Reveal Section */}
      {relationship && onConsentChange && (
        <SymmetricRevealSection
          relationshipId={relationship.id}
          hasMyConsent={
            // When viewing my sponsor, I'm the sponsee; when viewing my sponsee, I'm the sponsor
            relationshipType === 'sponsor'
              ? !!relationship.sponsee_reveal_consent
              : !!relationship.sponsor_reveal_consent
          }
          hasTheirConsent={
            // Their consent is the opposite field
            relationshipType === 'sponsor'
              ? !!relationship.sponsor_reveal_consent
              : !!relationship.sponsee_reveal_consent
          }
          otherProfile={profile}
          myHandles={myHandles}
          relationshipType={relationshipType}
          theme={theme}
          onConsentChange={onConsentChange}
        />
      )}

      <TouchableOpacity
        style={styles.disconnectButton}
        onPress={onDisconnect}
        accessibilityRole="button"
        accessibilityLabel={`Disconnect from ${displayName}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <UserMinus size={18} color={theme.danger} />
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
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
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.white,
    },
    info: {
      marginLeft: 12,
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    meta: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    sobrietyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    sobrietyText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      fontWeight: '600',
    },
    taskStatsInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    taskStatsText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.success,
      fontWeight: '600',
    },
    assignTaskLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    assignTaskText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      fontWeight: '600',
    },
    disconnectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerLight,
    },
    disconnectText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.danger,
      marginLeft: 12,
    },
  });
