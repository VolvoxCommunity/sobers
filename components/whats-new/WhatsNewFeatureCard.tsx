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
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import type { WhatsNewFeature } from '@/lib/whats-new';

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
 *   }}
 * />
 * ```
 */
export default function WhatsNewFeatureCard({ feature }: WhatsNewFeatureCardProps) {
  const { theme } = useTheme();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
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
