import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

/**
 * Meetings screen - displays meeting attendance tracker.
 */
export default function MeetingsScreen() {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Meetings</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
  });
