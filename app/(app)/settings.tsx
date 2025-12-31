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
 * Modal settings screen accessible from any tab via the settings button.
 *
 * Presented as a modal that slides up over the current screen. Uses the shared
 * SettingsContent component. Dismissing returns to the previous screen.
 *
 * @returns The Settings modal screen React element
 */
export default function SettingsModal() {
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
 * Creates StyleSheet for the Settings modal based on current theme.
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
