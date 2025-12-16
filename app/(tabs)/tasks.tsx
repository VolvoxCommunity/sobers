// =============================================================================
// Imports
// =============================================================================
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Task, Profile } from '@/types/database';
import SegmentedControl from '@/components/SegmentedControl';
import TaskCreationSheet, { TaskCreationSheetRef } from '@/components/TaskCreationSheet';
import MyTasksView from '@/components/tasks/MyTasksView';
import ManageTasksView from '@/components/tasks/ManageTasksView';
import TaskCompletionModal from '@/components/tasks/TaskCompletionModal';
import { logger, LogCategory } from '@/lib/logger';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { showAlert, showConfirm } from '@/lib/alert';

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
  // Get safe area insets for scroll padding
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? insets.bottom : 0;

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
  const [preselectedSponseeId, setPreselectedSponseeId] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'completed'>('all');
  const taskSheetRef = useRef<TaskCreationSheetRef>(null);
  const [selectedSponseeFilter, setSelectedSponseeFilter] = useState<string>('all');

  // =============================================================================
  // Data Fetching
  // =============================================================================

  /**
   * Fetches tasks assigned to the current user (sponsee view).
   */
  const fetchMyTasks = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*, sponsor:sponsor_id(*)')
      .eq('sponsee_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch my tasks', new Error(JSON.stringify(error)), {
        category: LogCategory.DATABASE,
      });
      return;
    }

    setMyTasks(data || []);
  }, [profile]);

  /**
   * Fetches sponsees and their tasks (sponsor view).
   */
  const fetchManageData = useCallback(async () => {
    if (!profile) return;

    const { data: sponseeData, error: sponseeError } = await supabase
      .from('sponsor_sponsee_relationships')
      .select('*, sponsee:sponsee_id(*)')
      .eq('sponsor_id', profile.id)
      .eq('status', 'active');

    if (sponseeError) {
      logger.error('Failed to fetch sponsees', new Error(JSON.stringify(sponseeError)), {
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
      logger.error('Failed to fetch manage tasks', new Error(JSON.stringify(taskError)), {
        category: LogCategory.DATABASE,
      });
      return;
    }

    setManageTasks(taskData || []);
  }, [profile]);

  /**
   * Initializes view mode based on pending tasks.
   * Defaults to "My Tasks" if user has pending tasks, otherwise "Manage".
   */
  const initializeView = useCallback(async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('sponsee_id', profile.id)
      .neq('status', 'completed')
      .limit(1);

    if (error) {
      logger.error('Failed to initialize view', new Error(JSON.stringify(error)), {
        category: LogCategory.DATABASE,
      });
      // Fallback to 'manage' view on error
      setViewMode('manage');
      return;
    }

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
    // Track task viewed event
    trackEvent(AnalyticsEvents.TASK_VIEWED, { task_id: task.id });
  };

  const submitTaskCompletion = async () => {
    if (!selectedTask) return;

    setIsSubmitting(true);

    try {
      const completedAt = new Date();
      const createdAt = new Date(selectedTask.created_at);
      const daysToComplete = Math.floor(
        (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          completion_notes: completionNotes.trim() || null,
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedTask.sponsor_id,
        type: 'task_completed',
        title: 'Task Completed',
        content: `${profile?.display_name} has completed: ${selectedTask.title}`,
        data: {
          task_id: selectedTask.id,
          step_number: selectedTask.step_number,
        },
      });

      // Track task completed event
      trackEvent(AnalyticsEvents.TASK_COMPLETED, {
        task_id: selectedTask.id,
        days_to_complete: daysToComplete,
      });

      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionNotes('');
      await fetchMyTasks();

      showAlert('Success', 'Task marked as completed!');
    } catch (error) {
      logger.error('Task completion failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      showAlert('Error', 'Failed to complete task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =============================================================================
  // Manage Handlers
  // =============================================================================

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const confirmMessage = `Delete task "${taskTitle}"? This cannot be undone.`;

    const confirmed = await showConfirm('Confirm Delete', confirmMessage, 'Delete', 'Cancel', true);

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      await fetchManageData();

      showAlert('Success', 'Task deleted successfully');
    } catch (error) {
      logger.error('Task deletion failed', error as Error, {
        category: LogCategory.DATABASE,
      });
      showAlert('Error', 'Failed to delete task');
    }
  };

  // =============================================================================
  // Derived State / Memoization
  // =============================================================================

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Memoize task lists to avoid expensive array operations on every render
  const assignedTasks = useMemo(() => myTasks.filter((t) => t.status === 'assigned'), [myTasks]);

  const completedTasks = useMemo(() => myTasks.filter((t) => t.status === 'completed'), [myTasks]);

  const filteredManageTasks = useMemo(() => {
    let filtered = manageTasks;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    if (selectedSponseeFilter !== 'all') {
      filtered = filtered.filter((task) => task.sponsee_id === selectedSponseeFilter);
    }

    return filtered;
  }, [manageTasks, filterStatus, selectedSponseeFilter]);

  const groupedTasks = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    filteredManageTasks.forEach((task) => {
      if (!grouped[task.sponsee_id]) {
        grouped[task.sponsee_id] = [];
      }
      grouped[task.sponsee_id].push(task);
    });
    return grouped;
  }, [filteredManageTasks]);

  const isOverdue = useCallback((task: Task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  }, []);

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
          <MyTasksView
            tasks={myTasks}
            assignedTasks={assignedTasks}
            completedTasks={completedTasks}
            showCompletedTasks={showCompletedTasks}
            refreshing={refreshing}
            theme={theme}
            tabBarHeight={tabBarHeight}
            onRefresh={onRefresh}
            onToggleCompleted={() => setShowCompletedTasks(!showCompletedTasks)}
            onCompleteTask={handleCompleteTask}
          />

          <TaskCompletionModal
            visible={showCompleteModal}
            task={selectedTask}
            notes={completionNotes}
            isSubmitting={isSubmitting}
            theme={theme}
            onNotesChange={setCompletionNotes}
            onClose={() => setShowCompleteModal(false)}
            onSubmit={submitTaskCompletion}
          />
        </>
      ) : (
        <>
          <ManageTasksView
            tasks={manageTasks}
            filteredTasks={filteredManageTasks}
            groupedTasks={groupedTasks}
            sponsees={sponsees}
            filterStatus={filterStatus}
            selectedSponseeId={selectedSponseeFilter}
            refreshing={refreshing}
            theme={theme}
            tabBarHeight={tabBarHeight}
            onStatusFilterChange={setFilterStatus}
            onSponseeFilterChange={setSelectedSponseeFilter}
            onRefresh={onRefresh}
            onCreateTask={() => {
              setPreselectedSponseeId(undefined);
              taskSheetRef.current?.present();
            }}
            onAddTaskForSponsee={(sponseeId) => {
              setPreselectedSponseeId(sponseeId);
              taskSheetRef.current?.present();
            }}
            onDeleteTask={handleDeleteTask}
            isOverdue={isOverdue}
          />

          <TaskCreationSheet
            ref={taskSheetRef}
            onClose={() => {
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
  });
