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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Shield, Zap, Target, ArrowRight } from 'lucide-react-native';
import Logo from './Logo';

// =============================================================================
// Component
// =============================================================================

/**
 * Free Forever section component highlighting the app's no-cost commitment.
 *
 * Emphasizes that the app is completely free with no ads or hidden costs, ever.
 * Features three key benefits with icons and a prominent call-to-action button.
 * Uses animations and a distinct background to draw attention to this unique value.
 *
 * @returns The free forever section with animated elements and CTA
 */
export default function FreeForeverSection() {
  const { theme } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const styles = createStyles(theme, width);
  const isMobile = width < 768;
  const iconSize = 20; // Match landing-page-refresh: w-5 h-5 = 20px

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      {Platform.OS === 'web' && <View style={styles.gradientBackground} />}

      <View style={styles.content}>
        <View style={styles.header}>
          <Logo size={isMobile ? 48 : 48} color="#007AFF" />
          <Text style={styles.title}>Free Forever. No Catch.</Text>
          <Text style={styles.subtitle}>
            Recovery support should be accessible to everyone. That is why Sobriety Waypoint will
            always be 100% free with no ads, no premium tiers, no hidden costs.
          </Text>
        </View>

        <View style={styles.benefitsContainer}>
          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Shield size={iconSize} color="#007AFF" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>No Ads, Ever</Text>
              <Text style={styles.benefitDescription}>
                Your recovery journey deserves focus, not distractions
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Zap size={iconSize} color="#007AFF" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>All Features Unlocked</Text>
              <Text style={styles.benefitDescription}>
                Every tool and feature available to all users, always
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Target size={iconSize} color="#007AFF" />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Built for Recovery</Text>
              <Text style={styles.benefitDescription}>
                Created to support your journey, not to profit from it
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/signup')}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaButtonText}>Start Your Journey Free</Text>
          <ArrowRight size={20} color="#ffffff" style={styles.buttonIcon} />
        </TouchableOpacity>

        <Text style={styles.footnote}>No credit card required · No trial period · Just free</Text>
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
      backgroundColor: theme.background,
      paddingHorizontal: isMobile ? 24 : isTablet ? 48 : 80,
      paddingVertical: isMobile ? 96 : 120,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      ...Platform.select({
        web: {
          backgroundImage:
            'linear-gradient(to bottom, hsl(var(--background)), rgba(0, 122, 255, 0.05), hsl(var(--background)))',
        },
      }),
    },
    content: {
      maxWidth: 800,
      width: '100%',
      alignItems: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: isMobile ? 40 : 48,
    },
    title: {
      fontSize: isMobile ? 32 : isTablet ? 40 : 48,
      fontFamily: theme.fontBold, // font-serif equivalent
      color: theme.text,
      textAlign: 'center',
      marginTop: 32,
      marginBottom: 16,
      lineHeight: isMobile ? 40 : isTablet ? 48 : 56,
    },
    subtitle: {
      fontSize: isMobile ? 16 : 18,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: isMobile ? 24 : 28,
      paddingHorizontal: isMobile ? 0 : 20,
    },
    benefitsContainer: {
      width: '100%',
      gap: isMobile ? 20 : 24,
      marginBottom: isMobile ? 40 : 48,
    },
    benefit: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.card,
      padding: isMobile ? 20 : 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.05)',
      gap: 16,
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
    benefitIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        web: {
          backgroundImage:
            'linear-gradient(135deg, hsl(217 91% 50% / 0.1) 0%, hsl(217 91% 50% / 0.05) 100%)',
        },
        default: {
          backgroundColor: theme.primaryLight,
        },
      }),
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      fontSize: isMobile ? 17 : 18,
      fontFamily: theme.fontSemiBold,
      color: theme.text,
      marginBottom: 4,
      lineHeight: isMobile ? 24 : 26,
    },
    benefitDescription: {
      fontSize: isMobile ? 14 : 15,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
      lineHeight: isMobile ? 20 : 22,
    },
    ctaButton: {
      backgroundColor: '#007AFF', // accent color
      borderRadius: 12,
      paddingVertical: isMobile ? 16 : 18,
      paddingHorizontal: isMobile ? 32 : 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
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
          shadowRadius: 12,
          elevation: 6,
        },
      }),
    },
    ctaButtonText: {
      color: '#ffffff',
      fontSize: 18,
      fontFamily: theme.fontSemiBold,
    },
    buttonIcon: {
      marginLeft: 8,
    },
    footnote: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      textAlign: 'center',
    },
  });
};
