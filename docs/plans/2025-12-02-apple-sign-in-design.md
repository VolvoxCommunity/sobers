# Apple Sign In for iOS - Design Document

**Date:** 2025-12-02
**Issue:** [#47](https://github.com/VolvoxCommunity/Sobriety-Waypoint/issues/47)
**Status:** Approved

## Overview

Implement native Apple Sign In for iOS to meet App Store requirements. Apps that offer third-party social login (Google) must also offer Sign in with Apple as an equivalent option.

### Key Decisions

| Decision       | Choice                      | Rationale                                                              |
| -------------- | --------------------------- | ---------------------------------------------------------------------- |
| Library        | `expo-apple-authentication` | Official Expo package, better integration with Expo workflow           |
| Platform scope | iOS only                    | App Store requirement only applies to iOS; avoids web OAuth complexity |
| Architecture   | Self-contained component    | Apple's native button is required by HIG; encapsulates all logic       |
| Button style   | Theme-aware                 | Black in light mode, white in dark mode for visual consistency         |

## Dependencies

### New Package

```bash
npx expo install expo-apple-authentication
```

### Configuration Changes (`app.config.ts`)

```typescript
ios: {
  bundleIdentifier: 'com.volvox.sobrietywaypoint',
  usesAppleSignIn: true,  // Add this capability
  // ... rest of iOS config
},
plugins: [
  'expo-router',
  'expo-apple-authentication',  // Add this plugin
  // ... other plugins
],
```

## Component Design

### File Location

```
components/auth/AppleSignInButton.tsx
```

### Interface

```typescript
interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
```

### Implementation

```typescript
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { logger, LogCategory } from '@/lib/logger';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Native Apple Sign In button for iOS.
 * Returns null on non-iOS platforms (Android, web).
 *
 * @remarks
 * Uses expo-apple-authentication for native Sign in with Apple flow.
 * Button style automatically adapts to current theme (black/white).
 * Profile creation is handled by AuthContext's onAuthStateChange listener.
 */
export function AppleSignInButton({ onSuccess, onError }: AppleSignInButtonProps) {
  const { isDark } = useTheme();

  // Only render on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;

      logger.info('Apple Sign In successful', { category: LogCategory.AUTH });
      onSuccess?.();
    } catch (error) {
      // User cancelled - not an error
      if ((error as any)?.code === 'ERR_REQUEST_CANCELED') {
        logger.info('Apple Sign In cancelled by user', { category: LogCategory.AUTH });
        return;
      }

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

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    height: 50,
  },
});
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User taps Apple button                                       │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ expo-apple-authentication.signInAsync()                      │
│ → iOS shows Face ID / Touch ID / Password prompt             │
│ → Returns: identityToken, user, fullName, email              │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ supabase.auth.signInWithIdToken({                            │
│   provider: 'apple',                                         │
│   token: identityToken                                       │
│ })                                                           │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ AuthContext.onAuthStateChange fires                          │
│ → createOAuthProfileIfNeeded() creates profile if new user   │
│ → fetchProfile() loads profile into state                    │
│ → Root layout redirects to /(tabs) or /onboarding            │
└─────────────────────────────────────────────────────────────┘
```

## Screen Integration

### Login Screen (`app/login.tsx`)

```typescript
// Add import
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';

// After Google button, before "Create New Account"
<AppleSignInButton
  onError={(error) => {
    Alert.alert('Error', error.message);
  }}
/>
```

### Signup Screen (`app/signup.tsx`)

```typescript
// Add import
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';

// After Google button, before "Already have an account?"
<AppleSignInButton
  onError={(error) => {
    Alert.alert('Error', error.message);
  }}
/>
```

## External Configuration

### Apple Developer Console

1. Navigate to Certificates, Identifiers & Profiles → Identifiers
2. Select App ID `com.volvox.sobrietywaypoint`
3. Enable "Sign in with Apple" capability
4. Save

**Not required:** Services ID (web only), Secret Key (web only)

### Supabase Dashboard

1. Navigate to Authentication → Providers → Apple
2. Enable Sign in with Apple
3. Set Client IDs to `com.volvox.sobrietywaypoint`
4. Leave Secret Key empty
5. Save

## Testing

| Environment     | Supported | Notes                            |
| --------------- | --------- | -------------------------------- |
| Expo Go         | ❌        | Native modules not supported     |
| iOS Simulator   | ⚠️        | Limited; real device recommended |
| Real iOS Device | ✅        | Required for reliable testing    |
| Android/Web     | N/A       | Button doesn't render            |

```bash
# Create development build for testing
eas build --platform ios --profile development
```

## Edge Cases

| Scenario                                         | Behavior                                                |
| ------------------------------------------------ | ------------------------------------------------------- |
| User cancels Apple prompt                        | Silent return (no error shown)                          |
| User hides email (private relay)                 | Supabase stores relay email; works normally             |
| Name not provided (first sign-in)                | Profile created with null name; collected in onboarding |
| Name not provided (subsequent sign-in)           | Profile already exists; no issue                        |
| Existing email/password user signs in with Apple | Supabase links accounts if email matches                |

## Files Changed

| File                                    | Change                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| `app.config.ts`                         | Add `usesAppleSignIn: true` + `expo-apple-authentication` plugin |
| `components/auth/AppleSignInButton.tsx` | New file                                                         |
| `app/login.tsx`                         | Import + render `<AppleSignInButton />`                          |
| `app/signup.tsx`                        | Import + render `<AppleSignInButton />`                          |
| `docs/APPLE_SIGNIN_SETUP.md`            | Update to reflect `expo-apple-authentication`                    |

## Acceptance Criteria

From issue #47:

- [x] Apple Sign In button displays exclusively on iOS
- [x] Button hidden on Android and web platforms
- [x] New user account creation via Apple authentication works
- [x] Existing users can authenticate through Apple
- [x] User profiles generate properly (including hidden email)
- [x] Error states display appropriately
- [x] Button styling adheres to Apple HIG
- [x] Authentication persists across app restarts
