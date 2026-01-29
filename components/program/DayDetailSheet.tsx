// components/program/DayDetailSheet.tsx
import React, { forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Plus, Calendar } from 'lucide-react-native';
import GlassBottomSheet, { GlassBottomSheetRef } from '@/components/GlassBottomSheet';
import MeetingListItem from '@/components/program/MeetingListItem';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { UserMeeting } from '@/types/database';

export interface DayDetailSheetRef {
  present: (date: string, meetings: UserMeeting[]) => void;
  dismiss: () => void;
}

interface DayDetailSheetProps {
  onLogMeeting: (date: string) => void;
  onEditMeeting: (meeting: UserMeeting) => void;
}

/**
 * Bottom sheet showing meetings for a selected day.
 * Includes list of meetings and button to log new meeting.
 */
const DayDetailSheet = forwardRef<DayDetailSheetRef, DayDetailSheetProps>(
  ({ onLogMeeting, onEditMeeting }, ref) => {
    const { theme } = useTheme();
    const sheetRef = useRef<GlassBottomSheetRef>(null);
    const [selectedDate, setSelectedDate] = React.useState<string>('');
    const [meetings, setMeetings] = React.useState<UserMeeting[]>([]);
    const styles = useMemo(() => createStyles(theme), [theme]);

    useImperativeHandle(ref, () => ({
      present: (date: string, dayMeetings: UserMeeting[]) => {
        setSelectedDate(date);
        setMeetings(dayMeetings);
        sheetRef.current?.present();
      },
      dismiss: () => sheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      sheetRef.current?.dismiss();
    }, []);

    const handleLogMeeting = useCallback(() => {
      onLogMeeting(selectedDate);
    }, [selectedDate, onLogMeeting]);

    const formattedDate = selectedDate
      ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : '';

    return (
      <GlassBottomSheet ref={sheetRef} snapPoints={['50%', '80%']}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Calendar size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>{formattedDate}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {meetings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No meetings logged</Text>
              <Text style={styles.emptySubtext}>Tap the button below to log a meeting</Text>
            </View>
          ) : (
            meetings.map((meeting) => (
              <MeetingListItem key={meeting.id} meeting={meeting} onPress={onEditMeeting} />
            ))
          )}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logButton} onPress={handleLogMeeting}>
            <Plus size={20} color="#fff" />
            <Text style={styles.logButtonText}>Log Meeting</Text>
          </TouchableOpacity>
        </View>
      </GlassBottomSheet>
    );
  }
);

DayDetailSheet.displayName = 'DayDetailSheet';

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
      fontSize: 18,
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
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    logButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
    },
    logButtonText: {
      fontSize: 16,
      fontFamily: theme.fontSemiBold,
      color: '#fff',
    },
  });

export default DayDetailSheet;
