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
 * Render a horizontal top navigation bar for web with icons and labels.
 *
 * Highlights the active item based on the current pathname (an item with route '/'
 * is active only when pathname is exactly '/', otherwise an item is active when
 * the pathname starts with its route). Tapping an item navigates to its route;
 * each item exposes accessibilityRole="tab" and accessibilityState.selected when active.
 *
 * @param items - Array of navigation items; each item provides a `route`, `label`, and `icon` component
 * @returns A React element representing the top navigation bar
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
              accessibilityLabel={item.label}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
