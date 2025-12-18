import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { SponsorSponseeRelationship, Task, Profile } from '@/types/database';
import { useDaysSober } from '@/hooks/useDaysSober';
import {
  Heart,
  CheckCircle,
  Users,
  Award,
  UserMinus,
  Plus,
  BookOpen,
  ClipboardList,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import TaskCreationSheet, { TaskCreationSheetRef } from '@/components/TaskCreationSheet';
import { logger, LogCategory } from '@/lib/logger';
import { parseDateAsLocal } from '@/lib/date';
import { showAlert, showConfirm } from '@/lib/alert';

/**
 * Render the home dashboard that displays sobriety summary, active sponsor/sponsee relationships, recent assigned tasks, and quick actions.
 *
 * The screen fetches active relationships and recent tasks, supports pull-to-refresh, allows disconnecting relationships, and opens the task creation sheet for sponsees.
 *
 * @returns The Home screen React element
 */
export default function HomeScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  // Get safe area insets for scroll padding
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? insets.bottom : 0;
  const [relationships, setRelationships] = useState<SponsorSponseeRelationship[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSponseeId, setSelectedSponseeId] = useState<string>('');
  const [sponseeProfiles, setSponseeProfiles] = useState<Profile[]>([]);
  const router = useRouter();
  const { daysSober, currentStreakStartDate, loading: loadingDaysSober } = useDaysSober();
  const taskSheetRef = useRef<TaskCreationSheetRef>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data: asSponsor, error: asSponsorError } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .eq('status', 'active');

    if (asSponsorError) {
      logger.error('Failed to fetch sponsor relationships', asSponsorError as Error, {
        category: LogCategory.DATABASE,
      });
      return;
    }

    const { data: asSponsee, error: asSponseeError } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsor:sponsor_id(*)')
      .eq('sponsee_id', profile.id)
      .eq('status', 'active');

    if (asSponseeError) {
      logger.error('Failed to fetch sponsee relationships', asSponseeError as Error, {
        category: LogCategory.DATABASE,
      });
      return;
    }

    setRelationships([...(asSponsor || []), ...(asSponsee || [])]);
    const profiles = (asSponsor || []).map((rel) => rel.sponsee).filter(Boolean) as Profile[];
    setSponseeProfiles(profiles);

    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('sponsee_id', profile.id)
      .eq('status', 'assigned')
      .order('created_at', { ascending: false })
      .limit(3);

    if (tasksError) {
      logger.error('Failed to fetch tasks', tasksError as Error, {
        category: LogCategory.DATABASE,
      });
      return;
    }

    setTasks(tasksData || []);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [profile, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDisconnect = async (
    relationshipId: string,
    isSponsor: boolean,
    otherUserName: string
  ) => {
    const confirmMessage = isSponsor
      ? `Disconnect from ${otherUserName}? This will end the sponsee relationship.`
      : `Disconnect from ${otherUserName}? This will end the sponsor relationship.`;

    const confirmed = await showConfirm(
      'Confirm Disconnection',
      confirmMessage,
      'Disconnect',
      'Cancel',
      true
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('sponsor_sponsee_relationships')
        .update({
          status: 'inactive',
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', relationshipId);

      if (error) throw error;

      const relationship = relationships.find((r) => r.id === relationshipId);
      if (relationship && profile) {
        const notificationRecipientId = isSponsor
          ? relationship.sponsee_id
          : relationship.sponsor_id;
        const notificationSenderName = profile.display_name ?? 'Someone';

        await supabase.from('notifications').insert([
          {
            user_id: notificationRecipientId,
            type: 'connection_request',
            title: 'Relationship Ended',
            content: `${notificationSenderName} has ended the ${isSponsor ? 'sponsorship' : 'sponsee'} relationship.`,
            data: { relationship_id: relationshipId },
          },
        ]);
      }

      await fetchData();

      showAlert('Success', 'Successfully disconnected');
    } catch (error: unknown) {
      logger.error('Relationship disconnect failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to disconnect.';
      showAlert('Error', message);
    }
  };

  const getMilestone = (days: number) => {
    if (days >= 365)
      return {
        text: `${Math.floor(days / 365)} Year${Math.floor(days / 365) > 1 ? 's' : ''}`,
        color: theme.primary,
      };
    if (days >= 180) return { text: '6 Months', color: theme.primary };
    if (days >= 90) return { text: '90 Days', color: theme.primary };
    if (days >= 30) return { text: '30 Days', color: theme.primary };
    if (days >= 7) return { text: '1 Week', color: theme.primary };
    if (days >= 1) return { text: '24 Hours', color: theme.primary };
    return { text: '< 24 Hours', color: theme.textSecondary };
  };

  const milestone = getMilestone(daysSober);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      testID="home-scroll-view"
      style={styles.container}
      contentContainerStyle={{ paddingBottom: tabBarHeight }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.display_name || 'Friend'}</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.sobrietyCard}>
        <View style={styles.sobrietyHeader}>
          <Heart size={32} color={theme.primary} fill={theme.primary} />
          <View style={styles.sobrietyInfo}>
            <Text style={styles.sobrietyTitle}>Your Sobriety Journey</Text>
            <Text style={styles.sobrietyDate}>
              Since{' '}
              {currentStreakStartDate
                ? parseDateAsLocal(currentStreakStartDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set'}
            </Text>
          </View>
        </View>
        <View
          style={styles.daysSoberContainer}
          accessible={true}
          accessibilityLabel={`${loadingDaysSober ? 'Loading' : daysSober} days sober, milestone: ${milestone.text}`}
        >
          <Text testID="home-days-sober-count" style={styles.daysSoberCount}>
            {loadingDaysSober ? '...' : daysSober}
          </Text>
          <Text testID="home-days-sober-label" style={styles.daysSoberLabel}>
            Days Sober
          </Text>
          <View style={[styles.milestoneBadge, { backgroundColor: milestone.color }]}>
            <Award size={16} color={theme.white} />
            <Text style={styles.milestoneText}>{milestone.text}</Text>
          </View>
        </View>
      </View>

      {relationships.filter((rel) => rel.sponsor_id !== profile?.id).length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={24} color={theme.textSecondary} />
            <Text style={styles.cardTitle}>Your Sponsor</Text>
          </View>
          {relationships
            .filter((rel) => rel.sponsor_id !== profile?.id)
            .map((rel) => (
              <View key={rel.id} style={styles.relationshipItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(rel.sponsor?.display_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.relationshipInfo}>
                  <Text style={styles.relationshipName}>{rel.sponsor?.display_name ?? '?'}</Text>
                  <Text style={styles.relationshipMeta}>
                    Connected {new Date(rel.connected_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Disconnect from ${rel.sponsor?.display_name ?? 'sponsor'}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() =>
                    handleDisconnect(rel.id, false, rel.sponsor?.display_name ?? 'sponsor')
                  }
                >
                  <UserMinus size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={24} color={theme.textSecondary} />
          <Text style={styles.cardTitle}>Your Sponsees</Text>
        </View>
        {relationships.filter((rel) => rel.sponsor_id === profile?.id).length === 0 ? (
          <Text style={styles.emptyText}>No sponsees yet. Share your invite code to connect.</Text>
        ) : (
          relationships
            .filter((rel) => rel.sponsor_id === profile?.id)
            .map((rel) => (
              <View key={rel.id} style={styles.relationshipItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(rel.sponsee?.display_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.relationshipInfo}>
                  <Text style={styles.relationshipName}>{rel.sponsee?.display_name ?? '?'}</Text>
                  <Text style={styles.relationshipMeta}>
                    Connected {new Date(rel.connected_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.assignTaskButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign task to ${rel.sponsee?.display_name ?? 'sponsee'}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    setSelectedSponseeId(rel.sponsee_id);
                    taskSheetRef.current?.present();
                  }}
                >
                  <Plus size={16} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Disconnect from ${rel.sponsee?.display_name ?? 'sponsee'}`}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() =>
                    handleDisconnect(rel.id, true, rel.sponsee?.display_name ?? 'sponsee')
                  }
                >
                  <UserMinus size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))
        )}
      </View>

      <TaskCreationSheet
        ref={taskSheetRef}
        onClose={() => {
          setSelectedSponseeId('');
        }}
        onTaskCreated={fetchData}
        sponsorId={profile?.id || ''}
        sponsees={sponseeProfiles}
        preselectedSponseeId={selectedSponseeId}
        theme={theme}
      />

      {tasks.length > 0 && (
        <View testID="home-tasks-section" style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={24} color={theme.textSecondary} />
            <Text style={styles.cardTitle}>Recent Tasks</Text>
          </View>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => router.push('/tasks')}
              accessibilityRole="button"
              accessibilityLabel={`Task: ${task.title}, Step ${task.step_number}, Status: New`}
            >
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>Step {task.step_number}</Text>
              </View>
              <View style={styles.taskBadge}>
                <Text style={styles.taskBadgeText}>New</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            testID="home-view-tasks-button"
            style={styles.viewAllButton}
            onPress={() => router.push('/tasks')}
            accessibilityRole="button"
            accessibilityLabel="View All Tasks"
          >
            <Text style={styles.viewAllText}>View All Tasks</Text>
          </TouchableOpacity>
        </View>
      )}

      <View testID="home-quick-actions" style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/steps')}
          accessibilityRole="button"
          accessibilityLabel="Open 12 Steps, Learn and Reflect"
        >
          <BookOpen size={32} color={theme.primary} />
          <Text style={styles.actionTitle}>12 Steps</Text>
          <Text style={styles.actionSubtitle}>Learn & Reflect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/tasks')}
          accessibilityRole="button"
          accessibilityLabel="Open Manage Tasks, Guide Progress"
        >
          <ClipboardList size={32} color={theme.primary} />
          <Text style={styles.actionTitle}>Manage Tasks</Text>
          <Text style={styles.actionSubtitle}>Guide Progress</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 24,
      paddingTop: 60,
    },
    greeting: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    date: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    sobrietyCard: {
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
    sobrietyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    sobrietyInfo: {
      marginLeft: 16,
      flex: 1,
    },
    sobrietyTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    sobrietyDate: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    daysSoberContainer: {
      alignItems: 'center',
    },
    daysSoberCount: {
      fontSize: 64,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
    },
    daysSoberLabel: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 8,
    },
    milestoneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginTop: 16,
    },
    milestoneText: {
      color: theme.white,
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      marginLeft: 6,
    },
    card: {
      backgroundColor: theme.card,
      margin: 16,
      marginTop: 0,
      padding: 20,
      borderRadius: 16,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    relationshipItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
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
      fontWeight: '600',
      color: theme.white,
    },
    relationshipInfo: {
      marginLeft: 12,
      flex: 1,
    },
    relationshipName: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    relationshipMeta: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingVertical: 16,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    taskInfo: {
      flex: 1,
    },
    taskTitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    taskMeta: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    taskBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    taskBadgeText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    viewAllButton: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    viewAllText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    quickActions: {
      flexDirection: 'row',
      padding: 16,
      paddingTop: 0,
      gap: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: theme.card,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    actionTitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginTop: 12,
    },
    actionSubtitle: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    assignTaskButton: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primaryLight,
      backgroundColor: theme.primaryLight,
      marginRight: 8,
    },
    disconnectButton: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerLight,
    },
  });
