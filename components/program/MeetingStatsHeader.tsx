// components/program/MeetingStatsHeader.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Users } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

interface MeetingStatsHeaderProps {
  totalMeetings: number;
  streak: number;
}

/**
 * Displays meeting count and streak stats at top of Meetings screen.
 * Streak only shown when active (> 0).
 */
export default function MeetingStatsHeader({ totalMeetings, streak }: MeetingStatsHeaderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const meetingLabel = totalMeetings === 1 ? 'meeting' : 'meetings';

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Users size={20} color={theme.primary} />
        <Text style={styles.statText}>
          {totalMeetings} {meetingLabel}
        </Text>
      </View>

      {streak > 0 && (
        <View style={styles.stat}>
          <Flame size={20} color={theme.warning} />
          <Text style={styles.statText}>{streak} day streak</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 24,
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statText: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
  });
