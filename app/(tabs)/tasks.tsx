// =============================================================================
// Imports
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Task, Profile } from '@/types/database';
import { CheckCircle, Circle, X, Calendar, Plus, Clock, Trash2 } from 'lucide-react-native';
import SegmentedControl from '@/components/SegmentedControl';
import TaskCreationModal from '@/components/TaskCreationModal';
import { formatProfileName } from '@/lib/format';

// =============================================================================
// Types & Interfaces
// =============================================================================
type ViewMode = 'my-tasks' | 'manage';

// =============================================================================
// Component
// =============================================================================
/**
 * Unified Tasks screen with segmented control for switching between
 * "My Tasks" (sponsee view) and "Manage" (sponsor view).
 *
 * @remarks
 * Automatically sets default view based on pending tasks:
 * - If user has pending tasks → defaults to "My Tasks"
 * - If user has no pending tasks → defaults to "Manage"
 */
export default function TasksScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();

  // =============================================================================
  // State
  // =============================================================================
  const [viewMode, setViewMode] = useState<ViewMode>('my-tasks');
  const [refreshing, setRefreshing] = useState(false);

  // My Tasks state
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Manage state
  const [manageTasks, setManageTasks] = useState<Task[]>([]);
  const [sponsees, setSponsees] = useState<Profile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedSponseeId, setPreselectedSponseeId] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'completed'>('all');
  const [selectedSponseeFilter, setSelectedSponseeFilter] = useState<string>('all');

  // =============================================================================
  // Data Fetching
  // =============================================================================

  /**
   * Fetches tasks assigned to the current user (sponsee view).
   */
  const fetchMyTasks = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('tasks')
      .select('*, sponsor:sponsor_id(*)')
      .eq('sponsee_id', profile.id)
      .order('created_at', { ascending: false });
    setMyTasks(data || []);
  }, [profile]);

  /**
   * Fetches sponsees and their tasks (sponsor view).
   */
  const fetchManageData = useCallback(async () => {
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

    setManageTasks(taskData || []);
  }, [profile]);

  /**
   * Initializes view mode based on pending tasks.
   * Defaults to "My Tasks" if user has pending tasks, otherwise "Manage".
   */
  const initializeView = useCallback(async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('tasks')
      .select('id')
      .eq('sponsee_id', profile.id)
      .neq('status', 'completed')
      .limit(1);

    setViewMode(data && data.length > 0 ? 'my-tasks' : 'manage');
  }, [profile]);

  useEffect(() => {
    initializeView();
    fetchMyTasks();
    fetchManageData();
  }, [profile, initializeView, fetchMyTasks, fetchManageData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyTasks(), fetchManageData()]);
    setRefreshing(false);
  };

  // =============================================================================
  // My Tasks Handlers
  // =============================================================================

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setCompletionNotes('');
    setShowCompleteModal(true);
  };

  const submitTaskCompletion = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes.trim() || null,
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedTask.sponsor_id,
        type: 'task_completed',
        title: 'Task Completed',
        content: `${profile?.first_name} ${profile?.last_initial}. has completed: ${selectedTask.title}`,
        data: {
          task_id: selectedTask.id,
          step_number: selectedTask.step_number,
        },
      });

      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      await fetchMyTasks();

      if (Platform.OS === 'web') {
        window.alert('Task marked as completed!');
      } else {
        Alert.alert('Success', 'Task marked as completed!');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to complete task');
      } else {
        Alert.alert('Error', 'Failed to complete task');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMyTasksByStatus = (status: string) => myTasks.filter((t) => t.status === status);

  // =============================================================================
  // Manage Handlers
  // =============================================================================

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

      await fetchManageData();

      if (Platform.OS === 'web') {
        window.alert('Task deleted successfully');
      } else {
        Alert.alert('Success', 'Task deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete task');
      } else {
        Alert.alert('Error', 'Failed to delete task');
      }
    }
  };

  const getFilteredTasks = () => {
    let filtered = manageTasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    if (selectedSponseeFilter !== 'all') {
      filtered = filtered.filter((task) => task.sponsee_id === selectedSponseeFilter);
    }

    return filtered;
  };

  const getManageTaskStats = () => {
    const now = new Date();
    const total = manageTasks.length;
    const assigned = manageTasks.filter((t) => t.status === 'assigned').length;
    const inProgress = manageTasks.filter((t) => t.status === 'in_progress').length;
    const completed = manageTasks.filter((t) => t.status === 'completed').length;
    const overdue = manageTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed'
    ).length;

    return { total, assigned, inProgress, completed, overdue };
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  };

  const groupTasksBySponsee = () => {
    const filtered = getFilteredTasks();
    const grouped: { [key: string]: Task[] } = {};
    filtered.forEach((task) => {
      if (!grouped[task.sponsee_id]) {
        grouped[task.sponsee_id] = [];
      }
      grouped[task.sponsee_id].push(task);
    });
    return grouped;
  };

  // =============================================================================
  // Stats Calculation
  // =============================================================================

  const getMyTasksStats = () => {
    const pending = myTasks.filter((t) => t.status !== 'completed').length;
    const completed = myTasks.filter((t) => t.status === 'completed').length;
    return { pending, completed };
  };

  const myTasksStats = getMyTasksStats();
  const manageStats = getManageTaskStats();
  const groupedTasks = groupTasksBySponsee();

  const styles = createStyles(theme);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <Text style={styles.headerSubtitle}>
          {viewMode === 'my-tasks' ? 'Track your step progress' : 'Track and assign sponsee tasks'}
        </Text>
      </View>

      <SegmentedControl
        segments={['My Tasks', 'Manage']}
        activeIndex={viewMode === 'my-tasks' ? 0 : 1}
        onChange={(index) => setViewMode(index === 0 ? 'my-tasks' : 'manage')}
      />

      {viewMode === 'my-tasks' ? (
        <>
          {/* My Tasks Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                {myTasksStats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{myTasksStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          >
            {/* Pending Tasks */}
            {getMyTasksByStatus('assigned').length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>New Tasks</Text>
                {getMyTasksByStatus('assigned').map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      {task.step_number && (
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                        </View>
                      )}
                      <Text style={styles.taskDate}>
                        {new Date(task.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={styles.taskDescription}>{task.description}</Text>
                    {task.due_date && (
                      <View style={styles.dueDateContainer}>
                        <Calendar size={14} color={theme.textSecondary} />
                        <Text style={styles.dueDateText}>
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.taskFooter}>
                      <Text style={styles.sponsorText}>
                        From: {formatProfileName(task.sponsor)}
                      </Text>
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleCompleteTask(task)}
                      >
                        <CheckCircle size={20} color={theme.primary} />
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Completed Tasks */}
            {getMyTasksByStatus('completed').length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowCompletedTasks(!showCompletedTasks)}
                >
                  <Text style={styles.sectionTitle}>
                    Completed ({getMyTasksByStatus('completed').length})
                  </Text>
                  <Text style={styles.toggleText}>{showCompletedTasks ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
                {showCompletedTasks &&
                  getMyTasksByStatus('completed').map((task) => (
                    <View key={task.id} style={[styles.taskCard, styles.completedCard]}>
                      <View style={styles.taskHeader}>
                        {task.step_number && (
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                          </View>
                        )}
                        <CheckCircle size={20} color={theme.primary} />
                      </View>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <Text style={styles.taskDescription}>{task.description}</Text>
                      <Text style={styles.completedDate}>
                        Completed {new Date(task.completed_at!).toLocaleDateString()}
                      </Text>
                      {task.completion_notes && (
                        <View style={styles.completionNotesContainer}>
                          <Text style={styles.completionNotesLabel}>Your Notes:</Text>
                          <Text style={styles.completionNotesText}>{task.completion_notes}</Text>
                        </View>
                      )}
                    </View>
                  ))}
              </View>
            )}

            {/* Empty State */}
            {myTasks.length === 0 && (
              <View style={styles.emptyState}>
                <Circle size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.emptyText}>
                  Your sponsor will assign tasks to help you progress through the 12 steps
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Task Completion Modal */}
          <Modal
            visible={showCompleteModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCompleteModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Complete Task</Text>
                  <TouchableOpacity
                    onPress={() => setShowCompleteModal(false)}
                    style={styles.closeButton}
                  >
                    <X size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  {selectedTask && (
                    <>
                      <View style={styles.taskSummary}>
                        {selectedTask.step_number && (
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>
                              Step {selectedTask.step_number}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.taskSummaryTitle}>{selectedTask.title}</Text>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Completion Notes (Optional)</Text>
                        <Text style={styles.helpText}>
                          Share your reflections, insights, or any challenges you faced with this
                          task.
                        </Text>
                        <TextInput
                          style={styles.textArea}
                          value={completionNotes}
                          onChangeText={setCompletionNotes}
                          placeholder="What did you learn? How do you feel?"
                          placeholderTextColor={theme.textTertiary}
                          multiline
                          numberOfLines={6}
                          textAlignVertical="top"
                        />
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowCompleteModal(false)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                    onPress={submitTaskCompletion}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Mark Complete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {/* Manage View Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{manageStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                {manageStats.assigned}
              </Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{manageStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            {manageStats.overdue > 0 && (
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{manageStats.overdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            )}
          </View>

          {/* Status Filters */}
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
                  style={[
                    styles.filterChipText,
                    filterStatus === 'all' && styles.filterChipTextActive,
                  ]}
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

          {/* Sponsee Filters */}
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
                      {formatProfileName(sponsee)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Manage Tasks Content */}
          <ScrollView
            style={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
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
            ) : getFilteredTasks().length === 0 ? (
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

          {/* FAB */}
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

          {/* Task Creation Modal */}
          <TaskCreationModal
            visible={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setPreselectedSponseeId(undefined);
            }}
            onTaskCreated={fetchManageData}
            sponsorId={profile?.id || ''}
            sponsees={sponsees}
            preselectedSponseeId={preselectedSponseeId}
            theme={theme}
          />
        </>
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
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    toggleText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    taskCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    taskCardOverdue: {
      borderLeftWidth: 4,
      borderLeftColor: '#ef4444',
    },
    completedCard: {
      opacity: 0.7,
    },
    taskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
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
    taskDate: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    taskTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    taskDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    taskFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    sponsorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    completeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0fdf4',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    completeButtonText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
      marginLeft: 6,
    },
    completedDate: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 8,
    },
    completionNotesContainer: {
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
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
    dueDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    dueDateText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    modalBody: {
      padding: 20,
    },
    taskSummary: {
      marginBottom: 20,
      alignItems: 'center',
    },
    taskSummaryTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginTop: 12,
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    helpText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    textArea: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      minHeight: 120,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    submitButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: '#ffffff',
    },
    buttonDisabled: {
      opacity: 0.6,
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
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      paddingHorizontal: 32,
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
