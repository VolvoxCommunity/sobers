// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

// =============================================================================
// Types
// =============================================================================

interface Demo {
  image: any;
  title: string;
  description: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * App Demo section component showcasing app screenshots.
 *
 * Displays three demo images with titles and descriptions in a responsive grid layout.
 * Features animated entrance effects and hover interactions (web only).
 * Matches the web AppDemo component from landing-page-refresh.
 *
 * @returns The app demo section with animated demo cards
 */
export default function AppDemoSection() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  // Note: In a real app, you would import actual images
  // For now, using placeholder approach - you'll need to add actual images
  const demos: Demo[] = [
    {
      image: require('@/assets/images/mockup-dashboard.jpg'), // You'll need to add this image
      title: 'Track Your Progress',
      description:
        'Watch your sobriety days grow with an intuitive dashboard that celebrates every milestone.',
    },
    {
      image: require('@/assets/images/mockup-sponsor.jpg'), // You'll need to add this image
      title: 'Stay Connected',
      description: 'Build your support network with seamless sponsor and sponsee connections.',
    },
    {
      image: require('@/assets/images/mockup-milestone.jpg'), // You'll need to add this image
      title: 'Celebrate Milestones',
      description: 'Every achievement matters. Get recognized for your incredible journey.',
    },
  ];

  const styles = createStyles(theme, width);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>See It In Action</Text>
        <Text style={styles.sectionSubtitle}>
          A beautifully designed app that puts your recovery first
        </Text>

        <View style={styles.demosGrid}>
          {demos.map((demo, index) => (
            <DemoCard key={index} demo={demo} index={index} theme={theme} width={width} />
          ))}
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface DemoCardProps {
  demo: Demo;
  index: number;
  theme: any;
  width: number;
}

function DemoCard({ demo, index, theme, width }: DemoCardProps) {
  const styles = createCardStyles(theme, width);

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {/* Phone frame container */}
        <View style={styles.phoneFrame}>
          <Image source={demo.image} style={styles.image} resizeMode="cover" />
        </View>
      </View>

      <Text style={styles.title}>{demo.title}</Text>
      <Text style={styles.description}>{demo.description}</Text>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const createStyles = (theme: any, width: number) => {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  return StyleSheet.create({
    container: {
      backgroundColor: theme.background,
      paddingHorizontal: isMobile ? 24 : isTablet ? 48 : 80,
      paddingVertical: isMobile ? 96 : 120,
      alignItems: 'center',
    },
    content: {
      maxWidth: 1200,
      width: '120%',
    },
    sectionTitle: {
      fontSize: isMobile ? 32 : isTablet ? 40 : 48,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: isMobile ? 40 : isTablet ? 48 : 56,
    },
    sectionSubtitle: {
      fontSize: isMobile ? 16 : 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: isMobile ? 40 : 64,
      lineHeight: isMobile ? 24 : 28,
    },
    demosGrid: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 32 : 48,
      justifyContent: 'center',
    },
  });
};

const createCardStyles = (theme: any, width: number) => {
  const isMobile = width < 768;

  return StyleSheet.create({
    card: {
      flex: 1,
      alignItems: 'center',
      maxWidth: isMobile ? '120%' : 400,
      ...Platform.select({
        web: {},
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        },
      }),
    },
    imageContainer: {
      position: 'relative',
      marginBottom: 24,
      width: '120%',
      maxWidth: 280,
      alignItems: 'center',
    },
    phoneFrame: {
      width: '120%',
      maxWidth: 280,
      padding: 2,
      borderRadius: 12,
      ...Platform.select({
        web: {
          width: '120%',
          backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02))',
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        },
        default: {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        },
      }),
    },
    image: {
      width: '100%',
      height: '100%',
      aspectRatio: 3 / 4, // Typical phone aspect ratio
      borderRadius: 12,
    },
    title: {
      fontSize: isMobile ? 20 : 22,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: isMobile ? 28 : 30,
    },
    description: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 300,
    },
  });
};
