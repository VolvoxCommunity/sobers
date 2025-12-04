// =============================================================================
// Imports
// =============================================================================
import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import AppDemoSection from './AppDemoSection';
import HowItWorksSection from './HowItWorksSection';
import TestimonialsSection from './TestimonialsSection';
import FreeForeverSection from './FreeForeverSection';
import Footer from './Footer';

// =============================================================================
// Component
// =============================================================================

/**
 * Main landing page component that serves as the marketing page for web visitors.
 *
 * Displays hero section, features, how it works, testimonials, and footer sections
 * in a scrollable layout. Only renders on web platform. Implements responsive design
 * with smooth animations and calming aesthetic suitable for recovery-focused app.
 *
 * @returns The complete landing page layout with all marketing sections
 */
export default function LandingPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Ensure we're on web platform (additional safety check)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/login');
    }
  }, [router]);

  const styles = createStyles(theme, width);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <HeroSection />
        </View>

        <View style={styles.section}>
          <FeaturesSection />
        </View>

        <View style={styles.section}>
          <AppDemoSection />
        </View>

        <View style={styles.section}>
          <HowItWorksSection />
        </View>

        <View style={styles.section}>
          <TestimonialsSection />
        </View>

        <View style={styles.section}>
          <FreeForeverSection />
        </View>

        <View style={styles.section}>
          <Footer />
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: any, width: number) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    section: {
      width: '100%',
    },
  });
};
