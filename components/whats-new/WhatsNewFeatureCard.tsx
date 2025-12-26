/**
 * @fileoverview WhatsNewFeatureCard component
 *
 * Displays a single feature card within the What's New popup.
 * Shows an optional image, title, and description for each feature.
 */

// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { WhatsNewFeature, WhatsNewFeatureType } from '@/lib/whats-new';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the WhatsNewFeatureCard component.
 */
interface WhatsNewFeatureCardProps {
  /** The feature data to display */
  feature: WhatsNewFeature;
}

// =============================================================================
// Constants
// =============================================================================

const IMAGE_HEIGHT = 180;
const SKELETON_BACKGROUND = 'rgba(128, 128, 128, 0.1)';

/** Configuration for each feature type's appearance */
const TYPE_CONFIG: Record<
  WhatsNewFeatureType,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
    borderColor: string;
  }
> = {
  feature: {
    label: 'NEW',
    icon: 'sparkles',
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#059669',
  },
  fix: {
    label: 'FIX',
    icon: 'construct',
    color: '#7c3aed',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: '#7c3aed',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Displays a feature card with optional image, title, and description.
 *
 * @param props - Component props containing the feature data
 * @returns The feature card component
 *
 * @example
 * ```tsx
 * <WhatsNewFeatureCard
 *   feature={{
 *     id: '1',
 *     title: 'New Dashboard',
 *     description: 'Track your progress with our new dashboard',
 *     imageUrl: 'https://example.com/image.png',
 *     displayOrder: 0,
 *     type: 'feature',
 *   }}
 * />
 * ```
 */
export default function WhatsNewFeatureCard({ feature }: WhatsNewFeatureCardProps) {
  const { theme } = useTheme();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const typeConfig = TYPE_CONFIG[feature.type];

  return (
    <View style={[styles.container, { borderLeftColor: typeConfig.borderColor }]}>
      {feature.imageUrl && (
        <View testID="feature-card-image-container" style={styles.imageContainer}>
          {isImageLoading && (
            <View style={styles.skeleton}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          )}
          <Image
            source={{ uri: feature.imageUrl }}
            style={[styles.image, isImageLoading && styles.imageHidden]}
            contentFit="cover"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View
            testID="feature-type-badge"
            style={[styles.badge, { backgroundColor: typeConfig.backgroundColor }]}
          >
            <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
            <Text style={[styles.badgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
        </View>
        <Text style={styles.title}>{feature.title}</Text>
        <Text style={styles.description}>{feature.description}</Text>
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
      backgroundColor: theme.card,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
    },
    imageContainer: {
      height: IMAGE_HEIGHT,
      backgroundColor: SKELETON_BACKGROUND,
    },
    skeleton: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: SKELETON_BACKGROUND,
    },
    image: {
      width: '100%',
      height: IMAGE_HEIGHT,
    },
    imageHidden: {
      opacity: 0,
    },
    content: {
      padding: 16,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });
