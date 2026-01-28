// =============================================================================
// Imports
// =============================================================================
import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Compass, TrendingUp, CheckSquare, User } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SFSymbol } from 'sf-symbols-typescript';
import WebTopNav from '@/components/navigation/WebTopNav';
// Platform-specific import: .native.tsx on mobile, .web.tsx (stub) on web
// This prevents bundler from including native-only code on web
import { NativeTabs } from '@/components/navigation/NativeBottomTabs';

// Android icons using local Lucide SVG files
// Loaded via require() which Metro bundles as native image assets
const androidIcons = {
  home: require('@/assets/icons/home.svg'),
  compass: require('@/assets/icons/compass.svg'),
  trending: require('@/assets/icons/trending-up.svg'),
  tasks: require('@/assets/icons/check-square.svg'),
  profile: require('@/assets/icons/user.svg'),
};

// =============================================================================
// Types & Interfaces
// =============================================================================

/** Tab route configuration with SF Symbols (iOS) and Material Icons (Android) */
interface TabRoute {
  name: string;
  title: string;
  sfSymbol: SFSymbol;
  androidIconKey: keyof typeof androidIcons;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

// =============================================================================
// Constants
// =============================================================================

/** Tab route configuration with SF Symbols (iOS) and Material Icons (Android) */
const tabRoutes: TabRoute[] = [
  {
    name: 'index',
    title: 'Home',
    sfSymbol: 'house.fill',
    androidIconKey: 'home',
    icon: Home,
  },
  {
    name: 'program',
    title: 'Program',
    sfSymbol: 'safari.fill',
    androidIconKey: 'compass',
    icon: Compass,
  },
  {
    name: 'journey',
    title: 'Journey',
    sfSymbol: 'chart.line.uptrend.xyaxis',
    androidIconKey: 'trending',
    icon: TrendingUp,
  },
  {
    name: 'tasks',
    title: 'Tasks',
    sfSymbol: 'checklist',
    androidIconKey: 'tasks',
    icon: CheckSquare,
  },
  {
    name: 'profile',
    title: 'Profile',
    sfSymbol: 'person.fill',
    androidIconKey: 'profile',
    icon: User,
  },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Render the app's tabbed navigation using a platform-appropriate navigator.
 *
 * @returns A React element containing the tab navigator configured for the current platform (native bottom tabs on mobile, top navigation on web).
 */
export default function TabLayout(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();

  // Determine if Program tab should be visible
  // Show Program tab unless explicitly set to false (treats null/undefined as true for backwards compatibility)
  const shouldShowProgram = profile?.show_program_content !== false;

  // Filter tab routes for web navigation items only
  // Native tabs use tabBarItemHidden instead of conditional rendering
  const visibleTabRoutes = useMemo(() => {
    return shouldShowProgram ? tabRoutes : tabRoutes.filter((route) => route.name !== 'program');
  }, [shouldShowProgram]);

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

  // Mobile: Native bottom tabs with platform-specific styling
  // Uses react-native-bottom-tabs for truly native tab bars:
  // - iOS: UITabBarController with SF Symbols and native blur
  // - Android: BottomNavigationView with Material Design
  //
  // IMPORTANT: Native tab bars don't support dynamic children well.
  // All screens must be rendered at mount time, using tabBarItemHidden to
  // control visibility instead of conditional rendering.
  return (
    <NativeTabs
      labeled={true}
      tabBarActiveTintColor={theme.primary}
      tabBarInactiveTintColor={theme.textSecondary}
      tabBarStyle={{
        backgroundColor: isDark ? theme.surface : theme.card,
      }}
    >
      {tabRoutes.map((route) => (
        <NativeTabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            // iOS uses SF Symbols, Android uses Material Icons via URI
            tabBarIcon: () =>
              Platform.OS === 'ios'
                ? { sfSymbol: route.sfSymbol }
                : androidIcons[route.androidIconKey],
            // Hide Program tab when user has disabled 12-step content
            tabBarItemHidden: route.name === 'program' && !shouldShowProgram,
          }}
        />
      ))}
      {/* Hidden route - accessible via navigation but not shown in tab bar */}
      <NativeTabs.Screen
        name="manage-tasks"
        options={{
          title: 'Manage Tasks',
          tabBarItemHidden: true,
        }}
      />
    </NativeTabs>
  );
}
