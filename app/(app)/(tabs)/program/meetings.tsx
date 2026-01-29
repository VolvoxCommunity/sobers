// app/(app)/(tabs)/program/meetings.tsx
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, SectionList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger, LogCategory } from '@/lib/logger';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import MeetingStatsHeader from '@/components/program/MeetingStatsHeader';
import MeetingsCalendar from '@/components/program/MeetingsCalendar';
import MeetingListItem from '@/components/program/MeetingListItem';
import DayDetailSheet, { DayDetailSheetRef } from '@/components/program/DayDetailSheet';
import LogMeetingSheet, { LogMeetingSheetRef } from '@/components/program/LogMeetingSheet';
import {
  calculateMeetingStreak,
  checkMeetingMilestones,
  getInvalidMilestones,
} from '@/lib/meeting-utils';
import type { UserMeeting, UserMeetingMilestone } from '@/types/database';

/**
 * Meetings screen - calendar view with meeting attendance tracking.
 */
export default function MeetingsScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const tabBarHeight = useTabBarPadding();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [meetings, setMeetings] = useState<UserMeeting[]>([]);
  const [milestones, setMilestones] = useState<UserMeetingMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayDetailRef = useRef<DayDetailSheetRef>(null);
  const logMeetingRef = useRef<LogMeetingSheetRef>(null);

  // Fetch meetings and milestones
  const fetchData = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const [meetingsResult, milestonesResult] = await Promise.all([
        supabase
          .from('user_meetings')
          .select('*')
          .eq('user_id', profile.id)
          .order('attended_at', { ascending: false }),
        supabase.from('user_meeting_milestones').select('*').eq('user_id', profile.id),
      ]);

      if (meetingsResult.error) throw meetingsResult.error;
      if (milestonesResult.error) throw milestonesResult.error;

      setMeetings(meetingsResult.data || []);
      setMilestones(milestonesResult.data || []);
    } catch (err) {
      logger.error('Meetings fetch failed', err as Error, {
        category: LogCategory.DATABASE,
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Calculate stats
  const streak = useMemo(() => calculateMeetingStreak(meetings), [meetings]);

  const meetingDates = useMemo(() => {
    const dates = new Set<string>();
    meetings.forEach((m) => {
      const date = new Date(m.attended_at).toLocaleDateString('en-CA');
      dates.add(date);
    });
    return dates;
  }, [meetings]);

  // Get meetings for a specific day
  const getMeetingsForDay = useCallback(
    (dateStr: string) => {
      return meetings.filter((m) => {
        const meetingDate = new Date(m.attended_at).toLocaleDateString('en-CA');
        return meetingDate === dateStr;
      });
    },
    [meetings]
  );

  // Handle day press on calendar
  const handleDayPress = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      const dayMeetings = getMeetingsForDay(dateStr);
      dayDetailRef.current?.present(dateStr, dayMeetings);
    },
    [getMeetingsForDay]
  );

  // Handle log meeting from day detail
  const handleLogMeeting = useCallback((date: string) => {
    dayDetailRef.current?.dismiss();
    setTimeout(() => {
      logMeetingRef.current?.present(date);
    }, 300);
  }, []);

  // Handle edit meeting
  const handleEditMeeting = useCallback((meeting: UserMeeting) => {
    dayDetailRef.current?.dismiss();
    setTimeout(() => {
      logMeetingRef.current?.present(undefined, meeting);
    }, 300);
  }, []);

  // Handle meeting logged - check for milestones
  const handleMeetingLogged = useCallback(async () => {
    // Refetch to get updated meetings list
    const { data: updatedMeetings } = await supabase
      .from('user_meetings')
      .select('*')
      .eq('user_id', profile?.id)
      .order('attended_at', { ascending: false });

    if (!updatedMeetings || !profile) {
      await fetchData();
      return;
    }

    // Calculate streak with updated meetings
    const updatedStreak = calculateMeetingStreak(updatedMeetings);

    const newMilestones = checkMeetingMilestones(
      updatedMeetings,
      updatedStreak,
      milestones.map((m) => ({
        milestone_type: m.milestone_type,
        milestone_value: m.milestone_value,
      }))
    );

    // Save new milestones with correct achieved_at date
    for (const milestone of newMilestones) {
      try {
        await supabase.from('user_meeting_milestones').insert({
          user_id: profile.id,
          milestone_type: milestone.type,
          milestone_value: milestone.value,
          achieved_at: milestone.achievedAt,
        });
        logger.info(`Meeting milestone achieved: ${milestone.label}`, {
          category: LogCategory.DATABASE,
        });
      } catch (err) {
        logger.error('Failed to save milestone', err as Error, {
          category: LogCategory.DATABASE,
        });
      }
    }

    // Refresh data
    await fetchData();
  }, [fetchData, profile, milestones]);

  // Handle meeting deleted - remove invalid milestones
  const handleMeetingDeleted = useCallback(async () => {
    if (!profile) {
      await fetchData();
      return;
    }

    // Refetch to get updated meetings list
    const { data: updatedMeetings } = await supabase
      .from('user_meetings')
      .select('*')
      .eq('user_id', profile.id)
      .order('attended_at', { ascending: false });

    if (!updatedMeetings) {
      await fetchData();
      return;
    }

    // Calculate updated streak
    const updatedStreak = calculateMeetingStreak(updatedMeetings);

    // Find milestones that are no longer valid
    const invalidMilestones = getInvalidMilestones(
      updatedMeetings.length,
      updatedStreak,
      milestones.map((m) => ({
        milestone_type: m.milestone_type,
        milestone_value: m.milestone_value,
      }))
    );

    // Delete invalid milestones
    for (const milestone of invalidMilestones) {
      try {
        await supabase
          .from('user_meeting_milestones')
          .delete()
          .eq('user_id', profile.id)
          .eq('milestone_type', milestone.type)
          .eq('milestone_value', milestone.value);
        logger.info(`Meeting milestone removed: ${milestone.type}-${milestone.value}`, {
          category: LogCategory.DATABASE,
        });
      } catch (err) {
        logger.error('Failed to remove milestone', err as Error, {
          category: LogCategory.DATABASE,
        });
      }
    }

    // Refresh data
    await fetchData();
  }, [fetchData, profile, milestones]);

  // Handle press on meeting in list
  const handleMeetingPress = useCallback((meeting: UserMeeting) => {
    logMeetingRef.current?.present(undefined, meeting);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <SectionList
        sections={[{ key: 'meetings', data: meetings }]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <MeetingStatsHeader totalMeetings={meetings.length} streak={streak} />
            <MeetingsCalendar
              meetingDates={meetingDates}
              onDayPress={handleDayPress}
              selectedDate={selectedDate}
            />
            {meetings.length > 0 ? (
              <Text style={styles.sectionTitle}>Recent Meetings</Text>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No meetings logged yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap any day on the calendar to log your first meeting
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.listItemContainer}>
            <MeetingListItem meeting={item} onPress={handleMeetingPress} showDate />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No meetings logged yet</Text>
            <Text style={styles.emptySubtext}>
              Tap any day on the calendar to log your first meeting
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      <DayDetailSheet
        ref={dayDetailRef}
        onLogMeeting={handleLogMeeting}
        onEditMeeting={handleEditMeeting}
      />

      <LogMeetingSheet
        ref={logMeetingRef}
        onMeetingLogged={handleMeetingLogged}
        onMeetingDeleted={handleMeetingDeleted}
      />
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      flexGrow: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 12,
    },
    listItemContainer: {
      paddingHorizontal: 16,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
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
      textAlign: 'center',
    },
  });
