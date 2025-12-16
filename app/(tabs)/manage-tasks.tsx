import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Task, Profile } from '@/types/database';
import { Plus, CheckCircle, Clock, Calendar, Trash2 } from 'lucide-react-native';
import TaskCreationSheet, { TaskCreationSheetRef } from '@/components/TaskCreationSheet';
import { formatProfileName } from '@/lib/format';
import { logger, LogCategory } from '@/lib/logger';
import { parseDateAsLocal } from '@/lib/date';
import { showAlert, showConfirm } from '@/lib/alert';

/**
 * Screen component for viewing, filtering, and managing tasks assigned to a sponsor's sponsees.
 *
 * Renders task statistics, status and sponsee filters, grouped task lists with actions (create, delete),
 * pull-to-refresh, and the task creation modal; data is loaded from Supabase for the current authenticated profile.
 *
 * @returns The Manage Tasks screen React element
 */
export default function ManageTasksScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sponsees, setSponsees] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [preselectedSponseeId, setPreselectedSponseeId] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'completed'>('all');
  const [selectedSponseeFilter, setSelectedSponseeFilter] = useState<string>('all');
  const taskSheetRef = useRef<TaskCreationSheetRef>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data: sponseeData, error: sponseeError } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .eq('status', 'active');

    if (sponseeError) {
      logger.error('Failed to fetch sponsee relationships', sponseeError as Error, {
        category: LogCategory.DATABASE,
      });
      return;
    }

    const sponseeProfiles = (sponseeData || [])
      .map((rel) => rel.sponsee)
      .filter(Boolean) as Profile[];
    setSponsees(sponseeProfiles);

    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .order('created_at', { ascending: false });

    if (taskError) {
      logger.error('Failed to fetch tasks', taskError as Error, {
        category: LogCategory.DATABASE,
      });
      return;
    }

    setTasks(taskData || []);
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const confirmed = await showConfirm(
      'Confirm Delete',
      `Delete task "${taskTitle}"? This cannot be undone.`,
      'Delete',
      'Cancel',
      true
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      await fetchData();

      showAlert('Success', 'Task deleted successfully');
    } catch (error: unknown) {
      logger.error('Task deletion failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      const message = error instanceof Error ? error.message : 'Failed to delete task.';
      showAlert('Error', message);
    }
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    if (selectedSponseeFilter !== 'all') {
      filtered = filtered.filter((task) => task.sponsee_id === selectedSponseeFilter);
    }

    return filtered;
  };

  /**
   * Calculates task statistics including total, assigned, in progress, completed, and overdue counts.
   *
   * @returns Object containing task statistics
   */
  const getTaskStats = (now: Date) => {
    const total = tasks.length;
    const assigned = tasks.filter((t) => t.status === 'assigned').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
    ).length;

    return { total, assigned, inProgress, completed, overdue };
  };

  /**
   * Checks if a task is overdue.
   *
   * @param task - The task to check
   * @param now - Current date/time for comparison (defaults to new Date() if not provided)
   * @returns True if the task is overdue, false otherwise
   */
  const isOverdue = (task: Task, now: Date = new Date()) => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < now;
  };

  const now = new Date();
  const stats = getTaskStats(now);
  const filteredTasks = getFilteredTasks();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const groupTasksBySponsee = () => {
    const grouped: { [key: string]: Task[] } = {};
    filteredTasks.forEach((task) => {
      if (!grouped[task.sponsee_id]) {
        grouped[task.sponsee_id] = [];
      }
      grouped[task.sponsee_id].push(task);
    });
    return grouped;
  };

  const groupedTasks = groupTasksBySponsee();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Manage Tasks
        </Text>
        <Text style={styles.headerSubtitle}>Track and assign sponsee tasks</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard} accessibilityLabel={`${stats.total} Total Tasks`}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard} accessibilityLabel={`${stats.assigned} Assigned Tasks`}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard} accessibilityLabel={`${stats.completed} Completed Tasks`}>
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={styles.statCard} accessibilityLabel={`${stats.overdue} Overdue Tasks`}>
            <Text style={[styles.statValue, { color: theme.error }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
            accessibilityRole="button"
            accessibilityState={{ selected: filterStatus === 'all' }}
            accessibilityLabel="Filter by All Tasks"
          >
            <Text
              style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}
            >
              All Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'assigned' && styles.filterChipActive]}
            onPress={() => setFilterStatus('assigned')}
            accessibilityRole="button"
            accessibilityState={{ selected: filterStatus === 'assigned' }}
            accessibilityLabel="Filter by Assigned Tasks"
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'assigned' && styles.filterChipTextActive,
              ]}
            >
              Assigned
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipActive]}
            onPress={() => setFilterStatus('completed')}
            accessibilityRole="button"
            accessibilityState={{ selected: filterStatus === 'completed' }}
            accessibilityLabel="Filter by Completed Tasks"
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatus === 'completed' && styles.filterChipTextActive,
              ]}
            >
              Completed
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {sponsees.length > 1 && (
        <View style={styles.sponseeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedSponseeFilter === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedSponseeFilter('all')}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedSponseeFilter === 'all' }}
              accessibilityLabel="Filter by All Sponsees"
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSponseeFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All Sponsees
              </Text>
            </TouchableOpacity>
            {sponsees.map((sponsee) => (
              <TouchableOpacity
                key={sponsee.id}
                style={[
                  styles.filterChip,
                  selectedSponseeFilter === sponsee.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedSponseeFilter(sponsee.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedSponseeFilter === sponsee.id }}
                accessibilityLabel={`Filter by sponsee ${formatProfileName(sponsee)}`}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSponseeFilter === sponsee.id && styles.filterChipTextActive,
                  ]}
                >
                  {formatProfileName(sponsee)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {sponsees.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Sponsees Yet</Text>
            <Text style={styles.emptyText}>
              Connect with sponsees to start assigning tasks. Generate an invite code from your
              profile.
            </Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Tasks</Text>
            <Text style={styles.emptyText}>
              {filterStatus !== 'all'
                ? 'No tasks match your current filter.'
                : 'Start assigning tasks to help your sponsees progress through the steps.'}
            </Text>
          </View>
        ) : (
          Object.keys(groupedTasks).map((sponseeId) => {
            const sponsee = sponsees.find((s) => s.id === sponseeId);
            const sponseeTasks = groupedTasks[sponseeId];

            return (
              <View key={sponseeId} style={styles.sponseeSection}>
                <View style={styles.sponseeHeader}>
                  <View style={styles.sponseeAvatar} accessibilityRole="image">
                    <Text style={styles.sponseeAvatarText}>
                      {(sponsee?.display_name?.[0] || '?').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.sponseeInfo}>
                    <Text style={styles.sponseeName}>{formatProfileName(sponsee)}</Text>
                    <Text style={styles.sponseeMeta}>
                      {sponseeTasks.length} task
                      {sponseeTasks.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addTaskButton}
                    onPress={() => {
                      setPreselectedSponseeId(sponseeId);
                      taskSheetRef.current?.present();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Assign task to ${formatProfileName(sponsee)}`}
                  >
                    <Plus size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                {sponseeTasks.map((task) => {
                  const statusLabel =
                    task.status === 'assigned'
                      ? 'Assigned'
                      : task.status === 'in_progress'
                        ? 'In Progress'
                        : 'Completed';
                  const overdueLabel = isOverdue(task, now) ? ', Overdue' : '';
                  const taskLabel = `Task: ${task.title}, Step ${task.step_number || 'None'}, Status: ${statusLabel}${overdueLabel}`;

                  return (
                    <View
                      key={task.id}
                      style={[styles.taskCard, isOverdue(task, now) && styles.taskCardOverdue]}
                      accessibilityLabel={taskLabel}
                    >
                    <View style={styles.taskHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                      </View>
                      {task.status === 'completed' ? (
                        <CheckCircle size={20} color={theme.success} accessibilityLabel="Completed" />
                      ) : isOverdue(task, now) ? (
                        <Clock size={20} color={theme.error} accessibilityLabel="Overdue" />
                      ) : (
                        <Clock size={20} color={theme.textSecondary} />
                      )}
                    </View>

                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>

                    {task.due_date && (
                      <View style={styles.taskMeta}>
                        <Calendar
                          size={14}
                          color={isOverdue(task, now) ? theme.error : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.taskMetaText,
                            isOverdue(task, now) && styles.taskMetaTextOverdue,
                          ]}
                        >
                          Due {parseDateAsLocal(task.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {task.status === 'completed' && task.completion_notes && (
                      <View style={styles.completionNotesContainer}>
                        <Text style={styles.completionNotesLabel}>Completion Notes:</Text>
                        <Text style={styles.completionNotesText} numberOfLines={3}>
                          {task.completion_notes}
                        </Text>
                      </View>
                    )}

                    <View style={styles.taskActions}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {task.status === 'assigned'
                            ? 'Assigned'
                            : task.status === 'in_progress'
                              ? 'In Progress'
                              : 'Completed'}
                        </Text>
                      </View>
                      {task.status !== 'completed' && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTask(task.id, task.title)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete task ${task.title}`}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={16} color={theme.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {sponsees.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setPreselectedSponseeId(undefined);
            taskSheetRef.current?.present();
          }}
          accessibilityRole="button"
          accessibilityLabel="Assign new task"
          accessibilityHint="Opens the task assignment sheet"
        >
          <Plus size={24} color={theme.white} />
        </TouchableOpacity>
      )}

      <TaskCreationSheet
        ref={taskSheetRef}
        onClose={() => {
          setPreselectedSponseeId(undefined);
        }}
        onTaskCreated={fetchData}
        sponsorId={profile?.id || ''}
        sponsees={sponsees}
        preselectedSponseeId={preselectedSponseeId}
        theme={theme}
      />
    </View>
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
    statsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
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
      marginTop: 4,
    },
    filtersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    sponseeFiltersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    filters: {
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    filterChipTextActive: {
      color: theme.textOnPrimary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sponseeSection: {
      marginBottom: 24,
    },
    sponseeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sponseeAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sponseeAvatarText: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    sponseeInfo: {
      marginLeft: 12,
      flex: 1,
    },
    sponseeName: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    sponseeMeta: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    addTaskButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.primaryLight,
    },
    taskCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    taskCardOverdue: {
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    stepBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    stepBadgeText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.white,
    },
    taskTitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 6,
    },
    taskDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    taskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    taskMetaText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    taskMetaTextOverdue: {
      color: theme.error,
      fontWeight: '600',
    },
    completionNotesContainer: {
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
    },
    completionNotesLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    completionNotesText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    taskActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    statusBadgeText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.dangerBorder,
      backgroundColor: theme.dangerLight,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });
