// =============================================================================
// Imports
// =============================================================================
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { logger, LogCategory } from '@/lib/logger';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface AppleSignInButtonProps {
  /** Called after successful authentication */
  onSuccess?: () => void;
  /** Called on authentication failure (not called on user cancellation) */
  onError?: (error: Error) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Native Apple Sign In button for iOS.
 * Returns null on non-iOS platforms (Android, web).
 *
 * @remarks
 * Uses expo-apple-authentication for native Sign in with Apple flow.
 * Button style automatically adapts to current theme (black in light mode, white in dark mode).
 * Profile creation is handled by AuthContext's onAuthStateChange listener.
 *
 * This component is self-contained and handles the entire authentication flow:
 * 1. Shows Apple's native Sign in with Apple UI
 * 2. Gets identity token from Apple
 * 3. Exchanges token with Supabase via signInWithIdToken
 * 4. AuthContext listener handles profile creation and navigation
 *
 * @example
 * ```tsx
 * <AppleSignInButton
 *   onError={(error) => Alert.alert('Error', error.message)}
 * />
 * ```
 */
export function AppleSignInButton({ onSuccess, onError }: AppleSignInButtonProps) {
  const { isDark } = useTheme();

  // Only render on iOS - Apple Sign In is not available on Android
  // and web would require OAuth redirect flow (not implemented)
  if (Platform.OS !== 'ios') {
    return null;
  }

  /**
   * Handles the Apple Sign In flow.
   * Requests authentication from Apple, then exchanges the identity token with Supabase.
   */
  const handleAppleSignIn = async () => {
    try {
      // Request authentication from Apple
      // This shows the native Face ID / Touch ID / Password prompt
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Verify we received an identity token
      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      // Exchange the Apple identity token with Supabase
      // Supabase validates the token server-side and creates/retrieves the user
      // Include nonce if available for additional security validation
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: credential.nonce ?? undefined,
      });

      if (error) throw error;

      logger.info('Apple Sign In successful', { category: LogCategory.AUTH });
      onSuccess?.();
    } catch (error) {
      // Check if user cancelled the authentication prompt
      // This is not an error - user intentionally dismissed the prompt
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') {
        logger.info('Apple Sign In cancelled by user', { category: LogCategory.AUTH });
        return;
      }

      // Actual error occurred
      const err = error instanceof Error ? error : new Error('Apple Sign In failed');
      logger.error('Apple Sign In failed', err, { category: LogCategory.AUTH });
      onError?.(err);
    }
  };

  return (
    <View style={styles.container}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          isDark
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={12}
        style={styles.button}
        onPress={handleAppleSignIn}
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 50, // Matches Apple HIG minimum tap target (44pt) with padding
  },
});
