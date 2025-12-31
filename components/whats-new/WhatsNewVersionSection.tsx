/**
 * @fileoverview WhatsNewVersionSection component
 *
 * A collapsible section displaying a single release version with its features.
 * Shows version badge, title, metadata row with counts, and optionally a NEW badge.
 */

// =============================================================================
// Imports
// =============================================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import WhatsNewFeatureCard from './WhatsNewFeatureCard';
import type { WhatsNewRelease } from '@/lib/whats-new';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the WhatsNewVersionSection component.
 */
interface WhatsNewVersionSectionProps {
  /** The release data to display */
  release: WhatsNewRelease;
  /** Whether this is a new (unseen) version */
  isNew: boolean;
  /** Whether the section starts expanded */
  defaultExpanded: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Formats a date string to "Mon YYYY" format.
 *
 * @param dateString - ISO date string to format
 * @returns Formatted date string (e.g., "Dec 2024")
 */
function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Collapsible section displaying a release version and its features.
 *
 * @param props - Component props
 * @returns The version section component
 *
 * @example
 * ```tsx
 * <WhatsNewVersionSection
 *   release={release}
 *   isNew={true}
 *   defaultExpanded={true}
 * />
 * ```
 */
export default function WhatsNewVersionSection({
  release,
  isNew,
  defaultExpanded,
}: WhatsNewVersionSectionProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const styles = useMemo(() => createStyles(theme, isNew), [theme, isNew]);

  // Sort features: 'feature' type first, then 'fix' type, then by displayOrder
  const sortedFeatures = useMemo(() => {
    return [...release.features].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'feature' ? -1 : 1;
      }
      return a.displayOrder - b.displayOrder;
    });
  }, [release.features]);

  // Count features and fixes
  const featureCount = useMemo(
    () => release.features.filter((f) => f.type === 'feature').length,
    [release.features]
  );
  const fixCount = useMemo(
    () => release.features.filter((f) => f.type === 'fix').length,
    [release.features]
  );

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        testID="version-section-header"
        style={styles.header}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={`${release.title} version ${release.version}. ${featureCount} features, ${fixCount} fixes. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'show'} details.`}
        accessibilityState={{ expanded: isExpanded }}
      >
        {/* Top row: Version badge, NEW badge, chevron */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>{release.version}</Text>
            </View>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={theme.textSecondary}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{release.title}</Text>

        {/* Metadata row */}
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.metadataText}>{formatReleaseDate(release.createdAt)}</Text>
          </View>
          {featureCount > 0 && (
            <View style={styles.metadataItem}>
              <Ionicons name="sparkles" size={14} color={theme.textSecondary} />
              <Text style={styles.metadataText}>
                {featureCount} {featureCount === 1 ? 'feature' : 'features'}
              </Text>
            </View>
          )}
          {fixCount > 0 && (
            <View style={styles.metadataItem}>
              <Ionicons name="construct-outline" size={14} color={theme.textSecondary} />
              <Text style={styles.metadataText}>
                {fixCount} {fixCount === 1 ? 'fix' : 'fixes'}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {sortedFeatures.map((feature) => (
            <WhatsNewFeatureCard key={feature.id} feature={feature} />
          ))}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: ThemeColors, isNew: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 12,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: isNew ? 4 : 1,
      borderLeftColor: isNew ? theme.primary : theme.border,
      overflow: 'hidden',
    },
    header: {
      padding: 16,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    versionBadge: {
      backgroundColor: isNew ? theme.primary : theme.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    versionText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: isNew ? '#ffffff' : theme.text,
    },
    newBadge: {
      backgroundColor: theme.success,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    newBadgeText: {
      fontSize: 10,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    metadataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    metadataItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metadataText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '400',
      color: theme.textSecondary,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 12,
    },
  });
