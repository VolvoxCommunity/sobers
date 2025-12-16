// =============================================================================
// Imports
// =============================================================================
import React, { JSX, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { X } from 'lucide-react-native';
import { Task } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Props for the TaskCompletionModal component.
 */
interface TaskCompletionModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** The task being completed */
  task: Task | null;
  /** The completion notes text */
  notes: string;
  /** Whether the submission is in progress */
  isSubmitting: boolean;
  /** The current theme */
  theme: ThemeColors;
  /** Callback when notes are changed */
  onNotesChange: (notes: string) => void;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Callback when the task completion is submitted */
  onSubmit: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * TaskCompletionModal allows users to add completion notes when marking a task as complete.
 *
 * @remarks
 * This modal displays the task details and provides a text area for the user
 * to add optional completion notes. It includes Cancel and Mark Complete actions.
 *
 * @example
 * ```tsx
 * <TaskCompletionModal
 *   visible={showModal}
 *   task={selectedTask}
 *   notes={completionNotes}
 *   isSubmitting={isSubmitting}
 *   theme={theme}
 *   onNotesChange={setCompletionNotes}
 *   onClose={() => setShowModal(false)}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export default function TaskCompletionModal({
  visible,
  task,
  notes,
  isSubmitting,
  theme,
  onNotesChange,
  onClose,
  onSubmit,
}: TaskCompletionModalProps): JSX.Element {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Task</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <View style={styles.modalBody}>
            {task && (
              <>
                <View style={styles.taskSummary}>
                  {task.step_number && (
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>Step {task.step_number}</Text>
                    </View>
                  )}
                  <Text style={styles.taskSummaryTitle}>{task.title}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Completion Notes (Optional)</Text>
                  <Text style={styles.helpText}>
                    Share your reflections, insights, or any challenges you faced with this task.
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    value={notes}
                    onChangeText={onNotesChange}
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

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Cancel task completion"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={onSubmit}
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
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
      color: theme.white,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
