import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemeColors } from '@/contexts/ThemeContext';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
  theme: ThemeColors;
}

/**
 * Animated progress bar component for multi-step flows.
 * @param props - Component props
 * @param props.step - Current step number (1-indexed)
 * @param props.totalSteps - Total number of steps
 * @param props.theme - Theme colors from ThemeContext
 * @returns Animated progress bar view
 * @example
 * <ProgressBar step={1} totalSteps={3} theme={theme} />
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
    return {
      width: `${progress.value * 100}%`,
    };
  });

  const styles = StyleSheet.create({
    container: {
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
      marginHorizontal: 24,
      marginTop: 12,
      marginBottom: 24,
    },
    bar: {
      height: '100%',
      backgroundColor: '#007AFF',
      borderRadius: 3,
    },
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, animatedStyle]} />
    </View>
  );
};

export default ProgressBar;
