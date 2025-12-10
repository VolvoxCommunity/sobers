// =============================================================================
// Imports
// =============================================================================
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger, LogCategory } from '@/lib/logger';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

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
 * Renders a native Sign in with Apple button on iOS.
 *
 * @param onSuccess - Called after a successful sign-in exchange with the backend
 * @param onError - Called when sign-in fails; not invoked if the user cancels the Apple prompt
 * @returns A React element rendering the Apple sign-in button on iOS, or `null` on other platforms
 */
export function AppleSignInButton({ onSuccess, onError }: AppleSignInButtonProps) {
  const { isDark } = useTheme();
  const { refreshProfile } = useAuth();

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
      // Note: Nonce validation is handled internally by Supabase when it parses
      // the identityToken JWT - we don't need to pass it separately
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      // Track successful Apple sign in
      trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'apple' });

      // Apple only provides the user's full name on the FIRST sign-in.
      // Subsequent sign-ins return null for fullName. We must capture and
      // persist this data immediately.
      //
      // IMPORTANT: There's a race condition with onAuthStateChange:
      // 1. signInWithIdToken fires SIGNED_IN event
      // 2. onAuthStateChange calls createOAuthProfileIfNeeded with user (no name yet)
      // 3. updateUser sets name in user_metadata (too late for profile creation)
      //
      // Solution: Update BOTH user_metadata (for future reference) AND the profile
      // table directly (to fix the profile that was just created without a name).
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const firstName = credential.fullName.givenName ?? '';
        const familyName = credential.fullName.familyName ?? '';

        // Build display name in "FirstName L." format
        const lastInitial = familyName?.[0]?.toUpperCase() ?? '';
        const displayName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;

        const fullName = [firstName, familyName].filter(Boolean).join(' ');

        // Update user_metadata for future reference (e.g., if profile is recreated)
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            given_name: firstName || null,
            family_name: familyName || null,
          },
        });

        if (updateError) {
          logger.warn('Failed to update Apple user metadata with name', {
            category: LogCategory.AUTH,
            error: updateError.message,
          });
        }

        // Also update the profile directly since it was likely created without name data
        // due to the race condition with onAuthStateChange
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          logger.warn('Cannot update profile: user ID not available after sign-in', {
            category: LogCategory.AUTH,
          });
        } else if (displayName) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', userId);

          if (profileError) {
            logger.warn('Failed to update profile with Apple name data', {
              category: LogCategory.AUTH,
              error: profileError.message,
            });
          } else {
            logger.info('Profile updated with Apple name data', {
              category: LogCategory.AUTH,
              displayName,
            });
            // Refresh AuthContext profile state so onboarding sees the display name
            await refreshProfile();
          }
        }
      }

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
