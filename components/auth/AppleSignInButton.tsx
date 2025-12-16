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
import {
  setPendingAppleAuthName,
  clearPendingAppleAuthName,
  type PendingAppleAuthName,
} from '@/lib/apple-auth-name';

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

      // Apple only provides the user's full name on the FIRST sign-in.
      // Subsequent sign-ins return null for fullName. We must capture and
      // store this data BEFORE calling signInWithIdToken so that
      // createOAuthProfileIfNeeded can use it when creating the profile.
      //
      // IMPORTANT: If you've already signed in with Apple before (even if you
      // deleted the app), Apple will NOT provide the name again. To get the name
      // again, you must go to Settings > Apple ID > Password & Security >
      // Apps Using Apple ID > [App] > Stop Using Apple ID, then sign in again.
      let nameData: PendingAppleAuthName | null = null;

      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const firstName = (credential.fullName.givenName ?? '').trim();
        const familyName = (credential.fullName.familyName ?? '').trim();

        // Build display name in "FirstName L." format
        // Handle edge cases: firstName only, lastInitial only, or both
        const lastInitial = familyName?.[0]?.toUpperCase() ?? '';
        const displayName =
          firstName && lastInitial
            ? `${firstName} ${lastInitial}.`
            : firstName || (lastInitial ? `${lastInitial}.` : '');

        const fullName = [firstName, familyName].filter(Boolean).join(' ');

        nameData = { firstName, familyName, displayName, fullName };

        // Store name data so createOAuthProfileIfNeeded can access it
        // This must happen BEFORE signInWithIdToken
        setPendingAppleAuthName(nameData);
      } else {
        // Apple did not provide name - this happens on subsequent sign-ins
        logger.warn('Apple did NOT provide name data - user may need to revoke app access', {
          category: LogCategory.AUTH,
          hint: 'Settings > Apple ID > Password & Security > Apps Using Apple ID > Stop Using',
        });
      }

      // Exchange the Apple identity token with Supabase
      // Supabase validates the token server-side and creates/retrieves the user
      // Note: Nonce validation is handled internally by Supabase when it parses
      // the identityToken JWT - we don't need to pass it separately
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        // Clean up pending name data on error
        clearPendingAppleAuthName();
        throw error;
      }

      // Track successful Apple sign in
      try {
        trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'apple' });
      } catch (e) {
        logger.warn('Failed to track Apple sign in event', {
          category: LogCategory.AUTH,
          error: e,
        });
      }

      // If we have name data, also update user_metadata for future reference
      // (e.g., if profile is recreated later)
      if (nameData) {
        const { firstName, familyName, fullName } = nameData;

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

        // Also update the profile directly as a backup in case
        // createOAuthProfileIfNeeded ran before the pending name was available
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          logger.warn('Cannot update profile: user ID not available after sign-in', {
            category: LogCategory.AUTH,
          });
        } else if (nameData.displayName) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ display_name: nameData.displayName })
            .eq('id', userId);

          if (profileError) {
            logger.warn('Failed to update profile with Apple name data', {
              category: LogCategory.AUTH,
              error: profileError.message,
            });
          } else {
            // Refresh AuthContext profile state so onboarding sees the display name
            await refreshProfile();
          }
        }

        // Clean up pending name data now that profile is updated
        clearPendingAppleAuthName();
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
