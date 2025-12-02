# Apple Sign In Setup Guide

This guide walks through configuring Apple Sign In for Sobriety Waypoint on iOS.

## Overview

Apple Sign In uses a **native authentication flow** on iOS. The app obtains an identity token directly from Apple's native APIs and exchanges it with Supabase using `signInWithIdToken()`.

**Platform Support:**

- **iOS**: Native Sign in with Apple via `expo-apple-authentication` ✅
- **Android**: Not supported (Apple only supports Apple platforms and web)
- **Web**: Not implemented (would require OAuth secret key rotation every 6 months)

**Architecture Decision:**

We chose iOS-only support for simplicity:

- No OAuth secret key rotation maintenance (keys expire every 6 months)
- Simpler implementation using the official Expo package
- App Store compliance achieved (required when offering other social logins)

## Prerequisites

- Apple Developer Program membership ($99/year)
- Access to [Apple Developer Console](https://developer.apple.com/)
- Access to [Supabase Dashboard](https://supabase.com/dashboard)
- Expo project with EAS Build configured

## Step 1: Configure Apple Developer Console

### Create an App ID

1. Go to [Apple Developer Console](https://developer.apple.com/) → **Certificates, Identifiers & Profiles**
2. Select **Identifiers** → Click **+** to create new
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Configure:
   - Description: `Sobriety Waypoint`
   - Bundle ID: `com.volvox.sobrietywaypoint` (Explicit)
6. Scroll to **Capabilities** and enable **Sign in with Apple**
7. Click **Continue** → **Register**

### Gather Required Information

For Supabase configuration, you'll need:

| Value         | Where to Find                                              |
| ------------- | ---------------------------------------------------------- |
| **Bundle ID** | Your iOS bundle ID: `com.volvox.sobrietywaypoint`          |
| **Team ID**   | Top right of Apple Developer Console (10-character string) |

> **Note**: For native iOS-only sign-in, you do NOT need:
>
> - A Services ID (only needed for web OAuth)
> - A private key (only needed for web OAuth)
> - Secret key rotation (only needed for web OAuth)

## Step 2: Configure Supabase Provider

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **Authentication** → **Providers** → **Apple**
3. Toggle **Enable Sign in with Apple**
4. Configure the fields:

| Field                            | Value                         | Notes                                                  |
| -------------------------------- | ----------------------------- | ------------------------------------------------------ |
| **Client IDs**                   | `com.volvox.sobrietywaypoint` | Your iOS bundle ID                                     |
| **Secret Key (for OAuth)**       | _(leave empty)_               | Not needed for native iOS flow                         |
| **Allow users without an email** | Off                           | Toggle on only if you want to allow hidden email users |

5. Click **Save**

## Step 3: Configure Expo Project

### app.config.ts

The following configuration is already in place:

```typescript
// app.config.ts
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ios: {
    bundleIdentifier: 'com.volvox.sobrietywaypoint',
    usesAppleSignIn: true, // Enable Apple Sign In capability
    // ... other iOS config
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication', // Native Sign in with Apple support
    // ... other plugins
  ],
});
```

### Dependencies

The package is already installed:

```bash
# expo-apple-authentication is included in the project
pnpm list expo-apple-authentication
```

## Implementation Details

### Component Architecture

The `AppleSignInButton` component (`components/auth/AppleSignInButton.tsx`) is self-contained:

- Returns `null` on non-iOS platforms (no conditional rendering needed in parent)
- Handles the entire authentication flow internally
- Exchanges Apple identity token with Supabase via `signInWithIdToken`
- Profile creation is handled by AuthContext's existing `onAuthStateChange` listener
- Theme-aware button styling (black in light mode, white in dark mode)

### Component Usage

```tsx
import { AppleSignInButton } from '@/components/auth/AppleSignInButton';

// In login/signup screens:
<AppleSignInButton
  onError={(error) => {
    Alert.alert('Error', error.message);
  }}
/>;
```

### How It Works

1. User taps the Apple Sign In button
2. `expo-apple-authentication` shows native Face ID/Touch ID/Password prompt
3. Apple returns identity token after successful authentication
4. Component exchanges token with Supabase via `signInWithIdToken`
5. Supabase validates token server-side and creates/retrieves user
6. AuthContext's `onAuthStateChange` listener detects new session
7. `createOAuthProfileIfNeeded` creates profile if needed
8. User is redirected to onboarding (new user) or main app (returning user)

### Button Styling

The button follows Apple Human Interface Guidelines:

- Uses Apple's native `AppleAuthenticationButton` component
- Adapts to current theme: BLACK style in light mode, WHITE style in dark mode
- 12px corner radius to match other buttons in the app
- 50pt height (meets Apple's minimum 44pt tap target)

## Step 5: Handle User Data

### Apple Only Shares Name Once

Apple only provides the user's name on the **first** sign-in. The existing `createOAuthProfileIfNeeded` function in AuthContext handles this:

```typescript
// From AuthContext.tsx - already implemented
const createOAuthProfileIfNeeded = async (user: User): Promise<void> => {
  // ... checks for existing profile ...

  // Extract name from user metadata (available on first sign-in)
  const fullName = user.user_metadata?.full_name;
  const nameParts = fullName?.split(' ').filter(Boolean);
  const firstName = nameParts?.[0] || null; // May be null - collected during onboarding

  // Create profile with available data
  await supabase.from('profiles').insert({
    id: user.id,
    email: user.email || '',
    first_name: firstName,
    // ...
  });
};
```

If the name isn't available (subsequent sign-ins or user declined to share), the user is directed to onboarding where they enter their name.

### Private Email Relay

Apple allows users to hide their real email address. When they do, you'll receive an email like:

```
abc123def456@privaterelay.appleid.com
```

This is a real, working email address that forwards to the user's actual email. The app handles these normally—no special handling needed.

## Step 6: Build and Test

### Development Build Required

Apple Sign In requires a **development build** - it won't work in Expo Go.

```bash
# Create a development build for iOS
eas build --platform ios --profile development

# Or build locally (requires Xcode)
npx expo run:ios
```

### Testing Checklist

1. **Install** the development build on a real iOS device (**Apple Sign In requires a real device and does not work reliably in the Simulator**)
2. **Tap** "Sign in with Apple" button
3. **Verify** Face ID/Touch ID/Password prompt appears
4. **Authenticate** with your Apple ID
5. **Confirm** user is created in Supabase Auth dashboard
6. **Verify** profile is created in `profiles` table
7. **Test** returning user flow (sign out, sign back in)

### Resetting for Re-Testing

To get the name prompt again for testing:

1. Go to **Settings** → **Apple ID** → **Password & Security** → **Apps Using Apple ID**
2. Find and remove "Sobriety Waypoint"
3. Sign in again to get the first-time experience

## Troubleshooting

### "Invalid client" Error

- Verify your bundle ID matches in Apple Developer Console and Supabase
- Ensure Apple provider is enabled in Supabase

### "Apple Sign In is not available"

- This can happen on Simulator—test on a real device
- Ensure `usesAppleSignIn: true` is in app.config.ts
- Verify `expo-apple-authentication` plugin is included

### No Name Returned

- Apple only provides the name on the **first** sign-in
- This is expected behavior for returning users
- The onboarding flow collects the name if not available

### User Email is null

- User chose to hide their email—use the relay address Apple provides
- The relay address works like a normal email

### Button Not Appearing

- The component returns `null` on non-iOS platforms (Android, web)
- Verify you're testing on iOS

## Security Considerations

- Apple's identity tokens are short-lived and validated server-side by Supabase
- No private keys are stored client-side
- The native flow is more secure than OAuth redirect (no key rotation needed)

## App Store Requirements

If your app uses any third-party social login (Google, Facebook, etc.), Apple **requires** you to also offer Sign in with Apple. From Apple's App Store Review Guidelines:

> Apps that use a third-party or social login service to set up or authenticate the user's primary account with the app must also offer Sign in with Apple as an equivalent option.

This implementation satisfies that requirement.

## Related Files

- `components/auth/AppleSignInButton.tsx` - Self-contained Apple Sign In button
- `contexts/AuthContext.tsx` - Auth context (handles profile creation via onAuthStateChange)
- `app/login.tsx` - Login screen with Apple button
- `app/signup.tsx` - Signup screen with Apple button
- `app.config.ts` - Expo configuration with Apple Sign In capability

## References

- [Expo Apple Authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign In Guidelines](https://developer.apple.com/sign-in-with-apple/get-started/)
- [Apple Human Interface Guidelines - Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
