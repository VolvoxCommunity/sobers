import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { supabase } from '@/lib/supabase';
import { TaskTemplate, Profile } from '@/types/database';
import { ThemeColors } from '@/contexts/ThemeContext';
import { X, ChevronDown, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logger, LogCategory } from '@/lib/logger';
import { formatLocalDate, parseDateAsLocal } from '@/lib/date';

interface TaskCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  sponsorId: string;
  sponsees: Profile[];
  preselectedSponseeId?: string;
  theme: ThemeColors;
}

/**
 * Modal UI for assigning a new task from a sponsor to a sponsee.
 *
 * @param visible - Whether the modal is shown
 * @param onClose - Callback invoked when the modal should close
 * @param onTaskCreated - Callback invoked after a task is successfully created
 * @param sponsorId - ID of the sponsor assigning the task
 * @param sponsees - List of sponsee profiles to select from
 * @param preselectedSponseeId - Optional sponsee ID to preselect when the modal opens
 * @param theme - Theme colors used to style the modal
 * @returns A React element that renders the task creation modal
 */
export default function TaskCreationModal({
  visible,
  onClose,
  onTaskCreated,
  sponsorId,
  sponsees,
  preselectedSponseeId,
  theme,
}: TaskCreationModalProps) {
  const [selectedSponseeId, setSelectedSponseeId] = useState<string>(preselectedSponseeId || '');
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'sponsee' | 'step' | 'template' | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTemplates = useCallback(async () => {
    if (!selectedStepNumber) {
      setTemplates([]);
      return;
    }
    const { data } = await supabase
      .from('task_templates')
      .select('*')
      .eq('step_number', selectedStepNumber)
      .order('title');
    setTemplates(data || []);
  }, [selectedStepNumber]);

  useEffect(() => {
    if (preselectedSponseeId) {
      setSelectedSponseeId(preselectedSponseeId);
    }
  }, [preselectedSponseeId]);

  useEffect(() => {
    if (visible) {
      fetchTemplates();
    }
  }, [visible, fetchTemplates]);

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

      await supabase.from('notifications').insert({
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

      resetForm();
      onTaskCreated();
      onClose();
    } catch (err) {
      logger.error('Task creation failed', err as Error, {
        category: LogCategory.DATABASE,
      });
      setError('Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSponseeId(preselectedSponseeId || '');
    setSelectedStepNumber(null);
    setSelectedTemplate(null);
    setCustomTitle('');
    setCustomDescription('');
    setDueDate(null);
    setError('');
    setActiveDropdown(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={closeAllDropdowns}>
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} accessibilityRole="header">
                Assign New Task
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {error ? (
                <View style={styles.errorContainer} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Sponsee *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => toggleDropdown('sponsee')}
                  accessibilityRole="combobox"
                  accessibilityLabel="Select sponsee"
                  accessibilityHint="Double tap to choose a sponsee"
                  accessibilityState={{ expanded: activeDropdown === 'sponsee' }}
                >
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
                  <ScrollView style={styles.dropdownMenuScrollable}>
                    {sponsees.map((sponsee) => (
                      <TouchableOpacity
                        key={sponsee.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedSponseeId(sponsee.id);
                          closeAllDropdowns();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={sponsee?.display_name ?? 'Unknown sponsee'}
                      >
                        <Text style={styles.dropdownItemText}>
                          {sponsee?.display_name ?? 'Unknown sponsee'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Step Number (Optional)</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => toggleDropdown('step')}
                  accessibilityRole="combobox"
                  accessibilityLabel="Select step number"
                  accessibilityState={{ expanded: activeDropdown === 'step' }}
                >
                  <Text
                    style={[styles.dropdownText, !selectedStepNumber && styles.placeholderText]}
                  >
                    {selectedStepNumber ? `Step ${selectedStepNumber}` : 'Select step (optional)'}
                  </Text>
                  <ChevronDown size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {activeDropdown === 'step' && (
                <View style={styles.dropdownMenuOverlay}>
                  <ScrollView style={styles.dropdownMenuScrollable}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedStepNumber(null);
                        setSelectedTemplate(null);
                        setCustomTitle('');
                        setCustomDescription('');
                        closeAllDropdowns();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="No specific step"
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
                        accessibilityRole="button"
                        accessibilityLabel={`Step ${step}`}
                      >
                        <Text style={styles.dropdownItemText}>Step {step}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
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
                  accessibilityRole="combobox"
                  accessibilityLabel="Select task template"
                  accessibilityState={{
                    expanded: activeDropdown === 'template',
                    disabled: !selectedStepNumber,
                  }}
                  accessibilityHint={
                    !selectedStepNumber ? 'Select a step first to enable templates' : ''
                  }
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
                  <ScrollView style={styles.dropdownMenuScrollable}>
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
                          accessibilityRole="button"
                          accessibilityLabel={template.title}
                          accessibilityHint="Applies this template"
                        >
                          <Text style={styles.dropdownItemTextBold}>{template.title}</Text>
                          <Text style={styles.dropdownItemTextSmall} numberOfLines={2}>
                            {template.description}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
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
                  accessibilityLabel="Task Title"
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
                  accessibilityLabel="Task Description"
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
                    aria-label="Due Date"
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Set due date"
                      accessibilityHint="Opens date picker"
                      accessibilityValue={{ text: dueDate ? dueDate.toLocaleDateString() : 'None' }}
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
                      <TouchableOpacity
                        style={styles.clearDateButton}
                        onPress={() => setDueDate(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Clear Date"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.clearDateText}>Clear Date</Text>
                      </TouchableOpacity>
                    )}
                    {showDatePicker && (
                      <DateTimePicker
                        value={dueDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          setShowDatePicker(false);
                          if (date) setDueDate(date);
                        }}
                        minimumDate={new Date()}
                      />
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Assign Task"
                accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Assign Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
      maxHeight: '90%',
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
    formGroup: {
      marginBottom: 20,
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
      marginHorizontal: 20,
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
      backgroundColor: '#fee2e2',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: '#ef4444',
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
  });
