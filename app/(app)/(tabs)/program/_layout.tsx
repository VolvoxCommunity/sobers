// =============================================================================
// Imports
// =============================================================================
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Sun, Heart, Users } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import SettingsButton from '@/components/navigation/SettingsButton';

// =============================================================================
// Types
// =============================================================================
interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

// =============================================================================
// Constants
// =============================================================================
const TAB_ITEMS: TabItem[] = [
  { name: 'steps', label: 'Steps', icon: BookOpen },
  { name: 'daily', label: 'Daily', icon: Sun },
  { name: 'prayers', label: 'Prayers', icon: Heart },
  // { name: 'literature', label: 'Lit', icon: BookMarked }, // Hidden for now
  { name: 'meetings', label: 'Meet', icon: Users },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Layout for the Program section with horizontal top tabs.
 */
export default function ProgramLayout(): React.ReactElement {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from pathname
  // Guard against null pathname (can occur on first render before router is ready)
  const activeTab = useMemo(() => {
    if (!pathname) return 'steps';
    const path = pathname.replace('/program/', '').split('/')[0];
    return TAB_ITEMS.find((t) => t.name === path)?.name || 'steps';
  }, [pathname]);

  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const handleTabPress = (tabName: string) => {
    router.push(`/program/${tabName}`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Program</Text>
          {Platform.OS !== 'web' && <SettingsButton />}
        </View>

        {/* Top Tab Bar */}
        <View style={styles.tabBar} testID="program-tab-bar" accessibilityRole="tablist">
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.name;
            const Icon = tab.icon;
            return (
              <Pressable
                key={tab.name}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabPress(tab.name)}
                testID={`program-tab-${tab.name}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${tab.label} tab`}
              >
                <Icon size={18} color={isActive ? theme.primary : theme.textSecondary} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="steps" />
        <Tabs.Screen name="daily" />
        <Tabs.Screen name="prayers" />
        <Tabs.Screen name="literature" />
        <Tabs.Screen name="meetings" />
      </Tabs>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const createStyles = (theme: ThemeColors, insets: { top: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.card,
      paddingTop: insets.top,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
    },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
      gap: 4,
    },
    tabActive: {
      backgroundColor: theme.primaryLight,
    },
    tabLabel: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      color: theme.primary,
      fontWeight: '600',
    },
  });
