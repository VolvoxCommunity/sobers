// =============================================================================
// Imports
// =============================================================================
import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Home, Compass, TrendingUp, CheckSquare, User, Bot } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { AndroidSymbol } from 'expo-symbols';
import WebTopNav from '@/components/navigation/WebTopNav';

// =============================================================================
// Types & Interfaces
// =============================================================================

/** Tab route configuration with SF Symbols (iOS) and Material Icons (Android) */
interface TabRoute {
  name: string;
  title: string;
  sfSymbol: SFSymbol;
  mdIcon: AndroidSymbol;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

// =============================================================================
// Constants
// =============================================================================

/** Tab route configuration with SF Symbols (iOS) and Material Icons (Android) */
const TAB_ROUTES: TabRoute[] = [
  {
    name: 'index',
    title: 'Home',
    sfSymbol: 'house.fill',
    mdIcon: 'home',
    icon: Home,
  },
  {
    name: 'buddy',
    title: 'Buddy',
    sfSymbol: 'bubble.left.and.text.bubble.right.fill',
    mdIcon: 'smart_toy',
    icon: Bot,
  },
  {
    name: 'program',
    title: 'Program',
    sfSymbol: 'safari.fill',
    mdIcon: 'explore',
    icon: Compass,
  },
  {
    name: 'journey',
    title: 'Journey',
    sfSymbol: 'chart.line.uptrend.xyaxis',
    mdIcon: 'trending_up',
    icon: TrendingUp,
  },
  {
    name: 'tasks',
    title: 'Tasks',
    sfSymbol: 'checklist',
    mdIcon: 'checklist',
    icon: CheckSquare,
  },
  {
    name: 'profile',
    title: 'Profile',
    sfSymbol: 'person.fill',
    mdIcon: 'person',
    icon: User,
  },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Render the app's tabbed navigation using a platform-appropriate navigator.
 *
 * Uses expo-router's NativeTabs for native platforms (UITabBarController on iOS,
 * BottomNavigationView on Android) and WebTopNav + Tabs for web.
 */
export default function TabLayout(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();

  // Determine if Program tab should be visible
  // Show Program tab unless explicitly set to false (treats null/undefined as true for backwards compatibility)
  const shouldShowProgram = profile?.show_program_content !== false;

  // Determine if Buddy tab should be visible
  // Show Buddy tab unless explicitly set to false (treats null/undefined as true for new users)
  const shouldShowBuddy = profile?.ai_buddy_enabled !== false;

  // Filter tab routes for web navigation items only
  const visibleTabRoutes = useMemo(() => {
    return TAB_ROUTES.filter((route) => {
      if (route.name === 'program' && !shouldShowProgram) return false;
      if (route.name === 'buddy' && !shouldShowBuddy) return false;
      return true;
    });
  }, [shouldShowProgram, shouldShowBuddy]);

  // Web: Use top navigation instead of bottom tabs
  if (Platform.OS === 'web') {
    const webNavItems = visibleTabRoutes.map((route) => ({
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
          {visibleTabRoutes.map((route) => (
            <Tabs.Screen key={route.name} name={route.name} />
          ))}
          {/* Hidden route - accessible via navigation but not shown in nav */}
          <Tabs.Screen name="manage-tasks" options={{ href: null }} />
        </Tabs>
      </>
    );
  }

  // Mobile: expo-router NativeTabs with platform-native tab bars
  // - iOS: UITabBarController with SF Symbols, native blur, and Liquid Glass
  // - Android: BottomNavigationView with Material Design 3 and Material Icons
  //
  // IMPORTANT: Native tab bars don't support dynamic children well.
  // All tabs must be rendered at mount time, using `hidden` prop on Trigger
  // to control visibility instead of conditional rendering.
  return (
    <NativeTabs
      tintColor={theme.primary}
      iconColor={{ default: theme.textSecondary, selected: theme.primary }}
      backgroundColor={isDark ? theme.surface : theme.card}
    >
      {TAB_ROUTES.map((route) => (
        <NativeTabs.Trigger
          key={route.name}
          name={route.name}
          hidden={
            (route.name === 'program' && !shouldShowProgram) ||
            (route.name === 'buddy' && !shouldShowBuddy)
          }
        >
          <NativeTabs.Trigger.Label>{route.title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={route.sfSymbol} md={route.mdIcon} />
        </NativeTabs.Trigger>
      ))}
      {/* Hidden route - accessible via navigation but not shown in tab bar */}
      <NativeTabs.Trigger name="manage-tasks" hidden>
        <NativeTabs.Trigger.Label>Manage Tasks</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
