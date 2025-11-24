import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SegmentedControlProps {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

/**
 * A segmented control component that displays multiple options as buttons
 * and allows the user to select one active segment.
 *
 * @param segments - Array of string labels to display as segment options
 * @param activeIndex - The index of the currently selected segment
 * @param onChange - Callback function invoked when a segment is pressed, receives the selected index
 * @returns JSX.Element representing the segmented control UI
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   segments={['My Tasks', 'Assign Tasks']}
 *   activeIndex={activeTab}
 *   onChange={setActiveTab}
 * />
 * ```
 */
export default function SegmentedControl({
  segments,
  activeIndex,
  onChange,
}: SegmentedControlProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => {
        const isActive = index === activeIndex;
        return (
          <TouchableOpacity
            key={segment}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {segment}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 4,
      marginHorizontal: 16,
      marginVertical: 12,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    segmentTextActive: {
      color: theme.textOnPrimary ?? '#ffffff',
    },
  });
