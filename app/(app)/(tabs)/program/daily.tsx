// =============================================================================
// Imports
// =============================================================================
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { getUserTimezone, formatDateWithTimezone } from '@/lib/date';
import { fetchDailyReflectionForDate, type DailyReflectionResult } from '@/lib/daily-reflections';
import { logger, LogCategory } from '@/lib/logger';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Format YYYY-MM-DD string into a user-friendly date label.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date label
 */
function formatReflectionDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Convert unknown thrown values into Error instances for logging.
 *
 * @param value - Unknown error value
 * @returns Error instance
 */
function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(String(value));
}

// =============================================================================
// Component
// =============================================================================

/**
 * Daily Reflections screen - displays the AA daily reflection for today.
 */
export default function DailyReflectionsScreen(): React.ReactElement {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const tabBarHeight = useTabBarPadding();

  const [reflection, setReflection] = useState<DailyReflectionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const timezone = getUserTimezone(profile);

  const loadDailyReflection = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const todayDateString = formatDateWithTimezone(new Date(), timezone);

    try {
      const nextReflection = await fetchDailyReflectionForDate(todayDateString);
      setReflection(nextReflection);
    } catch (error) {
      logger.error('Daily reflection fetch failed', toError(error), {
        category: LogCategory.UI,
        date: todayDateString,
      });
      setReflection(null);
      setErrorMessage('Failed to load daily reflection');
    } finally {
      setIsLoading(false);
    }
  }, [timezone]);

  useFocusEffect(
    useCallback(() => {
      loadDailyReflection();
    }, [loadDailyReflection])
  );

  const displayDate = useMemo(() => {
    const fallbackDate = formatDateWithTimezone(new Date(), timezone);
    return formatReflectionDate(reflection?.date ?? fallbackDate);
  }, [reflection?.date, timezone]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        testID="daily-reflections-scroll"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Daily Reflections</Text>
          <Text style={styles.date}>{displayDate}</Text>
        </View>

        {isLoading && (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading daily reflection...</Text>
          </View>
        )}

        {!isLoading && errorMessage && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={loadDailyReflection}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !errorMessage && reflection && (
          <View style={styles.card} testID="daily-reflection-card">
            <Text style={styles.reflectionTitle}>{reflection.title}</Text>
            <Text style={styles.reflectionContent}>{reflection.content}</Text>
            {reflection.source && <Text style={styles.reflectionSource}>{reflection.source}</Text>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    date: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    reflectionTitle: {
      fontSize: 20,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      marginBottom: 12,
    },
    reflectionContent: {
      fontSize: 15,
      fontFamily: theme.fontRegular,
      color: theme.text,
      lineHeight: 24,
      marginBottom: 16,
    },
    reflectionSource: {
      fontSize: 13,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    centerContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
      minHeight: 220,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    errorText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.danger,
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    retryButtonText: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
      color: theme.white,
    },
  });
