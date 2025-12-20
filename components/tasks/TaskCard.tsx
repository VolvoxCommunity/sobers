// =============================================================================
// Imports
// =============================================================================
import React, { JSX, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Calendar, Clock, Trash2 } from 'lucide-react-native';
import { Task, Profile } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import { formatProfileName } from '@/lib/format';
import { parseDateAsLocal } from '@/lib/date';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the TaskCard component.
 */
interface TaskCardProps {
  /** The task to display */
  task: Task & { sponsor?: Profile; sponsee?: Profile };
  /** The current theme */
  theme: ThemeColors;
  /** Variant determines the card's appearance and available actions */
  variant: 'my-task' | 'managed-task';
  /** Whether the task is completed */
  isCompleted?: boolean;
  /** Whether the task is overdue */
  isOverdue?: boolean;
  /** Callback when the Complete button is pressed (my-task variant only) */
  onComplete?: (task: Task) => void;
  /** Callback when the Delete button is pressed (managed-task variant only) */
  onDelete?: (taskId: string, taskTitle: string) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a task card showing task details, status, and contextual actions.
 *
 * @param task - The task to display; may include sponsor or sponsee profiles.
 * @param theme - Theme colors used for styling the card.
 * @param variant - Display mode: `"my-task"` shows actions for the current user, `"managed-task"` shows manager-facing controls.
 * @param isCompleted - Whether the task is considered completed; affects visual state and available actions.
 * @param isOverdue - Whether the task is overdue; affects visual state and date coloring.
 * @param onComplete - Optional callback invoked with the task when the user completes it (used by `"my-task"`).
 * @param onDelete - Optional callback invoked with the task id and title when deleting the task (used by `"managed-task"`).
 * @returns A JSX element that presents the task with appropriate icons, dates, notes, and action controls for the chosen variant.
 */
export default function TaskCard({
  task,
  theme,
  variant,
  isCompleted = false,
  isOverdue = false,
  onComplete,
  onDelete,
}: TaskCardProps): JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      testID={`task-card-${task.id}`}
      style={[
        styles.taskCard,
        isCompleted && styles.completedCard,
        isOverdue && styles.taskCardOverdue,
      ]}
    >
      {/* Task Header */}
      <View style={styles.taskHeader}>
        {task.step_number && (
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
          </View>
        )}
        {variant === 'my-task' && !isCompleted && (
          <Text style={styles.taskDate}>{new Date(task.created_at).toLocaleDateString()}</Text>
        )}
        {variant === 'my-task' && isCompleted && <CheckCircle size={20} color={theme.primary} />}
        {variant === 'managed-task' && task.status === 'completed' && (
          <CheckCircle size={20} color={theme.success} />
        )}
        {variant === 'managed-task' && isOverdue && <Clock size={20} color={theme.error} />}
        {variant === 'managed-task' && !isCompleted && !isOverdue && (
          <Clock size={20} color={theme.textSecondary} />
        )}
      </View>

      {/* Task Title & Description */}
      <Text style={styles.taskTitle}>{task.title}</Text>
      <Text
        style={styles.taskDescription}
        numberOfLines={variant === 'managed-task' ? 2 : undefined}
      >
        {task.description}
      </Text>

      {/* Due Date */}
      {task.due_date && variant === 'my-task' && (
        <View style={styles.dueDateContainer}>
          <Calendar size={14} color={theme.textSecondary} />
          <Text style={styles.dueDateText}>
            Due {parseDateAsLocal(task.due_date).toLocaleDateString()}
          </Text>
        </View>
      )}
      {task.due_date && variant === 'managed-task' && (
        <View style={styles.taskMeta}>
          <Calendar size={14} color={isOverdue ? theme.error : theme.textSecondary} />
          <Text style={[styles.taskMetaText, isOverdue && styles.taskMetaTextOverdue]}>
            Due {parseDateAsLocal(task.due_date).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Completed Date (My Tasks) */}
      {isCompleted && task.completed_at && variant === 'my-task' && (
        <Text style={styles.completedDate}>
          Completed {new Date(task.completed_at).toLocaleDateString()}
        </Text>
      )}

      {/* Completion Notes */}
      {task.completion_notes && (
        <View style={styles.completionNotesContainer}>
          <Text style={styles.completionNotesLabel}>
            {variant === 'my-task' ? 'Your Notes:' : 'Completion Notes:'}
          </Text>
          <Text
            style={styles.completionNotesText}
            numberOfLines={variant === 'managed-task' ? 3 : undefined}
          >
            {task.completion_notes}
          </Text>
        </View>
      )}

      {/* Footer Actions */}
      {variant === 'my-task' && !isCompleted && (
        <View style={styles.taskFooter}>
          <Text style={styles.sponsorText}>From: {formatProfileName(task.sponsor)}</Text>
          <TouchableOpacity
            testID={`task-complete-${task.id}`}
            style={styles.completeButton}
            onPress={() => onComplete?.(task)}
            accessibilityRole="button"
            accessibilityLabel={`Complete task ${task.title}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CheckCircle size={20} color={theme.primary} />
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      )}

      {variant === 'managed-task' && (
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
              onPress={() => onDelete?.(task.id, task.title)}
              accessibilityRole="button"
              accessibilityLabel={`Delete task ${task.title}`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID={`delete-task-${task.id}`}
            >
              <Trash2 size={16} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    taskCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
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
      color: theme.white,
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
      backgroundColor: theme.successLight,
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
  });
