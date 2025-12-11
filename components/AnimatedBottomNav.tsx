import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

type IconComponentType = React.ComponentType<{ size?: number; color?: string }>;

export interface AnimatedNavItem {
  label: string;
  icon: IconComponentType;
  onPress?: () => void;
}

export interface AnimatedBottomNavProps {
  items: AnimatedNavItem[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  accentColor?: string;
}

/**
 * An animated bottom navigation bar with smooth icon and underline transitions.
 *
 * @remarks
 * Supports both controlled (via activeIndex prop) and uncontrolled modes.
 * Uses React Native Animated API for smooth icon lift and underline expansion effects.
 *
 * @param items - Array of navigation items with label, icon, and optional onPress handler
 * @param activeIndex - Controlled active tab index (optional)
 * @param onActiveIndexChange - Callback when active tab changes
 * @param accentColor - Override the theme's primary color for active state
 * @returns An animated bottom navigation bar component
 */
export default function AnimatedBottomNav({
  items,
  activeIndex: controlledActiveIndex,
  onActiveIndexChange,
  accentColor,
}: AnimatedBottomNavProps) {
  const { theme, isDark } = useTheme();
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [textWidths, setTextWidths] = useState<number[]>([]);

  const activeIndex =
    controlledActiveIndex !== undefined ? controlledActiveIndex : internalActiveIndex;
  const finalAccentColor = accentColor || theme.primary;

  const animatedValuesRef = useRef<
    {
      iconTranslateY: Animated.Value;
      lineWidth: Animated.Value;
    }[]
  >([]);

  if (animatedValuesRef.current.length !== items.length) {
    animatedValuesRef.current = items.map((_, index) => ({
      iconTranslateY: new Animated.Value(0),
      lineWidth: new Animated.Value(
        index === activeIndex && textWidths[index] ? textWidths[index] : 0
      ),
    }));
  }

  useEffect(() => {
    items.forEach((_, index) => {
      const isActive = index === activeIndex;
      const animValues = animatedValuesRef.current[index];

      if (!animValues) return;

      if (isActive) {
        Animated.sequence([
          Animated.timing(animValues.iconTranslateY, {
            toValue: -4.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animValues.iconTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(animValues.iconTranslateY, {
            toValue: -1.6,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(animValues.iconTranslateY, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        animValues.iconTranslateY.setValue(0);
      }

      Animated.timing(animValues.lineWidth, {
        toValue: isActive && textWidths[index] ? textWidths[index] : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex, textWidths, items]);

  const handleItemPress = (index: number) => {
    if (controlledActiveIndex === undefined) {
      setInternalActiveIndex(index);
    }
    onActiveIndexChange?.(index);
    items[index]?.onPress?.();
  };

  const handleTextLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTextWidths((prev) => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
  };

  const styles = useMemo(
    () => createStyles(theme, finalAccentColor, isDark),
    [theme, finalAccentColor, isDark]
  );

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const IconComponent = item.icon;
          const animValues = animatedValuesRef.current[index];

          return (
            <TouchableOpacity
              key={`${item.label}-${index}`}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleItemPress(index)}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    transform: [
                      {
                        translateY: animValues ? animValues.iconTranslateY : 0,
                      },
                    ],
                  },
                ]}
              >
                <IconComponent
                  size={24}
                  color={isActive ? finalAccentColor : styles.inactiveColor.color}
                />
              </Animated.View>

              <View style={styles.textWrapper}>
                <Text
                  style={[
                    styles.menuText,
                    isActive
                      ? { color: finalAccentColor, fontFamily: theme.fontBold }
                      : styles.inactiveColor,
                  ]}
                  onLayout={handleTextLayout(index)}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>

                <Animated.View
                  style={[
                    styles.underline,
                    {
                      backgroundColor: finalAccentColor,
                      width: animValues ? animValues.lineWidth : 0,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors, accentColor: string, isDark: boolean) => {
  const inactiveColor = isDark ? theme.textSecondary : theme.textTertiary;
  const backgroundColor = theme.card || theme.surface;

  return StyleSheet.create({
    container: {
      backgroundColor: backgroundColor,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingBottom: Platform.OS === 'ios' ? 20 : 8,
      shadowColor: theme.border,
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 4,
    },
    menu: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    menuItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 12,
      minHeight: 60,
    },
    menuItemActive: {
      backgroundColor: theme.primaryLight || 'rgba(0, 0, 0, 0.05)',
    },
    iconWrapper: {
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 20,
    },
    menuText: {
      fontSize: 11,
      fontFamily: theme.fontSemiBold,
      textAlign: 'center',
      textTransform: 'lowercase',
      letterSpacing: 0.3,
    },
    inactiveColor: {
      color: inactiveColor,
    },
    underline: {
      height: 2,
      borderRadius: 1,
      marginTop: 4,
    },
  });
};
