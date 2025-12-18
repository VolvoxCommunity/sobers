import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type ThemeColors } from '@/contexts/ThemeContext';
import { Heart, ArrowLeft, Check, X } from 'lucide-react-native';
import { validatePassword, checkPasswordRequirements } from '@/lib/validation';
import { GoogleLogo } from '@/components/auth/SocialLogos';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { logger, LogCategory } from '@/lib/logger';
import { showAlert } from '@/lib/alert';

interface PasswordRequirementProps {
  met: boolean;
  text: string;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

/**
 * Displays a single password requirement with check/x icon.
 * Uses text fallback (✓/✗) in test environments where icons may be mocked.
 */
function PasswordRequirement({ met, text, theme, styles }: PasswordRequirementProps) {
  const CheckIcon = Check;
  const XIcon = X;

  // Render icon or fallback text
  const renderIndicator = () => {
    if (met) {
      // Check if Check icon is a valid React component
      if (CheckIcon && typeof CheckIcon === 'function') {
        try {
          return <CheckIcon size={14} color={theme.success} testID={`check-${text}`} />;
        } catch {
          // Fallback to text
        }
      }
      return (
        <Text style={{ color: theme.success, fontSize: 14, width: 14 }} testID={`check-${text}`}>
          ✓
        </Text>
      );
    } else {
      // Check if X icon is a valid React component
      if (XIcon && typeof XIcon === 'function') {
        try {
          return <XIcon size={14} color={theme.textTertiary} testID={`x-${text}`} />;
        } catch {
          // Fallback to text
        }
      }
      return (
        <Text style={{ color: theme.textTertiary, fontSize: 14, width: 14 }} testID={`x-${text}`}>
          ✗
        </Text>
      );
    }
  };

  return (
    <View style={styles.requirementRow}>
      {renderIndicator()}
      <Text style={[styles.requirementText, met && styles.requirementMet]}>{text}</Text>
    </View>
  );
}

/**
 * Renders the sign-up screen with fields and actions to create a new account.
 *
 * The screen validates email and password inputs, performs email/password sign-up,
 * supports Google and Apple sign-in flows, and navigates to onboarding on successful account creation.
 *
 * @returns A React element representing the sign-up screen.
 */
export default function SignupScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Refs for field navigation
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showAlert('Error', passwordError);
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.replace('/onboarding');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to create account');
      logger.error('Sign up failed', err, { category: LogCategory.AUTH });
      showAlert('Error', err.message);
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
      showAlert('Error', err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(theme), [theme]);
  const passwordChecks = useMemo(() => checkPasswordRequirements(password), [password]);

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Heart size={48} color={theme.primary} fill={theme.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Begin your recovery journey</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="your@email.com"
              accessibilityLabel="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="••••••••"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              blurOnSubmit={false}
              autoComplete="password-new"
              textContentType="newPassword"
            />
            {password.length > 0 && (
              <View style={styles.requirementsContainer} testID="password-requirements">
                <PasswordRequirement
                  met={passwordChecks.minLength}
                  text="At least 8 characters"
                  theme={theme}
                  styles={styles}
                />
                <PasswordRequirement
                  met={passwordChecks.hasUppercase}
                  text="One uppercase letter"
                  theme={theme}
                  styles={styles}
                />
                <PasswordRequirement
                  met={passwordChecks.hasLowercase}
                  text="One lowercase letter"
                  theme={theme}
                  styles={styles}
                />
                <PasswordRequirement
                  met={passwordChecks.hasNumber}
                  text="One number"
                  theme={theme}
                  styles={styles}
                />
                <PasswordRequirement
                  met={passwordChecks.hasSymbol}
                  text="One symbol (!@#$%...)"
                  theme={theme}
                  styles={styles}
                />
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              ref={confirmPasswordRef}
              style={styles.input}
              placeholder="••••••••"
              accessibilityLabel="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              autoComplete="password-new"
              textContentType="newPassword"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading || googleLoading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Creating account' : 'Create Account'}
            accessibilityState={{ busy: loading, disabled: loading || googleLoading }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
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
            accessibilityRole="button"
            accessibilityLabel={googleLoading ? 'Signing in with Google' : 'Continue with Google'}
            accessibilityState={{ busy: googleLoading, disabled: loading || googleLoading }}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <GoogleLogo size={20} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple Sign In - only renders on iOS */}
          <AppleSignInButton
            onError={(error) => {
              logger.error('Apple sign in failed', error, { category: LogCategory.AUTH });
              showAlert('Error', error.message);
            }}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            disabled={loading || googleLoading}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
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
      padding: 24,
      paddingTop: 60,
    },
    backButton: {
      position: 'absolute',
      top: 48,
      left: 24,
      zIndex: 1,
      padding: 8,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
      marginTop: 20,
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
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.white,
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
    loginLink: {
      marginTop: 12,
      alignItems: 'center',
    },
    loginLinkText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: theme.fontRegular,
    },
    loginLinkBold: {
      color: theme.primary,
      fontWeight: '600',
    },
    requirementsContainer: {
      marginTop: 8,
      paddingHorizontal: 4,
    },
    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    requirementText: {
      fontSize: 12,
      fontFamily: theme.fontRegular,
      color: theme.textTertiary,
      marginLeft: 6,
    },
    requirementMet: {
      color: theme.success,
    },
  });
