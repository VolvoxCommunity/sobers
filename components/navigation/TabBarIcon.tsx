import React from 'react';
import { Platform } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

interface TabBarIconProps {
  /** SF Symbol name for iOS (e.g., 'house.fill') */
  sfSymbol: SymbolViewProps['name'];
  /** Lucide icon component for Android/Web fallback */
  fallbackIcon: IconComponent;
  /** Whether the tab is currently focused */
  focused: boolean;
  /** Icon color */
  color: string;
  /** Icon size (default: 24) */
  size?: number;
}

/**
 * Platform-adaptive tab bar icon component.
 *
 * Uses SF Symbols on iOS for native integration with Liquid Glass,
 * and Lucide icons on Android/Web for consistency.
 *
 * @param sfSymbol - SF Symbol name for iOS
 * @param fallbackIcon - Lucide icon component for non-iOS platforms
 * @param focused - Whether the tab is focused
 * @param color - Icon color
 * @param size - Icon size (default: 24)
 * @returns Platform-appropriate icon component
 */
export default function TabBarIcon({
  sfSymbol,
  fallbackIcon: FallbackIcon,
  focused,
  color,
  size = 24,
}: TabBarIconProps): React.ReactElement {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={sfSymbol}
        size={size}
        tintColor={color}
        weight={focused ? 'semibold' : 'regular'}
        style={{ width: size, height: size }}
      />
    );
  }

  return <FallbackIcon size={size} color={color} />;
}
