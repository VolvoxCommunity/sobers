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
import { supabase } from '@/lib/supabase';
import { TaskTemplate, Profile } from '@/types/database';
import { X, ChevronDown, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TaskCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  sponsorId: string;
  sponsees: Profile[];
  preselectedSponseeId?: string;
  theme: any;
}

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
      const taskData: any = {
        sponsor_id: sponsorId,
        sponsee_id: selectedSponseeId,
        step_number: selectedStepNumber || null,
        title: customTitle.trim(),
        description: customDescription.trim(),
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
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
    } catch (err: any) {
      console.error('Error creating task:', err);
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
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeAllDropdowns}>
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign New Task</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                    ? `${sponsees.find((s) => s.id === selectedSponseeId)?.first_name} ${
                        sponsees.find((s) => s.id === selectedSponseeId)?.last_initial
                      }.`
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
                    >
                      <Text style={styles.dropdownItemText}>
                        {sponsee?.first_name}
                        {sponsee?.last_initial ? ` ${sponsee?.last_initial}.` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                  value={dueDate ? dueDate.toISOString().split('T')[0] : ''}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
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
                    onPress={() => setShowDatePicker(true)}
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
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Assign Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (theme: any) =>
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
