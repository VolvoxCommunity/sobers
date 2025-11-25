import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AnimatedBottomNav, { AnimatedNavItem } from './AnimatedBottomNav';
import { Home, Briefcase, Calendar, Shield, Settings } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';

export default function AnimatedBottomNavExample() {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);

  const exampleItems: AnimatedNavItem[] = [
    {
      label: 'Home',
      icon: Home,
      onPress: () => console.log('Home pressed'),
    },
    {
      label: 'Strategy',
      icon: Briefcase,
      onPress: () => console.log('Strategy pressed'),
    },
    {
      label: 'Period',
      icon: Calendar,
      onPress: () => console.log('Period pressed'),
    },
    {
      label: 'Security',
      icon: Shield,
      onPress: () => console.log('Security pressed'),
    },
    {
      label: 'Settings',
      icon: Settings,
      onPress: () => console.log('Settings pressed'),
    },
  ];

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Animated Bottom Navigation Demo</Text>
        <Text style={styles.subtitle}>Active Tab: {exampleItems[activeIndex].label}</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Features:</Text>
          <Text style={styles.infoText}>• Smooth icon bounce animation</Text>
          <Text style={styles.infoText}>• Animated underline that matches text width</Text>
          <Text style={styles.infoText}>• Color changes on active/inactive states</Text>
          <Text style={styles.infoText}>• Supports 2-5 navigation items</Text>
          <Text style={styles.infoText}>• Works on iOS, Android, and Web</Text>
          <Text style={styles.infoText}>• Uses lucide-react-native icons</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Usage:</Text>
          <Text style={styles.codeText}>
            {`import AnimatedBottomNav from '@/components/AnimatedBottomNav';
import { Home, Settings } from 'lucide-react-native';

const items = [
  { label: 'Home', icon: Home, onPress: () => {} },
  { label: 'Settings', icon: Settings, onPress: () => {} },
];

<AnimatedBottomNav
  items={items}
  activeIndex={0}
  onActiveIndexChange={(index) => {}}
  accentColor="#007AFF"
/>`}
          </Text>
        </View>
      </ScrollView>

      <AnimatedBottomNav
        items={exampleItems}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        accentColor={theme.primary}
      />
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 24,
    },
    infoBox: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    codeText: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: theme.textSecondary,
      backgroundColor: theme.background,
      padding: 12,
      borderRadius: 8,
      lineHeight: 18,
    },
  });
