// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';

// =============================================================================
// Types
// =============================================================================
interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
}

// =============================================================================
// Component
// =============================================================================
/**
 * Reusable placeholder screen for Program section tabs that are coming soon.
 */
export default function PlaceholderScreen({
  title,
  subtitle = 'Coming soon',
}: PlaceholderScreenProps) {
  const { theme } = useTheme();
  const tabBarHeight = useTabBarPadding();
  const styles = createStyles(theme);
  const prefix = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <View style={[styles.container, { paddingBottom: tabBarHeight }]} testID={`${prefix}-screen`}>
      <View style={styles.content}>
        <Text style={styles.title} testID={`${prefix}-title`}>
          {title}
        </Text>
        <Text style={styles.subtitle} testID={`${prefix}-subtitle`}>
          {subtitle}
        </Text>
      </View>
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
