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
 * Render a platform-adaptive tab bar icon.
 *
 * On iOS, renders a SymbolView for the given SF Symbol name and uses a
 * 'semibold' weight when `focused` is true; on other platforms, renders the
 * provided fallback icon component.
 *
 * @param sfSymbol - SF Symbol name used on iOS
 * @param fallbackIcon - Icon component to render on non-iOS platforms
 * @param focused - Whether the tab is focused; affects symbol weight on iOS
 * @param color - Icon color
 * @param size - Icon size in pixels (default: 24)
 * @returns The platform-appropriate icon React element
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
