// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// =============================================================================
// Component
// =============================================================================

interface LogoProps {
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Logo component for Sobriety Waypoint.
 *
 * Abstract compass/waypoint design rendered as SVG.
 * Matches the web Logo component from landing-page-refresh.
 *
 * @param size - Size of the logo (default: 40)
 * @param color - Color of the logo (default: current theme primary)
 * @param style - Additional styles to apply
 */
export default function Logo({ size = 40, color = '#007AFF', style }: LogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        {/* Outer circle */}
        <Circle cx="20" cy="20" r="18" stroke={color} strokeWidth="2" fill="none" />
        {/* Inner circle */}
        <Circle cx="20" cy="20" r="12" stroke={color} strokeWidth="1.5" fill="none" opacity={0.4} />
        {/* Compass points */}
        <Path
          d="M20 8 L20 14 M20 26 L20 32 M8 20 L14 20 M26 20 L32 20"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <Circle cx="20" cy="20" r="4" fill={color} />
      </Svg>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
