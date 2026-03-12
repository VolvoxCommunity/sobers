// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import SettingsButton from '@/components/navigation/SettingsButton';
import { Bot } from 'lucide-react-native';
import { hexWithAlpha } from '@/lib/format';

// =============================================================================
// Component
// =============================================================================

/**
 * Buddy tab screen — placeholder for the Sobers Buddy AI companion.
 *
 * Displays a coming soon message while the full chat interface is being built.
 * This screen is only visible when the user has `ai_buddy_enabled` set to true.
 */
export default function BuddyScreen(): React.ReactElement {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const tabBarPadding = useTabBarPadding();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, { paddingBottom: tabBarPadding }]}>
      {Platform.OS !== 'web' && <SettingsButton />}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bot size={48} color={theme.primary} />
        </View>
        <Text style={styles.title}>Sobers Buddy</Text>
        <Text style={styles.subtitle}>Your AI-powered accountability partner</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming Soon</Text>
          <Text style={styles.cardText}>
            {profile?.display_name ? `Hey ${profile.display_name}! ` : ''}Sobers Buddy is an AI
            companion designed to support your recovery journey. Chat, get encouragement, and
            receive personalized support — all with complete privacy.
          </Text>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>💬 Real-time chat conversations</Text>
          <Text style={styles.featureItem}>🎯 Personalized recovery support</Text>
          <Text style={styles.featureItem}>🔒 Private and secure</Text>
          <Text style={styles.featureItem}>🤝 Non-judgmental, always supportive</Text>
        </View>
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: hexWithAlpha(theme.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 24,
      fontFamily: theme.fontBold,
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      marginBottom: 32,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.primary,
      marginBottom: 8,
    },
    cardText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    featureList: {
      width: '100%',
      gap: 12,
    },
    featureItem: {
      fontSize: 15,
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
  });
