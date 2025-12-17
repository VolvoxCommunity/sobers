// =============================================================================
// Imports
// =============================================================================
import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsContent } from '@/components/settings';

// =============================================================================
// Component
// =============================================================================

/**
 * Full-screen settings page that serves as a fallback route.
 *
 * Primary access to settings is via the bottom sheet in profile.tsx.
 * This route exists for deep linking and as an alternative access pattern.
 *
 * Uses the shared SettingsContent component to ensure consistency
 * with the bottom sheet implementation.
 *
 * @returns The Settings screen React element
 */
export default function SettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 34) + 80 }]}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
    >
      <SettingsContent onDismiss={() => router.back()} />
    </ScrollView>
  );
}

// =============================================================================
// Styles
// =============================================================================

/**
 * Creates StyleSheet for the Settings screen based on current theme.
 *
 * @param theme - Theme colors from ThemeContext
 * @returns StyleSheet object with all component styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
  });
