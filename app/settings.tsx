import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  Shield,
  FileText,
  Github,
} from 'lucide-react-native';
import packageJson from '../package.json';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        try {
          await signOut();
          router.replace('/login');
        } catch (error: any) {
          window.alert('Error signing out: ' + error.message);
        }
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out: ' + error.message);
            }
          },
        },
      ]);
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[styles.themeOption, themeMode === 'light' && styles.themeOptionSelected]}
                onPress={() => setThemeMode('light')}
              >
                <Sun
                  size={24}
                  color={themeMode === 'light' ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'light' && styles.themeOptionTextSelected,
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.themeOption, themeMode === 'dark' && styles.themeOptionSelected]}
                onPress={() => setThemeMode('dark')}
              >
                <Moon
                  size={24}
                  color={themeMode === 'dark' ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'dark' && styles.themeOptionTextSelected,
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.themeOption, themeMode === 'system' && styles.themeOptionSelected]}
                onPress={() => setThemeMode('system')}
              >
                <Monitor
                  size={24}
                  color={themeMode === 'system' ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'system' && styles.themeOptionTextSelected,
                  ]}
                >
                  System
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://sobrietywaypoint.com/privacy')}
            >
              <View style={styles.menuItemLeft}>
                <Shield size={20} color={theme.textSecondary} />
                <Text style={styles.menuItemText}>Privacy Policy</Text>
              </View>
              <ChevronLeft
                size={20}
                color={theme.textTertiary}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://sobrietywaypoint.com/terms')}
            >
              <View style={styles.menuItemLeft}>
                <FileText size={20} color={theme.textSecondary} />
                <Text style={styles.menuItemText}>Terms of Service</Text>
              </View>
              <ChevronLeft
                size={20}
                color={theme.textTertiary}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://github.com/billchirico/sobriety-waypoint')}
            >
              <View style={styles.menuItemLeft}>
                <Github size={20} color={theme.textSecondary} />
                <Text style={styles.menuItemText}>Source Code</Text>
              </View>
              <ChevronLeft
                size={20}
                color={theme.textTertiary}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Sobriety Waypoint v{packageJson.version}</Text>
          <Text style={styles.footerSubtext}>Supporting recovery, one day at a time</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://billchirico.dev')}>
            <Text style={styles.footerCredit}>By Bill Chirico</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 40 : 60,
      paddingBottom: 16,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.card,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: theme.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    themeOptions: {
      flexDirection: 'row',
      padding: 8,
      gap: 8,
    },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    themeOptionText: {
      marginTop: 8,
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    themeOptionTextSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.card,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuItemText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    separator: {
      height: 1,
      backgroundColor: theme.borderLight,
      marginLeft: 48,
    },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fef2f2',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#fee2e2',
    },
    signOutText: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: '#ef4444',
      marginLeft: 8,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    footerText: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      fontWeight: '600',
    },
    footerSubtext: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 4,
    },
    footerCredit: {
      fontSize: 11,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginTop: 12,
      fontStyle: 'italic',
      opacity: 0.7,
    },
  });
