// components/program/MeetingListItem.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { UserMeeting } from '@/types/database';

interface MeetingListItemProps {
  meeting: UserMeeting;
  onPress: (meeting: UserMeeting) => void;
  showDate?: boolean;
}

/**
 * Displays a single meeting in a list.
 * Shows name, time, and location.
 */
export default function MeetingListItem({
  meeting,
  onPress,
  showDate = false,
}: MeetingListItemProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const meetingDate = new Date(meeting.attended_at);
  const time = meetingDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const date = meetingDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(meeting)}
      testID={`meeting-item-${meeting.id}`}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Users size={20} color={theme.primary} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {meeting.meeting_name}
        </Text>
        <View style={styles.details}>
          {showDate && (
            <View style={styles.detail}>
              <Clock size={12} color={theme.textTertiary} />
              <Text style={styles.detailText}>
                {date} at {time}
              </Text>
            </View>
          )}
          {!showDate && (
            <View style={styles.detail}>
              <Clock size={12} color={theme.textTertiary} />
              <Text style={styles.detailText}>{time}</Text>
            </View>
          )}
          {meeting.location && (
            <View style={styles.detail}>
              <MapPin size={12} color={theme.textTertiary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {meeting.location}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Chevron */}
      <ChevronRight size={20} color={theme.textTertiary} />
    </Pressable>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pressed: {
      opacity: 0.7,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    detail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
