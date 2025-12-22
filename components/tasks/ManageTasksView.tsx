// =============================================================================
// Imports
// =============================================================================
import React, { JSX, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { Task, Profile } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import { formatProfileName } from '@/lib/format';
import { IOS_TAB_BAR_HEIGHT } from '@/constants/layout';
import TaskCard from './TaskCard';
import TaskFilters from './TaskFilters';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the ManageTasksView component.
 */
interface ManageTasksViewProps {
  /** All tasks managed by the sponsor */
  tasks: Task[];
  /** Filtered tasks based on current filters */
  filteredTasks: Task[];
  /** Tasks grouped by sponsee ID */
  groupedTasks: { [key: string]: Task[] };
  /** List of sponsees */
  sponsees: Profile[];
  /** Current status filter */
  filterStatus: 'all' | 'assigned' | 'completed';
  /** Currently selected sponsee ID for filtering */
  selectedSponseeId: string;
  /** Whether the view is refreshing */
  refreshing: boolean;
  /** The current theme */
  theme: ThemeColors;
  /** Tab bar height for scroll and FAB positioning */
  tabBarHeight: number;
  /** Callback when status filter changes */
  onStatusFilterChange: (status: 'all' | 'assigned' | 'completed') => void;
  /** Callback when sponsee filter changes */
  onSponseeFilterChange: (sponseeId: string) => void;
  /** Callback when refresh is triggered */
  onRefresh: () => void;
  /** Callback when FAB is pressed to create task */
  onCreateTask: () => void;
  /** Callback when add task button for specific sponsee is pressed */
  onAddTaskForSponsee: (sponseeId: string) => void;
  /** Callback when delete task is pressed */
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  /** Function to check if a task is overdue */
  isOverdue: (task: Task) => boolean;
}

/**
 * Statistics for Manage view.
 */
interface ManageStats {
  total: number;
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ManageTasksView displays the sponsor's task management interface.
 *
 * @remarks
 * This component shows:
 * - Statistics (total, assigned, completed, overdue)
 * - Status and sponsee filters
 * - Tasks grouped by sponsee
 * - FAB for creating new tasks
 * - Empty states for no sponsees or no tasks
 *
 * @example
 * ```tsx
 * <ManageTasksView
 *   tasks={manageTasks}
 *   filteredTasks={filteredTasks}
 *   groupedTasks={groupedTasks}
 *   sponsees={sponsees}
 *   filterStatus={filterStatus}
 *   selectedSponseeId={selectedSponseeId}
 *   refreshing={refreshing}
 *   theme={theme}
 *   tabBarHeight={tabBarHeight}
 *   onStatusFilterChange={setFilterStatus}
 *   onSponseeFilterChange={setSelectedSponseeId}
 *   onRefresh={handleRefresh}
 *   onCreateTask={handleCreateTask}
 *   onAddTaskForSponsee={handleAddTaskForSponsee}
 *   onDeleteTask={handleDeleteTask}
 *   isOverdue={isOverdue}
 * />
 * ```
 */
const ManageTasksView = memo(function ManageTasksView({
  tasks,
  filteredTasks,
  groupedTasks,
  sponsees,
  filterStatus,
  selectedSponseeId,
  refreshing,
  theme,
  tabBarHeight,
  onStatusFilterChange,
  onSponseeFilterChange,
  onRefresh,
  onCreateTask,
  onAddTaskForSponsee,
  onDeleteTask,
  isOverdue,
}: ManageTasksViewProps): JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  const stats: ManageStats = useMemo(() => {
    return {
      total: tasks.length,
      assigned: tasks.filter((t) => t.status === 'assigned').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      // Use the same isOverdue function for consistency with TaskCard visual indicators
      overdue: tasks.filter((t) => isOverdue(t)).length,
    };
  }, [tasks, isOverdue]);

  return (
    <>
      {/* Stats */}
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
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        {stats.overdue > 0 && (
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.error }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <TaskFilters
        theme={theme}
        filterStatus={filterStatus}
        onStatusFilterChange={onStatusFilterChange}
        sponsees={sponsees}
        selectedSponseeId={selectedSponseeId}
        onSponseeFilterChange={onSponseeFilterChange}
      />

      {/* Task List */}
      <ScrollView
        testID="manage-tasks-list"
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
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
          Object.keys(groupedTasks)
            .sort()
            .map((sponseeId) => {
              const sponsee = sponsees.find((s) => s.id === sponseeId);
              const sponseeTasks = groupedTasks[sponseeId];

              return (
                <View key={sponseeId} style={styles.sponseeSection}>
                  {/* Sponsee Header */}
                  <View style={styles.sponseeHeader}>
                    <View style={styles.sponseeAvatar}>
                      <Text style={styles.sponseeAvatarText}>
                        {formatProfileName(sponsee)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.sponseeInfo}>
                      <Text style={styles.sponseeName}>{formatProfileName(sponsee)}</Text>
                      <Text style={styles.sponseeMeta}>
                        {sponseeTasks.length} task{sponseeTasks.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addTaskButton}
                      onPress={() => onAddTaskForSponsee(sponseeId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign task to ${formatProfileName(sponsee)}`}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Plus size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Sponsee Tasks */}
                  {sponseeTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      theme={theme}
                      variant="managed-task"
                      isCompleted={task.status === 'completed'}
                      isOverdue={isOverdue(task)}
                      onDelete={onDeleteTask}
                    />
                  ))}
                </View>
              );
            })
        )}
      </ScrollView>

      {/* FAB */}
      {sponsees.length > 0 && (
        <TouchableOpacity
          testID="manage-tasks-create-button"
          style={styles.fab}
          onPress={onCreateTask}
          accessibilityRole="button"
          accessibilityLabel="Create new task"
        >
          <Plus size={24} color={theme.white} />
        </TouchableOpacity>
      )}
    </>
  );
});

export default ManageTasksView;

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
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
    fab: {
      position: 'absolute',
      right: 20,
      bottom: Platform.OS === 'ios' ? IOS_TAB_BAR_HEIGHT + 40 : 40,
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
