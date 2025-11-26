import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
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
import TaskCreationModal from '@/components/TaskCreationModal';
import { logger, LogCategory } from '@/lib/logger';

export default function HomeScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [relationships, setRelationships] = useState<SponsorSponseeRelationship[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedSponseeId, setSelectedSponseeId] = useState<string>('');
  const [sponseeProfiles, setSponseeProfiles] = useState<Profile[]>([]);
  const router = useRouter();
  const { daysSober, currentStreakStartDate, loading: loadingDaysSober } = useDaysSober();

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data: asSponsor } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .eq('status', 'active');

    const { data: asSponsee } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsor:sponsor_id(*)')
      .eq('sponsee_id', profile.id)
      .eq('status', 'active');

    setRelationships([...(asSponsor || []), ...(asSponsee || [])]);
    const profiles = (asSponsor || []).map((rel) => rel.sponsee).filter(Boolean) as Profile[];
    setSponseeProfiles(profiles);

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('sponsee_id', profile.id)
      .eq('status', 'assigned')
      .order('created_at', { ascending: false })
      .limit(3);
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

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Disconnection', confirmMessage, [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });

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
        const notificationSenderName = `${profile.first_name} ${profile.last_initial}.`;

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

      if (Platform.OS === 'web') {
        window.alert('Successfully disconnected');
      } else {
        Alert.alert('Success', 'Successfully disconnected');
      }
    } catch (error: unknown) {
      logger.error('Relationship disconnect failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to disconnect.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const getMilestone = (days: number) => {
    if (days >= 365)
      return {
        text: `${Math.floor(days / 365)} Year${Math.floor(days / 365) > 1 ? 's' : ''}`,
        color: '#007AFF',
      };
    if (days >= 180) return { text: '6 Months', color: '#007AFF' };
    if (days >= 90) return { text: '90 Days', color: '#007AFF' };
    if (days >= 30) return { text: '30 Days', color: '#007AFF' };
    if (days >= 7) return { text: '1 Week', color: '#007AFF' };
    if (days >= 1) return { text: '24 Hours', color: '#007AFF' };
    return { text: '< 24 Hours', color: '#6b7280' };
  };

  const milestone = getMilestone(daysSober);
  const styles = createStyles(theme);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.first_name || 'Friend'}</Text>
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
                ? new Date(currentStreakStartDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set'}
            </Text>
          </View>
        </View>
        <View style={styles.daysSoberContainer}>
          <Text style={styles.daysSoberCount}>{loadingDaysSober ? '...' : daysSober}</Text>
          <Text style={styles.daysSoberLabel}>Days Sober</Text>
          <View style={[styles.milestoneBadge, { backgroundColor: milestone.color }]}>
            <Award size={16} color="#ffffff" />
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
                    {(rel.sponsor?.first_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.relationshipInfo}>
                  <Text style={styles.relationshipName}>
                    {rel.sponsor?.first_name} {rel.sponsor?.last_initial}.
                  </Text>
                  <Text style={styles.relationshipMeta}>
                    Connected {new Date(rel.connected_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() =>
                    handleDisconnect(
                      rel.id,
                      false,
                      `${rel.sponsor?.first_name} ${rel.sponsor?.last_initial}.`
                    )
                  }
                >
                  <UserMinus size={16} color="#ef4444" />
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
                    {(rel.sponsee?.first_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.relationshipInfo}>
                  <Text style={styles.relationshipName}>
                    {rel.sponsee?.first_name} {rel.sponsee?.last_initial}.
                  </Text>
                  <Text style={styles.relationshipMeta}>
                    Connected {new Date(rel.connected_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.assignTaskButton}
                  onPress={() => {
                    setSelectedSponseeId(rel.sponsee_id);
                    setShowTaskModal(true);
                  }}
                >
                  <Plus size={16} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.disconnectButton}
                  onPress={() =>
                    handleDisconnect(
                      rel.id,
                      true,
                      `${rel.sponsee?.first_name} ${rel.sponsee?.last_initial}.`
                    )
                  }
                >
                  <UserMinus size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
        )}
      </View>

      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedSponseeId('');
        }}
        onTaskCreated={fetchData}
        sponsorId={profile?.id || ''}
        sponsees={sponseeProfiles}
        preselectedSponseeId={selectedSponseeId}
        theme={theme}
      />

      {tasks.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CheckCircle size={24} color={theme.textSecondary} />
            <Text style={styles.cardTitle}>Recent Tasks</Text>
          </View>
          {tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskItem}
              onPress={() => router.push('/tasks')}
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
          <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/tasks')}>
            <Text style={styles.viewAllText}>View All Tasks</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/steps')}>
          <BookOpen size={32} color={theme.primary} />
          <Text style={styles.actionTitle}>12 Steps</Text>
          <Text style={styles.actionSubtitle}>Learn & Reflect</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/manage-tasks')}>
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
      color: '#ffffff',
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
      color: '#ffffff',
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
      color: '#ffffff',
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
      borderColor: '#fee2e2',
      backgroundColor: '#fef2f2',
    },
  });
