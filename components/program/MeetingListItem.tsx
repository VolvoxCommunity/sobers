// components/program/MeetingListItem.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Clock } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { UserMeeting } from '@/types/database';

interface MeetingListItemProps {
  meeting: UserMeeting;
  onPress: (meeting: UserMeeting) => void;
}

/**
 * Displays a single meeting in a list.
 * Shows name, time, and location.
 */
export default function MeetingListItem({ meeting, onPress }: MeetingListItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const time = new Date(meeting.attended_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Pressable
      style={styles.container}
      onPress={() => onPress(meeting)}
      testID={`meeting-item-${meeting.id}`}
    >
      <View style={styles.content}>
        <Text style={styles.name}>{meeting.meeting_name}</Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Clock size={14} color={theme.textSecondary} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          {meeting.location && (
            <View style={styles.detail}>
              <MapPin size={14} color={theme.textSecondary} />
              <Text style={styles.detailText}>{meeting.location}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    content: {
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
    details: {
      flexDirection: 'row',
      gap: 16,
    },
    detail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
