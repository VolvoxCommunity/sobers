import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { Heart } from 'lucide-react-native';
import { GoogleLogo } from '@/components/auth/SocialLogos';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { logger, LogCategory } from '@/lib/logger';

/**
 * Render the app's login screen and manage email/password, Google, and Apple sign-in flows.
 *
 * Renders inputs for email and password, primary sign-in and Google/Apple sign-in buttons,
 * validation alerts for missing credentials, error alerts on sign-in failures, and a
 * navigation control to the sign-up screen.
 *
 * @returns The login screen JSX with credential inputs, sign-in actions, and account creation navigation
 */
export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Refs for field navigation
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please fill in all fields');
      } else {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to sign in');
      logger.error('Sign in failed', err, { category: LogCategory.AUTH, email });
      if (Platform.OS === 'web') {
        window.alert('Error: ' + err.message);
      } else {
        Alert.alert('Error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to sign in with Google');
      logger.error('Google sign in failed', err, { category: LogCategory.AUTH });
      if (Platform.OS === 'web') {
        window.alert('Error: ' + err.message);
      } else {
        Alert.alert('Error', err.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Heart size={48} color="#007AFF" fill="#007AFF" />
          </View>
          <Text style={styles.title}>Sobriety Waypoint</Text>
          <Text style={styles.subtitle}>Your journey to recovery</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading || googleLoading}
          >
            {!googleLoading && <GoogleLogo size={20} />}
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Apple Sign In - only renders on iOS */}
          <AppleSignInButton
            onError={(error) => {
              logger.error('Apple sign in failed', error, { category: LogCategory.AUTH });
              // AppleSignInButton only renders on iOS, so Alert.alert is safe here
              Alert.alert('Error', error.message);
            }}
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/signup')}
            disabled={loading || googleLoading}
          >
            <Text style={styles.secondaryButtonText}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    iconContainer: {
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontFamily: theme.fontRegular,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.textSecondary,
    },
    form: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      color: theme.text,
    },
    button: {
      backgroundColor: '#007AFF',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: theme.textTertiary,
      fontSize: 14,
      fontFamily: theme.fontRegular,
    },
    googleButton: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    googleButtonText: {
      color: theme.text,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
      marginLeft: 8,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: theme.text,
      fontSize: 16,
      fontFamily: theme.fontRegular,
      fontWeight: '600',
    },
  });
