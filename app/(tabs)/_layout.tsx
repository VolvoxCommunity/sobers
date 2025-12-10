// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, BookOpen, TrendingUp, CheckSquare, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import TabBarIcon from '@/components/navigation/TabBarIcon';
import WebTopNav from '@/components/navigation/WebTopNav';

// =============================================================================
// Types & Interfaces
// =============================================================================

/** Tab route configuration with SF Symbols and Lucide fallbacks */
interface TabRoute {
  name: string;
  title: string;
  sfSymbol: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

// =============================================================================
// Constants
// =============================================================================

/** Tab route configuration with SF Symbols and Lucide fallbacks */
const tabRoutes: TabRoute[] = [
  {
    name: 'index',
    title: 'Home',
    sfSymbol: 'house.fill',
    icon: Home,
  },
  {
    name: 'steps',
    title: 'Steps',
    sfSymbol: 'book.fill',
    icon: BookOpen,
  },
  {
    name: 'journey',
    title: 'Journey',
    sfSymbol: 'chart.line.uptrend.xyaxis',
    icon: TrendingUp,
  },
  {
    name: 'tasks',
    title: 'Tasks',
    sfSymbol: 'checklist',
    icon: CheckSquare,
  },
  {
    name: 'profile',
    title: 'Profile',
    sfSymbol: 'person.fill',
    icon: User,
  },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Tab layout with platform-specific navigation.
 *
 * - iOS: Native tabs with SF Symbols and platform-appropriate styling
 * - Android: Native tabs with Lucide icons and Material elevation
 * - Web: Top navigation bar (bottom tabs hidden)
 *
 * @returns Tab navigator appropriate for current platform
 */
export default function TabLayout(): React.ReactElement {
  const { theme } = useTheme();

  // Web: Use top navigation instead of bottom tabs
  if (Platform.OS === 'web') {
    const webNavItems = tabRoutes.map((route) => ({
      route: route.name === 'index' ? '/' : `/${route.name}`,
      label: route.title,
      icon: route.icon,
    }));

    return (
      <>
        <WebTopNav items={webNavItems} />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          {tabRoutes.map((route) => (
            <Tabs.Screen key={route.name} name={route.name} />
          ))}
        </Tabs>
      </>
    );
  }

  // Mobile: Native tabs with platform-specific styling
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: Platform.OS === 'ios',
        headerTitleStyle: {
          fontFamily: 'JetBrainsMono-SemiBold',
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
          },
          android: {
            backgroundColor: theme.surface,
            elevation: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
          },
        }),
      }}
    >
      {tabRoutes.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon
                sfSymbol={route.sfSymbol as any}
                fallbackIcon={route.icon}
                focused={focused}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
