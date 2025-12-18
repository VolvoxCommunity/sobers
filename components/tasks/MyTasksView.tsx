// =============================================================================
// Imports
// =============================================================================
import React, { JSX, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Circle } from 'lucide-react-native';
import { Task } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import TaskCard from './TaskCard';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the MyTasksView component.
 */
interface MyTasksViewProps {
  /** All tasks assigned to the user */
  tasks: Task[];
  /** Assigned (non-completed) tasks */
  assignedTasks: Task[];
  /** Completed tasks */
  completedTasks: Task[];
  /** Whether to show completed tasks */
  showCompletedTasks: boolean;
  /** Whether the view is refreshing */
  refreshing: boolean;
  /** The current theme */
  theme: ThemeColors;
  /** Tab bar height for scroll padding */
  tabBarHeight: number;
  /** Callback when refresh is triggered */
  onRefresh: () => void;
  /** Callback when completed tasks toggle is pressed */
  onToggleCompleted: () => void;
  /** Callback when a task's Complete button is pressed */
  onCompleteTask: (task: Task) => void;
}

/**
 * Statistics for My Tasks view.
 */
interface TaskStats {
  pending: number;
  completed: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * MyTasksView displays the sponsee's task list with pending and completed tasks.
 *
 * @remarks
 * This component shows:
 * - Statistics (pending and completed counts)
 * - Assigned tasks section
 * - Collapsible completed tasks section
 * - Empty state when no tasks exist
 *
 * @example
 * ```tsx
 * <MyTasksView
 *   tasks={myTasks}
 *   assignedTasks={assignedTasks}
 *   completedTasks={completedTasks}
 *   showCompletedTasks={showCompleted}
 *   refreshing={refreshing}
 *   theme={theme}
 *   tabBarHeight={tabBarHeight}
 *   onRefresh={handleRefresh}
 *   onToggleCompleted={() => setShowCompleted(!showCompleted)}
 *   onCompleteTask={handleCompleteTask}
 * />
 * ```
 */
export default function MyTasksView({
  tasks,
  assignedTasks,
  completedTasks,
  showCompletedTasks,
  refreshing,
  theme,
  tabBarHeight,
  onRefresh,
  onToggleCompleted,
  onCompleteTask,
}: MyTasksViewProps): JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Use pre-filtered arrays to avoid redundant filtering on each render
  const stats: TaskStats = {
    pending: assignedTasks.length,
    completed: completedTasks.length,
  };

  return (
    <>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        testID="tasks-list"
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Pending Tasks */}
        {assignedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Tasks</Text>
            {assignedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                theme={theme}
                variant="my-task"
                onComplete={onCompleteTask}
              />
            ))}
          </View>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={onToggleCompleted}
              accessibilityRole="button"
              accessibilityLabel={`${showCompletedTasks ? 'Hide' : 'Show'} completed tasks`}
              accessibilityState={{ expanded: showCompletedTasks }}
            >
              <Text style={styles.sectionTitle}>Completed ({completedTasks.length})</Text>
              <Text style={styles.toggleText}>{showCompletedTasks ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            {showCompletedTasks &&
              completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} theme={theme} variant="my-task" isCompleted />
              ))}
          </View>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Circle size={64} color={theme.textTertiary} />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyText}>
              Your sponsor will assign tasks to help you progress through the 12 steps
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

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
  });
