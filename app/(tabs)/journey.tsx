import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { UserStepProgress, SlipUp, Task } from '@/types/database';
import {
  Calendar,
  CheckCircle,
  Heart,
  RefreshCw,
  Award,
  TrendingUp,
  CheckSquare,
  ListChecks,
  Target,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDaysSober } from '@/hooks/useDaysSober';

type TimelineEventType =
  | 'sobriety_start'
  | 'slip_up'
  | 'step_completion'
  | 'milestone'
  | 'task_completion'
  | 'task_milestone';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date;
  title: string;
  description: string;
  icon:
  | 'calendar'
  | 'check'
  | 'heart'
  | 'refresh'
  | 'award'
  | 'trending'
  | 'check-square'
  | 'list-checks'
  | 'target';
  color: string;
  metadata?: any;
}

/**
 * Displays the user's recovery journey timeline with milestones.
 *
 * @remarks
 * This component fetches timeline events from Supabase and displays
 * them in chronological order with visual indicators. Day counts
 * automatically update at midnight via the useDaysSober hook.
 *
 * @see {@link useDaysSober} for sobriety calculation logic
 */
export default function JourneyScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const {
    daysSober,
    journeyDays,
    hasSlipUps,
    mostRecentSlipUp,
    loading: loadingDaysSober,
  } = useDaysSober();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelineData = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timelineEvents: TimelineEvent[] = [];

      // 1. Fetch sobriety start date
      if (profile.sobriety_date) {
        timelineEvents.push({
          id: 'sobriety-start',
          type: 'sobriety_start',
          date: new Date(profile.sobriety_date),
          title: 'Recovery Journey Began',
          description: `Started your path to recovery`,
          icon: 'calendar',
          color: theme.primary,
        });
      }

      // 2. Fetch slip ups for timeline events (display only).
      // Note: Milestone calculation now uses `mostRecentSlipUp` from the `useDaysSober` hook, not this fetched data.
      const { data: slipUps, error: slipUpsError } = await supabase
        .from('slip_ups')
        .select('*')
        .eq('user_id', profile.id)
        .order('slip_up_date', { ascending: false });

      if (slipUpsError) throw slipUpsError;

      slipUps?.forEach((slipUp: SlipUp) => {
        timelineEvents.push({
          id: `slip-up-${slipUp.id}`,
          type: 'slip_up',
          date: new Date(slipUp.slip_up_date),
          title: 'Slip Up',
          description: slipUp.notes || 'Recovery journey restarted',
          icon: 'refresh',
          color: '#f59e0b',
          metadata: slipUp,
        });
      });

      // 3. Fetch step completions
      const { data: stepProgress, error: stepsError } = await supabase
        .from('user_step_progress')
        .select('*')
        .eq('user_id', profile.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false });

      if (stepsError) throw stepsError;

      stepProgress?.forEach((progress: UserStepProgress) => {
        if (progress.completed_at) {
          timelineEvents.push({
            id: `step-${progress.id}`,
            type: 'step_completion',
            date: new Date(progress.completed_at),
            title: `Step ${progress.step_number} Completed`,
            description: progress.notes || `Completed Step ${progress.step_number}`,
            icon: 'check',
            color: '#10b981',
            metadata: progress,
          });
        }
      });

      // 4. Fetch completed tasks for timeline
      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('sponsee_id', profile.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Add task completion events to timeline
      completedTasks?.forEach((task: Task) => {
        if (task.completed_at) {
          timelineEvents.push({
            id: `task-${task.id}`,
            type: 'task_completion',
            date: new Date(task.completed_at),
            title: task.title,
            description: task.completion_notes || task.description,
            icon: 'check-square',
            color: '#3b82f6', // blue
            metadata: {
              taskId: task.id,
              stepNumber: task.step_number,
              sponsorId: task.sponsor_id,
            },
          });
        }
      });

      // 5. Calculate task milestones for timeline
      if (completedTasks && completedTasks.length > 0) {
        const milestones = [5, 10, 25, 50, 100, 250, 500];
        const sortedTasks = [...completedTasks].sort(
          (a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
        );

        milestones.forEach((milestoneCount) => {
          if (sortedTasks.length >= milestoneCount) {
            const milestoneTask = sortedTasks[milestoneCount - 1];
            timelineEvents.push({
              id: `task-milestone-${milestoneCount}`,
              type: 'task_milestone',
              date: new Date(milestoneTask.completed_at!),
              title: `${milestoneCount} Tasks Completed`,
              description: `Reached ${milestoneCount} task completion milestone`,
              icon: 'award',
              color: '#f59e0b', // amber/gold
              metadata: { milestoneCount },
            });
          }
        });
      }

      // 6. Calculate sobriety milestones
      if (profile.sobriety_date) {
        const sobrietyDate = new Date(profile.sobriety_date);
        const today = new Date();
        // Prevent negative days (guard against future dates from timezone issues or data entry errors)
        const daysSober = Math.max(
          0,
          Math.floor((today.getTime() - sobrietyDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const milestones = [
          { days: 30, label: '30 Days Sober' },
          { days: 60, label: '60 Days Sober' },
          { days: 90, label: '90 Days Sober' },
          { days: 180, label: '6 Months Sober' },
          { days: 365, label: '1 Year Sober' },
          { days: 730, label: '2 Years Sober' },
          { days: 1095, label: '3 Years Sober' },
        ];

        milestones.forEach(({ days, label }) => {
          if (daysSober >= days) {
            const milestoneDate = new Date(sobrietyDate);
            milestoneDate.setDate(milestoneDate.getDate() + days);

            timelineEvents.push({
              id: `milestone-${days}`,
              type: 'milestone',
              date: milestoneDate,
              title: label,
              description: `Reached ${label} milestone`,
              icon: 'award',
              color: '#8b5cf6',
            });
          }
        });
      }

      // Sort events by date (most recent first)
      timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

      setEvents(timelineEvents);
    } catch (err) {
      console.error('Error fetching timeline data:', err);
      setError('Failed to load your journey timeline');
    } finally {
      setLoading(false);
    }
  }, [profile, theme, mostRecentSlipUp, daysSober]);

  useFocusEffect(
    useCallback(() => {
      fetchTimelineData();
    }, [fetchTimelineData])
  );

  const getIcon = (iconType: string, color: string) => {
    const size = 20;
    switch (iconType) {
      case 'calendar':
        return <Calendar size={size} color={color} />;
      case 'check':
        return <CheckCircle size={size} color={color} />;
      case 'check-square':
        return <CheckSquare size={size} color={color} />;
      case 'list-checks':
        return <ListChecks size={size} color={color} />;
      case 'target':
        return <Target size={size} color={color} />;
      case 'heart':
        return <Heart size={size} color={color} fill={color} />;
      case 'refresh':
        return <RefreshCw size={size} color={color} />;
      case 'award':
        return <Award size={size} color={color} />;
      case 'trending':
        return <TrendingUp size={size} color={color} />;
      default:
        return <Calendar size={size} color={color} />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Journey</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your journey...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Journey</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Journey</Text>
        <Text style={styles.headerSubtitle}>Every day is a victory</Text>
      </View>

      <ScrollView style={styles.content}>
        {profile?.sobriety_date && (
          <View style={styles.statsCard}>
            {!hasSlipUps ? (
              // Single metric display - no slip-ups
              <View style={styles.statMain}>
                <TrendingUp size={32} color={theme.primary} />
                <View style={styles.statMainContent}>
                  <Text style={styles.statMainNumber}>{loadingDaysSober ? '...' : daysSober}</Text>
                  <Text style={styles.statMainLabel}>Days Sober</Text>
                </View>
              </View>
            ) : (
              // Dual metric display - has slip-ups
              <View style={styles.statMainDual}>
                <View style={styles.statMainColumn}>
                  <TrendingUp size={24} color={theme.primary} />
                  <Text style={styles.statMainNumberSmall}>
                    {loadingDaysSober ? '...' : daysSober}
                  </Text>
                  <Text style={styles.statMainLabelSmall}>Current Streak</Text>
                </View>
                <View style={styles.statMainColumn}>
                  <Calendar size={24} color={theme.textSecondary} />
                  <Text style={styles.statMainNumberSmall}>
                    {loadingDaysSober ? '...' : journeyDays}
                  </Text>
                  <Text style={styles.statMainLabelSmall}>Journey Started</Text>
                </View>
              </View>
            )}
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <CheckCircle size={18} color="#10b981" />
                <Text style={styles.statValue}>
                  {events.filter((e) => e.type === 'step_completion').length}
                </Text>
                <Text style={styles.statLabel}>Steps Completed</Text>
              </View>
              <View style={styles.statItem}>
                <ListChecks size={18} color="#3b82f6" />
                <Text style={styles.statValue}>
                  {events.filter((e) => e.type === 'task_completion').length}
                </Text>
                <Text style={styles.statLabel}>Tasks Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Award size={18} color="#8b5cf6" />
                <Text style={styles.statValue}>
                  {
                    events.filter((e) => e.type === 'milestone' || e.type === 'task_milestone')
                      .length
                  }
                </Text>
                <Text style={styles.statLabel}>Milestones</Text>
              </View>
            </View>
          </View>
        )}

        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={48} color={theme.textTertiary} />
            <Text style={styles.emptyText}>Your journey is just beginning</Text>
            <Text style={styles.emptySubtext}>
              Complete steps, finish tasks, and reach milestones to build your timeline
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {events.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: event.color }]} />
                  {index < events.length - 1 && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineDate}>
                    <Text style={styles.timelineDateText}>{formatDate(event.date)}</Text>
                  </View>
                  <View style={[styles.eventCard, { borderLeftColor: event.color }]}>
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventIcon, { backgroundColor: event.color + '20' }]}>
                        {getIcon(event.icon, event.color)}
                      </View>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                    </View>
                    {event.description && (
                      <Text style={styles.eventDescription}>{event.description}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 24,
      paddingTop: 60,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 16,
    },
    errorText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: '#ef4444',
      textAlign: 'center',
    },
    statsCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    statMain: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    statMainContent: {
      alignItems: 'center',
    },
    statMainNumber: {
      fontSize: 40,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
    },
    statMainLabel: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
    },
    statMainDual: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 16,
      marginBottom: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    statMainColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    statMainNumberSmall: {
      fontSize: 32,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.primary,
    },
    statMainLabelSmall: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    statRow: {
      flexDirection: 'row',
      gap: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    statValue: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    timeline: {
      paddingBottom: 24,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    timelineLine: {
      width: 40,
      alignItems: 'center',
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginTop: 8,
    },
    timelineConnector: {
      width: 2,
      flex: 1,
      backgroundColor: theme.border,
      marginTop: 8,
    },
    timelineContent: {
      flex: 1,
    },
    timelineDate: {
      marginBottom: 8,
    },
    timelineDateText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      fontWeight: '600',
    },
    eventCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    eventHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    eventIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    eventTitle: {
      flex: 1,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    eventDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 12,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      marginTop: 48,
    },
    emptyText: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
