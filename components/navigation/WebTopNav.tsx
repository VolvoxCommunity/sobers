import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

interface NavItem {
  route: string;
  label: string;
  icon: IconComponent;
}

interface WebTopNavProps {
  items: NavItem[];
}

/**
 * Top navigation bar for web platform.
 *
 * Displays horizontal navigation items at the top of the screen,
 * following web UX conventions instead of mobile bottom tabs.
 *
 * @param items - Array of navigation items with route, label, and icon
 * @returns Horizontal navigation bar component
 */
export default function WebTopNav({ items }: WebTopNavProps): React.ReactElement {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const styles = createStyles(theme);

  const isActive = (route: string): boolean => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  };

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        {items.map((item) => {
          const active = isActive(item.route);
          const IconComponent = item.icon;

          return (
            <Pressable
              key={item.route}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.route as never)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <IconComponent size={20} color={active ? theme.primary : theme.textSecondary} />
              <Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                  { color: active ? theme.primary : theme.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      maxWidth: 800,
      marginHorizontal: 'auto',
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    navItemActive: {
      backgroundColor: theme.primaryLight,
    },
    navLabel: {
      fontSize: 14,
      fontFamily: theme.fontMedium,
    },
    navLabelActive: {
      fontFamily: theme.fontSemiBold,
    },
  });
