// components/program/LogMeetingSheet.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, MapPin, Calendar, Clock, Trash2 } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
import { showToast } from '@/lib/toast';
import { showConfirm } from '@/lib/alert';
import type { UserMeeting } from '@/types/database';

export interface LogMeetingSheetRef {
  present: (date?: string, meeting?: UserMeeting) => void;
  dismiss: () => void;
}

interface LogMeetingSheetProps {
  onMeetingLogged: () => void;
  onMeetingDeleted?: () => void;
}

/**
 * Bottom sheet for logging or editing a meeting.
 * Fields: name (required), date, time (30-min increments), location, notes.
 */
const LogMeetingSheet = forwardRef<LogMeetingSheetRef, LogMeetingSheetProps>(
  ({ onMeetingLogged, onMeetingDeleted }, ref) => {
    const { theme } = useTheme();
    const { profile } = useAuth();
    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [editingMeeting, setEditingMeeting] = useState<UserMeeting | null>(null);
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date());
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isEditing = editingMeeting !== null;

    // Round time to nearest 30 minutes
    const roundTo30Min = (d: Date): Date => {
      const result = new Date(d);
      const minutes = result.getMinutes();
      const roundedMinutes = Math.round(minutes / 30) * 30;
      result.setMinutes(roundedMinutes, 0, 0);
      return result;
    };

    const resetForm = useCallback(() => {
      setEditingMeeting(null);
      setName('');
      setDate(roundTo30Min(new Date()));
      setLocation('');
      setNotes('');
      setError('');
      setShowDatePicker(false);
      setShowTimePicker(false);
    }, []);

    useImperativeHandle(ref, () => ({
      present: (initialDate?: string, meeting?: UserMeeting) => {
        resetForm();
        if (meeting) {
          setEditingMeeting(meeting);
          setName(meeting.meeting_name);
          setDate(new Date(meeting.attended_at));
          setLocation(meeting.location || '');
          setNotes(meeting.notes || '');
        } else if (initialDate) {
          const d = new Date(initialDate + 'T12:00:00');
          setDate(roundTo30Min(d));
        }
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleDismiss = useCallback(() => {
      resetForm();
    }, [resetForm]);

    const handleSubmit = useCallback(async () => {
      if (!profile) return;

      if (!name.trim()) {
        setError('Meeting name is required');
        return;
      }

      // Check not in future
      const now = new Date();
      if (date > now) {
        setError('Cannot log future meetings');
        return;
      }

      setIsSubmitting(true);
      setError('');

      try {
        const meetingData = {
          user_id: profile.id,
          meeting_name: name.trim(),
          meeting_type: 'other' as const,
          location: location.trim() || null,
          attended_at: date.toISOString(),
          notes: notes.trim() || null,
        };

        if (isEditing && editingMeeting) {
          const { error: updateError } = await supabase
            .from('user_meetings')
            .update(meetingData)
            .eq('id', editingMeeting.id);

          if (updateError) throw updateError;
          showToast.success('Meeting updated');
        } else {
          const { error: insertError } = await supabase.from('user_meetings').insert(meetingData);

          if (insertError) throw insertError;
          showToast.success('Meeting logged');
        }

        onMeetingLogged();
        handleClose();
      } catch (err) {
        logger.error('Meeting save failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to save meeting. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }, [
      profile,
      name,
      date,
      location,
      notes,
      isEditing,
      editingMeeting,
      onMeetingLogged,
      handleClose,
    ]);

    const handleDelete = useCallback(async () => {
      if (!editingMeeting) return;

      const confirmed = await showConfirm(
        'Delete Meeting',
        'Are you sure you want to delete this meeting?',
        'Delete',
        'Cancel',
        true
      );

      if (!confirmed) return;

      setIsSubmitting(true);

      try {
        const { error: deleteError } = await supabase
          .from('user_meetings')
          .delete()
          .eq('id', editingMeeting.id);

        if (deleteError) throw deleteError;

        showToast.success('Meeting deleted');
        onMeetingDeleted?.();
        handleClose();
      } catch (err) {
        logger.error('Meeting delete failed', err as Error, {
          category: LogCategory.DATABASE,
        });
        setError('Failed to delete meeting');
      } finally {
        setIsSubmitting(false);
      }
    }, [editingMeeting, onMeetingDeleted, handleClose]);

    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <GlassBottomSheet
        ref={sheetRef}
        snapPoints={['70%', '90%']}
        onDismiss={handleDismiss}
        keyboardBehavior="interactive"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MapPin size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>{isEditing ? 'Edit Meeting' : 'Log Meeting'}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Meeting Name *</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Friday Night AA"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                <Calendar size={18} color={theme.textSecondary} />
                <Text style={styles.pickerText}>{formattedDate}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.flex1]}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                <Clock size={18} color={theme.textSecondary} />
                <Text style={styles.pickerText}>{formattedTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(showDatePicker || showTimePicker) && Platform.OS !== 'web' && (
            <DateTimePicker
              value={date}
              mode={showDatePicker ? 'date' : 'time'}
              display={showTimePicker ? 'spinner' : 'default'}
              minuteInterval={30}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
            />
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <BottomSheetTextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Community Center"
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <BottomSheetTextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any thoughts or reflections..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </BottomSheetScrollView>

        <View style={styles.footer}>
          {isEditing && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Trash2 size={20} color={theme.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Log Meeting'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassBottomSheet>
    );
  }
);

LogMeetingSheet.displayName = 'LogMeetingSheet';

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
      fontFamily: theme.fontSemiBold,
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
    scrollContent: {
      padding: 20,
    },
    errorContainer: {
      backgroundColor: theme.dangerLight,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.danger,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
      color: theme.text,
      marginBottom: 8,
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
    notesInput: {
      minHeight: 80,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    flex1: {
      flex: 1,
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    pickerText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    deleteButton: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    submitText: {
      fontSize: 16,
      fontFamily: theme.fontSemiBold,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

export default LogMeetingSheet;
