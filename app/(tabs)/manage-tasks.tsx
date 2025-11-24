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
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Task, Profile } from '@/types/database';
import { Plus, CheckCircle, Clock, Calendar, Trash2 } from 'lucide-react-native';
import TaskCreationModal from '@/components/TaskCreationModal';

export default function ManageTasksScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sponsees, setSponsees] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedSponseeId, setPreselectedSponseeId] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'completed'>('all');
  const [selectedSponseeFilter, setSelectedSponseeFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const { data: sponseeData } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .eq('status', 'active');

    const sponseeProfiles = (sponseeData || [])
      .map((rel) => rel.sponsee)
      .filter(Boolean) as Profile[];
    setSponsees(sponseeProfiles);

    const { data: taskData } = await supabase
      .from('tasks')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .order('created_at', { ascending: false });

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
    const confirmMessage = `Delete task "${taskTitle}"? This cannot be undone.`;

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirm Delete', confirmMessage, [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      await fetchData();

      if (Platform.OS === 'web') {
        window.alert('Task deleted successfully');
      } else {
        Alert.alert('Success', 'Task deleted successfully');
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete task');
      } else {
        Alert.alert('Error', 'Failed to delete task');
      }
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

  const getTaskStats = () => {
    const total = tasks.length;
    const assigned = tasks.filter((t) => t.status === 'assigned').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;

    return { total, assigned, inProgress, completed, overdue };
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  };

  const stats = getTaskStats();
  const filteredTasks = getFilteredTasks();
  const styles = createStyles(theme);

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
        <Text style={styles.headerTitle}>Manage Tasks</Text>
        <Text style={styles.headerSubtitle}>Track and assign sponsee tasks</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.overdue}</Text>
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
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSponseeFilter === sponsee.id && styles.filterChipTextActive,
                  ]}
                >
                  {sponsee?.first_name}
                  {sponsee?.last_initial ? ` ${sponsee?.last_initial}.` : ''}
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
                  <View style={styles.sponseeAvatar}>
                    <Text style={styles.sponseeAvatarText}>
                      {(sponsee?.first_name || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.sponseeInfo}>
                    <Text style={styles.sponseeName}>
                      {sponsee?.first_name} {sponsee?.last_initial}.
                    </Text>
                    <Text style={styles.sponseeMeta}>
                      {sponseeTasks.length} task
                      {sponseeTasks.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addTaskButton}
                    onPress={() => {
                      setPreselectedSponseeId(sponseeId);
                      setShowCreateModal(true);
                    }}
                  >
                    <Plus size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                {sponseeTasks.map((task) => (
                  <View
                    key={task.id}
                    style={[styles.taskCard, isOverdue(task) && styles.taskCardOverdue]}
                  >
                    <View style={styles.taskHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                      </View>
                      {task.status === 'completed' ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : isOverdue(task) ? (
                        <Clock size={20} color="#ef4444" />
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
                          color={isOverdue(task) ? '#ef4444' : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.taskMetaText,
                            isOverdue(task) && styles.taskMetaTextOverdue,
                          ]}
                        >
                          Due {new Date(task.due_date).toLocaleDateString()}
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
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
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
            setShowCreateModal(true);
          }}
        >
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      <TaskCreationModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
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
      color: '#ffffff',
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
      color: '#ffffff',
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
      borderLeftColor: '#ef4444',
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
      color: '#ffffff',
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
      color: '#ef4444',
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
      borderColor: '#fee2e2',
      backgroundColor: '#fef2f2',
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
