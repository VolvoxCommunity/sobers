import React, { memo, useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { Prayer } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface PrayerCardProps {
  prayer: Prayer;
  isFavorite: boolean;
  onToggleFavorite: (prayerId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Displays a prayer with title, content preview, and favorite toggle.
 * Content is expandable to show the full prayer text.
 */
function PrayerCard({ prayer, isFavorite, onToggleFavorite }: PrayerCardProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categoryLabel = useMemo(() => {
    if (prayer.category === 'step' && prayer.step_number) {
      return `Step ${prayer.step_number}`;
    }
    return prayer.category.charAt(0).toUpperCase() + prayer.category.slice(1);
  }, [prayer.category, prayer.step_number]);

  const handleFavoritePress = () => {
    onToggleFavorite(prayer.id);
  };

  const handleExpandPress = () => {
    setExpanded(!expanded);
  };

  return (
    <View style={styles.card} testID={`prayer-card-${prayer.id}`}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{categoryLabel}</Text>
          </View>
          <Pressable
            testID={`prayer-favorite-${prayer.id}`}
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
            hitSlop={8}
          >
            <Heart
              size={22}
              color={isFavorite ? theme.danger : theme.textTertiary}
              fill={isFavorite ? theme.danger : 'transparent'}
            />
          </Pressable>
        </View>
        <Text style={styles.title}>{prayer.title}</Text>
      </View>

      <Pressable onPress={handleExpandPress} testID={`prayer-expand-${prayer.id}`}>
        <Text style={styles.content} numberOfLines={expanded ? undefined : 3}>
          {prayer.content}
        </Text>
        <View style={styles.expandRow}>
          <Text style={styles.expandText}>{expanded ? 'Show less' : 'Read more'}</Text>
          {expanded ? (
            <ChevronUp size={16} color={theme.primary} />
          ) : (
            <ChevronDown size={16} color={theme.primary} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    header: {
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    badge: {
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: theme.fontMedium,
      color: theme.primary,
    },
    favoriteButton: {
      padding: 4,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
    },
    content: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    expandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      gap: 4,
    },
    expandText: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
      color: theme.primary,
    },
  });

export default memo(PrayerCard);
