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
import { Heart, ArrowLeft, Check, X, Eye, EyeOff } from 'lucide-react-native';
import { validatePassword, checkPasswordRequirements } from '@/lib/validation';
import { GoogleLogo } from '@/components/auth/SocialLogos';
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';
import { logger, LogCategory } from '@/lib/logger';
import { showToast } from '@/lib/toast';

interface PasswordRequirementProps {
  met: boolean;
  text: string;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

/**
 * Render a single password requirement row with an indicator (icon or fallback glyph) and label.
 *
 * The indicator shows a check when the requirement is met and an X when it is not; if the icon components are unavailable
 * or throw, a textual glyph (✓ / ✗) is used as a fallback.
 *
 * @param met - Whether the requirement is satisfied
 * @param text - The requirement description to display
 * @param theme - Theme colors used for the indicator styling
 * @param styles - StyleSheet object containing `requirementRow`, `requirementText`, and `requirementMet`
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
 * Display the create-account screen with email and confirm-password inputs, inline password requirement feedback, and Google/Apple sign-in options.
 *
 * @returns A React element that renders the sign-up screen UI
 */
export default function SignupScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      showToast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showToast.error('Passwords do not match');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showToast.error(passwordError);
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.replace('/onboarding');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to create account');
      logger.error('Sign up failed', err, { category: LogCategory.AUTH });
      showToast.error(err.message);
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
      showToast.error(err.message);
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
              testID="signup-email-input"
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
            <View>
              <TextInput
                testID="signup-password-input"
                ref={passwordRef}
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                blurOnSubmit={false}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <TouchableOpacity
                testID="signup-password-toggle"
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
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
            <View>
              <TextInput
                testID="signup-confirm-password-input"
                ref={confirmPasswordRef}
                style={[styles.input, styles.inputWithIcon]}
                placeholder="••••••••"
                accessibilityLabel="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                autoComplete="password-new"
                textContentType="newPassword"
              />
              <TouchableOpacity
                testID="signup-confirm-password-toggle"
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            testID="signup-submit-button"
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
            testID="signup-google-button"
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
            testID="signup-apple-button"
            onError={(error) => {
              logger.error('Apple sign in failed', error, { category: LogCategory.AUTH });
              showToast.error(error.message);
            }}
          />

          <TouchableOpacity
            testID="signup-login-link"
            style={styles.loginLink}
            onPress={() => router.push('/login')}
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
    inputWithIcon: {
      paddingRight: 48,
    },
    eyeIcon: {
      position: 'absolute',
      right: 16,
      height: '100%',
      justifyContent: 'center',
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
