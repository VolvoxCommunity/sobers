// =============================================================================
// Imports
// =============================================================================
import React, {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { supabase } from '@/lib/supabase';
import { TaskTemplate, Profile } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import { X, ChevronDown, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logger, LogCategory } from '@/lib/logger';
import { formatLocalDate, parseDateAsLocal } from '@/lib/date';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Imperative methods exposed by TaskCreationSheet via ref.
 */
export interface TaskCreationSheetRef {
  /**
   * Presents the task creation sheet.
   */
  present: () => void;

  /**
   * Dismisses the task creation sheet.
   */
  dismiss: () => void;
}

interface TaskCreationSheetProps {
  onClose: () => void;
  onTaskCreated: () => void;
  sponsorId: string;
  sponsees: Profile[];
  preselectedSponseeId?: string;
  theme: ThemeColors;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Bottom sheet UI for assigning a new task from a sponsor to a sponsee.
 *
 * Uses GlassBottomSheet for Liquid Glass styling with imperative API.
 * Call sheetRef.current?.present() to open, sheetRef.current?.dismiss() to close.
 *
 * @param onClose - Callback invoked when the sheet should close
 * @param onTaskCreated - Callback invoked after a task is successfully created
 * @param sponsorId - ID of the sponsor assigning the task
 * @param sponsees - List of sponsee profiles to select from
 * @param preselectedSponseeId - Optional sponsee ID to preselect when the sheet opens
 * @param theme - Theme colors used to style the sheet
 * @returns A React element that renders the task creation bottom sheet
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<TaskCreationSheetRef>(null);
 *
 * // Open the sheet
 * sheetRef.current?.present();
 *
 * <TaskCreationSheet
 *   ref={sheetRef}
 *   onClose={() => {}}
 *   onTaskCreated={handleTaskCreated}
 *   sponsorId={profile.id}
 *   sponsees={sponseeProfiles}
 *   theme={theme}
 * />
 * ```
 */
const TaskCreationSheet = forwardRef<TaskCreationSheetRef, TaskCreationSheetProps>(
  ({ onClose, onTaskCreated, sponsorId, sponsees, preselectedSponseeId, theme }, ref) => {
    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------
    const [selectedSponseeId, setSelectedSponseeId] = useState<string>(preselectedSponseeId || '');
    const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);
    const [templates, setTemplates] = useState<TaskTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<'sponsee' | 'step' | 'template' | null>(
      null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const sheetRef = React.useRef<GlassBottomSheetRef>(null);
    const isMountedRef = useRef(true);

    // Track mounted state to prevent state updates after unmount
    useEffect(() => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // ---------------------------------------------------------------------------
    // Helper Functions (defined before imperative API to avoid hoisting issues)
    // ---------------------------------------------------------------------------
    const resetForm = useCallback(() => {
      setSelectedSponseeId(preselectedSponseeId || '');
      setSelectedStepNumber(null);
      setSelectedTemplate(null);
      setCustomTitle('');
      setCustomDescription('');
      setDueDate(null);
      setError('');
      setActiveDropdown(null);
    }, [preselectedSponseeId]);

    // ---------------------------------------------------------------------------
    // Imperative API
    // ---------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      present: () => {
        // Reset form when presenting to ensure clean state
        resetForm();
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------
    const fetchTemplates = useCallback(async () => {
      if (!selectedStepNumber) {
        setTemplates([]);
        return;
      }
      const { data, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('step_number', selectedStepNumber)
        .order('title');

      if (templateError) {
        logger.warn('Failed to fetch task templates', {
          category: LogCategory.DATABASE,
          error: templateError.message,
          stepNumber: selectedStepNumber,
        });
      }
      // Guard: Only update state if component is still mounted
      if (isMountedRef.current) {
        setTemplates(data || []);
      }
    }, [selectedStepNumber]);

    useEffect(() => {
      if (preselectedSponseeId) {
        setSelectedSponseeId(preselectedSponseeId);
      }
    }, [preselectedSponseeId]);

    useEffect(() => {
      fetchTemplates();
    }, [fetchTemplates]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleTemplateSelect = (template: TaskTemplate) => {
      setSelectedTemplate(template);
      setCustomTitle(template.title);
      setCustomDescription(template.description);
      setActiveDropdown(null);
    };

    const toggleDropdown = (dropdown: 'sponsee' | 'step' | 'template') => {
      setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
    };

    const closeAllDropdowns = () => {
      setActiveDropdown(null);
    };

    const handleSubmit = async () => {
      setError('');

      if (!selectedSponseeId) {
        setError('Please select a sponsee');
        return;
      }

      if (!customTitle.trim()) {
        setError('Please enter a task title');
        return;
      }

      if (!customDescription.trim()) {
        setError('Please enter a task description');
        return;
      }

      setIsSubmitting(true);

      try {
        const taskData = {
          sponsor_id: sponsorId,
          sponsee_id: selectedSponseeId,
          step_number: selectedStepNumber || null,
          title: customTitle.trim(),
          description: customDescription.trim(),
          due_date: dueDate ? formatLocalDate(dueDate) : null,
          status: 'assigned',
        };

        const { error: insertError } = await supabase.from('tasks').insert(taskData);

        if (insertError) throw insertError;

        // Send notification to sponsee (non-blocking - task creation succeeds even if notification fails)
        const { error: notifyError } = await supabase.from('notifications').insert({
          user_id: selectedSponseeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          content: selectedStepNumber
            ? `Your sponsor has assigned you a new task for Step ${selectedStepNumber}: ${customTitle.trim()}`
            : `Your sponsor has assigned you a new task: ${customTitle.trim()}`,
          data: {
            step_number: selectedStepNumber,
            task_title: customTitle.trim(),
          },
        });

        if (notifyError) {
          // Log notification failure but don't fail the task creation
          logger.warn('Failed to send task notification', {
            category: LogCategory.DATABASE,
            error: notifyError.message,
            sponseeId: selectedSponseeId,
          });
        }

        // Guard: Only update state and call callbacks if component is still mounted
        // Note: resetForm() and onClose() are called via handleDismiss when the sheet closes
        if (isMountedRef.current) {
          onTaskCreated();
          handleClose();
        }
      } catch (err) {
        logger.error('Task creation failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        // Guard: Only update state if component is still mounted
        if (isMountedRef.current) {
          setError('Failed to create task. Please try again.');
        }
      } finally {
        // Guard: Only update state if component is still mounted
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    };

    /**
     * Handles cleanup when the sheet is dismissed (called via onDismiss).
     * This ensures cleanup and callbacks only run once after the sheet fully closes.
     */
    const handleDismiss = () => {
      if (!isMountedRef.current) return;
      resetForm();
      onClose();
    };

    /**
     * Requests the sheet to close. The actual cleanup happens in handleDismiss
     * when the sheet finishes closing.
     */
    const handleClose = () => {
      sheetRef.current?.dismiss();
    };

    const styles = createStyles(theme);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['60%', '90%']}
        onDismiss={handleDismiss}
        keyboardBehavior="extend"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Assign New Task</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onTouchStart={closeAllDropdowns}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sponsee *</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => toggleDropdown('sponsee')}>
              <Text style={[styles.dropdownText, !selectedSponseeId && styles.placeholderText]}>
                {selectedSponseeId
                  ? (sponsees.find((s) => s.id === selectedSponseeId)?.display_name ??
                    'Unknown sponsee')
                  : 'Select sponsee'}
              </Text>
              <ChevronDown size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeDropdown === 'sponsee' && (
            <View style={styles.dropdownMenuOverlay}>
              <BottomSheetScrollView style={styles.dropdownMenuScrollable}>
                {sponsees.map((sponsee) => (
                  <TouchableOpacity
                    key={sponsee.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedSponseeId(sponsee.id);
                      closeAllDropdowns();
                    }}
                  >
                    <Text style={styles.dropdownItemText}>
                      {sponsee?.display_name ?? 'Unknown sponsee'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </BottomSheetScrollView>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Step Number (Optional)</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => toggleDropdown('step')}>
              <Text style={[styles.dropdownText, !selectedStepNumber && styles.placeholderText]}>
                {selectedStepNumber ? `Step ${selectedStepNumber}` : 'Select step (optional)'}
              </Text>
              <ChevronDown size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeDropdown === 'step' && (
            <View style={styles.dropdownMenuOverlay}>
              <BottomSheetScrollView style={styles.dropdownMenuScrollable}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedStepNumber(null);
                    setSelectedTemplate(null);
                    setCustomTitle('');
                    setCustomDescription('');
                    closeAllDropdowns();
                  }}
                >
                  <Text style={[styles.dropdownItemText, { fontStyle: 'italic' }]}>
                    No specific step
                  </Text>
                </TouchableOpacity>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((step) => (
                  <TouchableOpacity
                    key={step}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedStepNumber(step);
                      setSelectedTemplate(null);
                      setCustomTitle('');
                      setCustomDescription('');
                      closeAllDropdowns();
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Step {step}</Text>
                  </TouchableOpacity>
                ))}
              </BottomSheetScrollView>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Template (Optional)</Text>
            <TouchableOpacity
              style={[styles.dropdown, !selectedStepNumber && styles.dropdownDisabled]}
              onPress={() => {
                if (selectedStepNumber) {
                  toggleDropdown('template');
                }
              }}
              disabled={!selectedStepNumber}
            >
              <Text
                style={[
                  styles.dropdownText,
                  (!selectedStepNumber || !selectedTemplate) && styles.placeholderText,
                ]}
              >
                {!selectedStepNumber
                  ? 'Select a step first to see templates'
                  : selectedTemplate
                    ? selectedTemplate.title
                    : 'Choose from template or create custom'}
              </Text>
              <ChevronDown size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {activeDropdown === 'template' && selectedStepNumber && (
            <View style={styles.dropdownMenuOverlay}>
              <BottomSheetScrollView style={styles.dropdownMenuScrollable}>
                {templates.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <Text style={styles.dropdownItemTextSmall}>
                      No templates available for this step
                    </Text>
                  </View>
                ) : (
                  templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={styles.dropdownItem}
                      onPress={() => handleTemplateSelect(template)}
                    >
                      <Text style={styles.dropdownItemTextBold}>{template.title}</Text>
                      <Text style={styles.dropdownItemTextSmall} numberOfLines={2}>
                        {template.description}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </BottomSheetScrollView>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Enter task title"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Task Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customDescription}
              onChangeText={setCustomDescription}
              placeholder="Enter task description"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Due Date (Optional)</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={dueDate ? formatLocalDate(dueDate) : ''}
                min={formatLocalDate(new Date())}
                onChange={(e) =>
                  setDueDate(e.target.value ? parseDateAsLocal(e.target.value) : null)
                }
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card,
                  color: theme.text,
                  width: '100%',
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setIsDatePickerVisible(true)}
                >
                  <Calendar size={20} color={theme.textSecondary} />
                  <Text style={styles.dateButtonText}>
                    {dueDate
                      ? dueDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Set due date'}
                  </Text>
                </TouchableOpacity>
                {dueDate && (
                  <TouchableOpacity style={styles.clearDateButton} onPress={() => setDueDate(null)}>
                    <Text style={styles.clearDateText}>Clear Date</Text>
                  </TouchableOpacity>
                )}
                {isDatePickerVisible && (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setIsDatePickerVisible(false);
                      if (date) setDueDate(date);
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.submitButtonText}>Assign Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </GlassBottomSheet>
    );
  }
);

// Set display name for debugging
TaskCreationSheet.displayName = 'TaskCreationSheet';

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
    title: {
      fontSize: 20,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    formGroup: {
      marginBottom: 20,
      marginTop: 8,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    dropdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
    },
    dropdownDisabled: {
      opacity: 0.5,
    },
    dropdownText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
      flex: 1,
    },
    placeholderText: {
      color: theme.textTertiary,
    },
    dropdownMenuOverlay: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 15,
    },
    dropdownMenuScrollable: {
      maxHeight: 250,
    },
    dropdownItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    dropdownItemText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    dropdownItemTextBold: {
      fontSize: 15,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    dropdownItemTextSmall: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    input: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    textArea: {
      minHeight: 120,
      paddingTop: 12,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    dateButtonText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    clearDateButton: {
      marginTop: 8,
      alignItems: 'center',
    },
    clearDateText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.primary,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      marginTop: 8,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
    },
    footer: {
      flexDirection: 'row',
      paddingVertical: 20,
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
export default TaskCreationSheet;
