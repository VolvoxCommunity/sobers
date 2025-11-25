import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

interface OnboardingStepProps {
  children: React.ReactNode;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({ children }) => {
  return (
    <Animated.View
      entering={FadeInRight.duration(500)}
      exiting={FadeOutLeft.duration(500)}
      style={styles.container}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    paddingHorizontal: 24,
  },
});

export default OnboardingStep;
