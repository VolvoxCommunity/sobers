// =============================================================================
// Imports
// =============================================================================
import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { X, CheckCircle } from 'lucide-react-native';
import { ThemeColors } from '@/contexts/ThemeContext';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import type { Task } from '@/types/database';

// Use regular TextInput on web to avoid BottomSheetTextInput compatibility issues
const InputComponent = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by TaskCompletionSheet via ref.
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<TaskCompletionSheetRef>(null);
 *
 * // Present the sheet with a task
 * sheetRef.current?.present(task);
 *
 * // Dismiss the sheet
 * sheetRef.current?.dismiss();
 * ```
 */
export interface TaskCompletionSheetRef {
  /**
   * Presents the task completion sheet with the given task.
   *
   * @param task - The task to complete
   */
  present: (task: Task) => void;

  /**
   * Dismisses the task completion sheet.
   */
  dismiss: () => void;
}

interface TaskCompletionSheetProps {
  /**
   * Theme colors used to style the sheet.
   */
  theme: ThemeColors;

  /**
   * Callback invoked when the sheet is dismissed without completing.
   */
  onDismiss: () => void;

  /**
   * Callback invoked when the task is completed.
   * Should return a promise that resolves when the completion is saved.
   *
   * @param task - The task being completed
   * @param notes - The completion notes entered by the user
   */
  onTaskCompleted: (task: Task, notes: string) => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet UI for completing tasks with optional notes.
 *
 * Features:
 * - Liquid Glass styling via GlassBottomSheet
 * - Task summary with step badge
 * - Optional notes field for reflections
 * - Swipe-to-dismiss gesture
 * - Imperative API for presentation
 *
 * @param theme - Theme colors used to style the sheet
 * @param onDismiss - Callback invoked when the sheet is dismissed
 * @param onTaskCompleted - Callback invoked when the task is completed
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<TaskCompletionSheetRef>(null);
 *
 * // Open the sheet
 * sheetRef.current?.present(task);
 *
 * <TaskCompletionSheet
 *   ref={sheetRef}
 *   theme={theme}
 *   onDismiss={() => {}}
 *   onTaskCompleted={handleTaskCompleted}
 * />
 * ```
 */
const TaskCompletionSheet = forwardRef<TaskCompletionSheetRef, TaskCompletionSheetProps>(
  ({ theme, onDismiss, onTaskCompleted }, ref) => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [task, setTask] = useState<Task | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const isMountedRef = useRef(true);

    // Track mounted state to prevent state updates after unmount
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      present: (taskToComplete: Task) => {
        resetForm();
        setTask(taskToComplete);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const resetForm = useCallback(() => {
      setNotes('');
      setIsSubmitting(false);
    }, []);

    /**
     * Handler for GlassBottomSheet's onDismiss callback.
     * Performs cleanup and notifies parent - called when sheet finishes dismissing.
     */
    const handleDismiss = useCallback(() => {
      resetForm();
      setTask(null);
      onDismiss();
    }, [resetForm, onDismiss]);

    /**
     * Handler for button press events (close icon, cancel button).
     * Only triggers the dismiss animation - cleanup happens in handleDismiss.
     */
    const handlePressClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    /**
     * Submits the task completion.
     */
    const handleSubmit = useCallback(async () => {
      if (!task) return;

      setIsSubmitting(true);

      try {
        await onTaskCompleted(task, notes);

        // Guard against state updates after unmount
        if (!isMountedRef.current) return;

        handlePressClose();
      } catch {
        // Guard against state updates after unmount
        if (!isMountedRef.current) return;
        // Error handling is done by parent via onTaskCompleted rejection
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    }, [task, notes, onTaskCompleted, handlePressClose]);

    const styles = createStyles(theme);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['55%', '75%']}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <CheckCircle size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>Complete Task</Text>
          <TouchableOpacity
            onPress={handlePressClose}
            style={styles.closeButton}
            testID="close-icon-button"
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {task && (
            <>
              <View style={styles.taskSummary}>
                {task.step_number && (
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                  </View>
                )}
                <Text style={styles.taskTitle}>{task.title}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Completion Notes (Optional)</Text>
                <Text style={styles.helpText}>
                  Share your reflections, insights, or any challenges you faced with this task.
                </Text>
                <InputComponent
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What did you learn? How do you feel?"
                  placeholderTextColor={theme.textTertiary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handlePressClose}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel task completion"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Submit task completion"
            accessibilityState={{ busy: isSubmitting, disabled: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Text style={styles.submitButtonText}>Mark Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
TaskCompletionSheet.displayName = 'TaskCompletionSheet';

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIcon: {
      width: 24,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    taskSummary: {
      marginBottom: 24,
      alignItems: 'center',
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
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
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
      color: theme.white,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

// =============================================================================
// Exports
// =============================================================================
export default TaskCompletionSheet;
