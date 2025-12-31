/**
 * @fileoverview WhatsNewVersionSection component
 *
 * A collapsible section displaying a single release version with its features.
 * Shows version number, title, date, and optionally a NEW badge.
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
        accessibilityLabel={`${release.title} version ${release.version}. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'show'} features.`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          <Text style={styles.headerText}>
            v{release.version} · {release.title} · {formatReleaseDate(release.createdAt)}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={20}
          color={theme.textSecondary}
        />
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
      backgroundColor: isNew ? `${theme.primary}08` : theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: isNew ? 4 : 1,
      borderLeftColor: isNew ? theme.primary : theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    newBadge: {
      backgroundColor: theme.primary,
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
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });
