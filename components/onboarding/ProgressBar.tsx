// =============================================================================
// Imports
// =============================================================================
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ThemeColors } from '@/contexts/ThemeContext';

// =============================================================================
// Types & Interfaces
// =============================================================================
interface ProgressBarProps {
  step: number;
  totalSteps: number;
  theme: ThemeColors;
}

// =============================================================================
// Component
// =============================================================================
/**
 * Animated progress bar component for multi-step flows.
 *
 * Displays a horizontal progress bar that animates smoothly as the user
 * advances through steps. Uses react-native-reanimated for performant
 * animations on both iOS and Android.
 *
 * @param props - Component props
 * @param props.step - Current step number (1-indexed)
 * @param props.totalSteps - Total number of steps in the flow
 * @param props.theme - Theme colors from ThemeContext
 * @returns Animated progress bar view
 *
 * @example
 * ```tsx
 * <ProgressBar step={2} totalSteps={3} theme={theme} />
 * ```
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ step, totalSteps, theme }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / totalSteps, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [step, totalSteps, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    // Use flex to animate width as a ratio of the container
    // This is more reliable than string interpolation in worklets
    return {
      flex: interpolate(progress.value, [0, 1], [0, 1]),
    };
  });

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: 6,
          backgroundColor: theme.border,
          borderRadius: 3,
          overflow: 'hidden',
          marginHorizontal: 24,
          marginTop: 12,
          marginBottom: 24,
          flexDirection: 'row',
        },
        bar: {
          height: '100%',
          backgroundColor: theme.primary,
          borderRadius: 3,
        },
      }),
    [theme]
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, animatedStyle]} />
    </View>
  );
};

export default ProgressBar;
