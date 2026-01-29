// components/program/MeetingsCalendar.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

interface MeetingsCalendarProps {
  meetingDates: Set<string>;
  onDayPress: (dateStr: string) => void;
  selectedDate: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Monthly calendar grid showing meeting attendance.
 * Days with meetings have a dot indicator.
 */
export default function MeetingsCalendar({
  meetingDates,
  onDayPress,
  selectedDate,
}: MeetingsCalendarProps) {
  const { theme } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const styles = useMemo(() => createStyles(theme), [theme]);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add days of month
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }

    return days;
  }, [currentMonth]);

  const getDateStr = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <Pressable onPress={goToPrevMonth} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.monthYear}>{monthYear}</Text>
        <Pressable onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS.map((day) => (
          <Text key={day} style={styles.dayLabel}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = getDateStr(day);
          const hasMeeting = meetingDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > todayStr;

          return (
            <Pressable
              key={day}
              testID={`calendar-day-${day}`}
              style={styles.dayCell}
              onPress={() => !isFuture && onDayPress(dateStr)}
              disabled={isFuture}
            >
              <View
                style={[
                  styles.dayInner,
                  isToday && styles.todayCell,
                  isSelected && styles.selectedCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.todayText,
                    isSelected && styles.selectedText,
                    isFuture && styles.futureText,
                  ]}
                >
                  {day}
                </Text>
              </View>
              {hasMeeting && <View style={styles.meetingDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      margin: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    navButton: {
      padding: 8,
    },
    monthYear: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
    },
    dayLabels: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontFamily: theme.fontMedium,
      color: theme.textTertiary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    dayInner: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 18,
    },
    todayCell: {
      backgroundColor: theme.primaryLight,
    },
    selectedCell: {
      backgroundColor: theme.primary,
    },
    dayText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    todayText: {
      fontFamily: theme.fontSemiBold,
      color: theme.primary,
    },
    selectedText: {
      color: '#fff',
    },
    futureText: {
      color: theme.textTertiary,
    },
    meetingDot: {
      position: 'absolute',
      bottom: 0,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
  });
