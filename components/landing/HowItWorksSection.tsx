// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { UserPlus, CalendarCheck, Link2, TrendingUp } from 'lucide-react-native';

// =============================================================================
// Types
// =============================================================================

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * How It Works section component explaining the app usage flow.
 *
 * Displays a 4-step process with numbered steps, icons, titles, and descriptions.
 * Features animated entrance effects and responsive layout that adapts from vertical
 * on mobile to horizontal on desktop. Includes visual dividers between steps.
 *
 * @returns The how it works section with animated step cards
 */
export default function HowItWorksSection() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const iconSize = 24; // Match landing-page-refresh: w-6 h-6 = 24px

  const steps: Step[] = [
    {
      number: '01',
      icon: <UserPlus size={iconSize} color="#ffffff" />,
      title: 'Create Your Account',
      description:
        'Sign up in seconds with email or continue with Google. Your journey starts here.',
    },
    {
      number: '02',
      icon: <CalendarCheck size={iconSize} color="#ffffff" />,
      title: 'Set Your Sobriety Date',
      description:
        'Mark your starting point and watch as the days of progress add up. Every day counts.',
    },
    {
      number: '03',
      icon: <Link2 size={iconSize} color="#ffffff" />,
      title: 'Connect With Your Sponsor',
      description:
        'Use invite codes to connect with your sponsor or sponsee. Build your support network.',
    },
    {
      number: '04',
      icon: <TrendingUp size={iconSize} color="#ffffff" />,
      title: 'Track Your Progress',
      description:
        'Complete tasks, celebrate milestones, and stay accountable on your recovery journey.',
    },
  ];

  const styles = createStyles(theme, width);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.sectionSubtitle}>
          Getting started is simple. Follow these four easy steps to begin your journey.
        </Text>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} theme={theme} width={width} />
          ))}
        </View>

        {/* Encouraging message with quote-border styling */}
        <View style={styles.encouragementBox}>
          <View style={styles.quoteBorder}>
            <View style={styles.quoteBorderLine} />
            <Text style={styles.encouragementText}>
              &ldquo;One day at a time. You&apos;ve got this, and you&apos;re not alone.&rdquo;
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface StepCardProps {
  step: Step;
  index: number;
  theme: any;
  width: number;
}

function StepCard({ step, index, theme, width }: StepCardProps) {
  const styles = createCardStyles(theme, width);

  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>{step.number}</Text>
        <View style={styles.iconCircle}>{step.icon}</View>
      </View>
      <Text style={styles.stepTitle}>{step.title}</Text>
      <Text style={styles.stepDescription}>{step.description}</Text>
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
      paddingVertical: isMobile ? 72 : 96,
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
    stepsContainer: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 24 : 32,
      marginBottom: isMobile ? 40 : 64,
    },
    divider: {
      display: 'none', // No dividers in web version
    },
    encouragementBox: {
      width: '100%',
      maxWidth: 1200,
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: isMobile ? 24 : 32,
      ...Platform.select({
        web: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6,
        },
      }),
    },
    quoteBorder: {
      paddingLeft: 24,
      position: 'relative',
      width: '100%',
    },
    quoteBorderLine: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderRadius: 2,
      ...Platform.select({
        web: {
          backgroundImage: 'linear-gradient(to bottom, #007AFF, #3b82f6)',
        },
        default: {
          backgroundColor: '#007AFF',
        },
      }),
    },
    encouragementText: {
      fontSize: isMobile ? 20 : 24,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      textAlign: 'left',
      lineHeight: isMobile ? 30 : 36,
      fontStyle: 'italic',
    },
  });
};

const createCardStyles = (theme: any, width: number) => {
  const isMobile = width < 768;

  return StyleSheet.create({
    stepCard: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: isMobile ? 0 : 0,
    },
    stepHeader: {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 16,
      gap: 16,
    },
    stepNumber: {
      fontSize: 50,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: 'rgba(0, 122, 255, 0.12)', // text-primary/12
      lineHeight: 50,
      marginBottom: 16,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#007AFF',
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        web: {
          backgroundImage: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 91% 50%) 100%)',
        },
        default: {
          shadowColor: '#007AFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
      }),
    },
    stepTitle: {
      fontSize: isMobile ? 18 : 20,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
      lineHeight: isMobile ? 26 : 28,
    },
    stepDescription: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
};
