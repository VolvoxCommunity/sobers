// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Calendar, Users, CheckSquare, Award } from 'lucide-react-native';

// =============================================================================
// Types
// =============================================================================

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Features section component showcasing the app's key functionality.
 *
 * Displays four main features with icons, titles, and descriptions in a responsive
 * grid layout. Features animate in with staggered delays for visual interest.
 * Adapts layout from single column on mobile to 2x2 grid on larger screens.
 *
 * @returns The features section with animated feature cards
 */
export default function FeaturesSection() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const iconSize = 24; // Match landing-page-refresh: w-6 h-6 = 24px

  const features: Feature[] = [
    {
      icon: <Calendar size={iconSize} color="#007AFF" />,
      title: 'Sobriety Tracking',
      description:
        'Keep track of your journey day by day. Watch your progress grow and celebrate every single day of sobriety.',
      color: '#007AFF',
    },
    {
      icon: <Users size={iconSize} color="#007AFF" />,
      title: 'Sponsor Connections',
      description:
        'Connect and communicate with your support network. Share tasks, check-ins, and stay accountable together.',
      color: '#007AFF',
    },
    {
      icon: <CheckSquare size={iconSize} color="#007AFF" />,
      title: 'Task Management',
      description:
        'Stay on top of your recovery goals with structured task management. Complete steps and track your commitments.',
      color: '#007AFF',
    },
    {
      icon: <Award size={iconSize} color="#007AFF" />,
      title: 'Milestone Celebrations',
      description:
        'Acknowledge every achievement along your journey. From your first day to years of sobriety, every milestone matters.',
      color: '#007AFF',
    },
  ];

  const styles = createStyles(theme, width);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Everything You Need for Your Journey</Text>
        <Text style={styles.sectionSubtitle}>
          Powerful tools to support your recovery, all in one place
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} theme={theme} width={width} />
          ))}
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface FeatureCardProps {
  feature: Feature;
  index: number;
  theme: any;
  width: number;
}

function FeatureCard({ feature, index, theme, width }: FeatureCardProps) {
  const styles = createCardStyles(theme, width);

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
        {feature.icon}
      </View>
      <Text style={styles.cardTitle}>{feature.title}</Text>
      <Text style={styles.cardDescription}>{feature.description}</Text>
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
      backgroundColor: Platform.select({
        web: 'rgba(210, 30%, 96%, 0.3)', // bg-secondary/30
        default: theme.surface,
      }),
      paddingHorizontal: isMobile ? 24 : isTablet ? 48 : 80,
      paddingVertical: isMobile ? 96 : 120,
      alignItems: 'center',
    },
    content: {
      maxWidth: 1200,
      width: '100%',
    },
    sectionTitle: {
      fontSize: isMobile ? 32 : isTablet ? 40 : 48,
      fontFamily: theme.fontBold,
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
      marginBottom: isMobile ? 40 : 56,
      lineHeight: isMobile ? 24 : 28,
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isMobile ? 20 : 24,
      justifyContent: 'center',
    },
  });
};

const createCardStyles = (theme: any, width: number) => {
  const isMobile = width < 768;

  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: isMobile ? 32 : 32,
      width: isMobile ? '100%' : '48%',
      minWidth: isMobile ? undefined : 280,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.05)',
      ...Platform.select({
        web: {
          backgroundImage: 'linear-gradient(145deg, hsl(0 0% 100%) 0%, hsl(210 30% 98%) 100%)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        },
      }),
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      ...Platform.select({
        web: {
          backgroundImage:
            'linear-gradient(135deg, hsl(217 91% 60% / 0.1) 0%, hsl(217 91% 60% / 0.05) 100%)',
        },
        default: {
          backgroundColor: theme.primaryLight,
        },
      }),
    },
    cardTitle: {
      fontSize: isMobile ? 20 : 20,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      marginBottom: 12,
      lineHeight: isMobile ? 28 : 28,
    },
    cardDescription: {
      fontSize: isMobile ? 14 : 15,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: isMobile ? 22 : 24,
    },
  });
};
