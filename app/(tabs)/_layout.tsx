// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, BookOpen, TrendingUp, CheckSquare, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import TabBarIcon from '@/components/navigation/TabBarIcon';
import TabBarBackground from '@/components/navigation/TabBarBackground';
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
 * - iOS: Native tabs with SF Symbols, Liquid Glass blur headers, and large titles
 * - Android: Native tabs with Lucide icons and Material elevation
 * - Web: Top navigation bar (bottom tabs hidden)
 *
 * @returns Tab navigator appropriate for current platform
 */
export default function TabLayout(): React.ReactElement {
  const { theme, isDark } = useTheme();

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
          {/* Hidden route - accessible via navigation but not shown in nav */}
          <Tabs.Screen name="manage-tasks" options={{ href: null }} />
        </Tabs>
      </>
    );
  }

  // Mobile: Native tabs with platform-specific styling
  // Note: iOS Large Titles and blur effects require native-stack navigator.
  // The tab bar itself gets the Liquid Glass treatment via transparent background.
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Header styling
        headerTitleStyle: {
          fontFamily: 'JetBrainsMono-SemiBold',
        },
        headerStyle: Platform.select({
          ios: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
          },
          android: {
            backgroundColor: theme.surface,
            elevation: 4,
          },
        }),
        headerShadowVisible: Platform.OS !== 'ios', // Hide shadow on iOS for cleaner look
        headerTintColor: theme.text,
        // Tab bar styling - Liquid Glass effect on iOS
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: Platform.select({
          ios: {
            // Transparent background to show blur effect underneath
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
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
      {/* Hidden route - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="manage-tasks"
        options={{
          title: 'Manage Tasks',
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
