// =============================================================================
// Imports
// =============================================================================
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowRight } from 'lucide-react-native';
import Logo from './Logo';

// =============================================================================
// Component
// =============================================================================

/**
 * Hero section component for the landing page.
 *
 * Displays the app name, tagline, description, and primary call-to-action buttons.
 * Features subtle animations for visual interest and includes an animated heart icon.
 * Responsive design adapts layout for desktop, tablet, and mobile viewports.
 *
 * @returns The hero section with animated elements and CTAs
 */
export default function HeroSection() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const styles = createStyles(theme, width);
  const isMobile = width < 768;

  const backgroundImageSource: any = require('@/assets/images/hero-forest.jpg');

  return (
    <View style={styles.container}>
      {/* Modern background image */}
      {backgroundImageSource &&
        (Platform.OS === 'web' ? (
          <View style={styles.backgroundImageContainer}>
            <Image
              source={backgroundImageSource}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
          </View>
        ) : (
          <ImageBackground
            source={backgroundImageSource}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.imageOverlay} />
          </ImageBackground>
        ))}

      {/* Decorative gradient background + floating shapes (web only visually matches Tailwind hero) */}
      {Platform.OS === 'web' && (
        <>
          <View style={styles.gradientBackground} />
          <View style={styles.heroBlobTopLeft} />
          <View style={styles.heroBlobBottomRight} />
          <View style={styles.heroBlobCenter} />
        </>
      )}

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Logo size={isMobile ? 64 : 80} color={theme.primary} />
        </View>

        {/* Title */}
        <View>
          <Text style={styles.title}>Sobriety Waypoint</Text>
          <Text style={styles.tagline}>Your Companion on the Path to Recovery</Text>
        </View>

        {/* Subtitle */}
        <View>
          <Text style={styles.subtitle}>
            Track your progress, connect with sponsors, and celebrate every milestone in your
            sobriety journey. A supportive companion for 12-step program participants.
          </Text>
        </View>

        {/* Inspiring Quote with quote-border styling */}
        <View style={styles.quoteContainer}>
          <View style={styles.quoteBorder}>
            <View style={styles.quoteBorderLine} />
            <Text style={styles.quote}>
              &ldquo;Recovery is not a race. You don&apos;t have to feel guilty if it takes you
              longer than you thought it would.&rdquo;
            </Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Get Started Free</Text>
            <ArrowRight size={20} color="#ffffff" style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Free Forever Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            <Text style={styles.badgePrimary}>Free Forever</Text>
            <Text style={styles.badgeSeparator}> · </Text>
            No Ads
            <Text style={styles.badgeSeparator}> · </Text>
            No Catch
          </Text>
        </View>
      </View>
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
      ...Platform.select({
        web: {
          minHeight: '90vh' as any,
        },
        default: {
          minHeight: 800,
        },
      }),
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isMobile ? 24 : isTablet ? 48 : 80,
      paddingVertical: isMobile ? 60 : 80,
      overflow: 'hidden',
      position: 'relative',
    },
    backgroundImageContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...Platform.select({
        web: {
          background:
            'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.7))',
        },
      }),
    },
    gradientBackground: {
      ...Platform.select({
        web: {
          position: 'absolute',
          inset: 0,
          // Soft vertical gradient similar to `--gradient-hero`
          backgroundImage:
            'linear-gradient(to bottom, rgba(241, 242, 243, 0.12), rgba(239, 246, 255, 0.2), rgba(249, 250, 251, 0.07))',
        },
        default: {},
      }),
    },
    heroBlobTopLeft: {
      ...Platform.select({
        web: {
          position: 'absolute',
          top: 80,
          left: 40,
          width: 280,
          height: 280,
          borderRadius: 999,
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          filter: 'blur(40px)',
        },
        default: {},
      }),
    },
    heroBlobBottomRight: {
      ...Platform.select({
        web: {
          position: 'absolute',
          right: 40,
          bottom: 80,
          width: 340,
          height: 340,
          borderRadius: 999,
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          filter: 'blur(48px)',
        },
        default: {},
      }),
    },
    heroBlobCenter: {
      ...Platform.select({
        web: {
          position: 'absolute',
          left: '25%',
          top: '50%',
          width: 220,
          height: 220,
          borderRadius: 999,
          filter: 'blur(32px)',
        },
        default: {},
      }),
    },
    content: {
      maxWidth: 800,
      width: '100%',
      alignItems: 'center',
      zIndex: 1,
      position: 'relative',
    },
    logoContainer: {
      marginBottom: isMobile ? 32 : 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: isMobile ? 40 : isTablet ? 56 : 64,
      fontFamily: theme.fontBold,
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: isMobile ? 48 : isTablet ? 64 : 72,
    },
    tagline: {
      fontSize: isMobile ? 20 : isTablet ? 24 : 28,
      fontFamily: theme.fontMedium,
      color: '#007AFF',
      textAlign: 'center',
      marginBottom: isMobile ? 24 : 32,
      lineHeight: isMobile ? 28 : isTablet ? 32 : 36,
    },
    subtitle: {
      fontSize: isMobile ? 16 : 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: isMobile ? 24 : 28,
      marginBottom: isMobile ? 24 : 32,
      paddingHorizontal: isMobile ? 0 : 40,
    },
    quoteContainer: {
      width: '100%',
      maxWidth: 600,
      marginBottom: isMobile ? 32 : 48,
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: isMobile ? 20 : 24,
      ...Platform.select({
        web: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          backgroundColor: 'rgba(245, 202, 202, 0.29)',
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
    quote: {
      fontSize: isMobile ? 16 : 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      fontStyle: 'italic',
      lineHeight: isMobile ? 24 : 28,
      textAlign: 'left',
    },
    buttonContainer: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: 16,
      marginBottom: 24,
      width: '100%',
      maxWidth: 500,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: '#007AFF',
      borderRadius: 12,
      paddingVertical: isMobile ? 16 : 18,
      paddingHorizontal: isMobile ? 32 : 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isMobile ? '100%' : 200,
      ...Platform.select({
        web: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
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
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
    },
    buttonIcon: {
      marginLeft: 8,
    },
    secondaryButton: {
      backgroundColor: theme.card,
      borderWidth: 2,
      borderColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 12,
      paddingVertical: isMobile ? 16 : 18,
      paddingHorizontal: isMobile ? 32 : 40,
      minWidth: isMobile ? '100%' : 200,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
      }),
    },
    secondaryButtonText: {
      color: theme.text,
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
    },
    badge: {
      backgroundColor: theme.card,
      borderRadius: 24,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    badgeText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    badgePrimary: {
      fontFamily: theme.fontMedium,
      color: theme.primary,
    },
    badgeSeparator: {
      color: theme.textSecondary,
    },
  });
};
