# Google OAuth Setup Guide

This guide walks through configuring Google OAuth authentication for Sobers across all platforms (iOS, Android, and Web).

## Overview

The app uses Supabase Auth with Google OAuth. The authentication flow varies by platform:

- **Web**: Standard OAuth redirect flow via `supabase.auth.signInWithOAuth()`
- **Native (iOS/Android)**: Opens system browser via `expo-web-browser`, receives tokens via deep link callback

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to [Supabase Dashboard](https://supabase.com/dashboard)
- Expo project configured with the correct bundle identifiers

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen:
   - User Type: **External** (or Internal for Google Workspace)
   - App name: `Sobers`
   - User support email: Your email
   - Developer contact: Your email
5. Add scopes:
   - `email`
   - `profile`
   - `openid`
6. Save and continue

## Step 2: Create OAuth Credentials

### Web Client (Required for all platforms)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Sobers Web`
5. Add **Authorized JavaScript origins**:
   ```
   https://<your-supabase-project>.supabase.co
   http://localhost:8081
   http://localhost:19006
   ```
6. Add **Authorized redirect URIs**:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```
7. Save and note the **Client ID** and **Client Secret**

### iOS Client

1. Click **Create Credentials** → **OAuth client ID**
2. Application type: **iOS**
3. Name: `Sobers iOS`
4. Bundle ID: `com.volvox.sobrietywaypoint`
5. Save and note the **Client ID**

### Android Client

1. Click **Create Credentials** → **OAuth client ID**
2. Application type: **Android**
3. Name: `Sobers Android`
4. Package name: `com.volvox.sobers`
5. SHA-1 certificate fingerprint:
   - For development, get from EAS:
     ```bash
     eas credentials -p android
     ```
   - Or from local keystore:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
6. Save and note the **Client ID**

## Step 3: Configure Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Sign in with Google**
6. Enter credentials:
   - **Client ID**: Web client ID from Step 2
   - **Client Secret**: Web client secret from Step 2
7. Note the **Callback URL** shown (should be `https://<project>.supabase.co/auth/v1/callback`)
8. Click **Save**

## Step 4: Configure Expo Deep Linking

The app is already configured with the correct scheme. Verify in `app.config.ts`:

```typescript
scheme: 'sobers',
```

The redirect URI for native platforms is constructed as:

```text
sobers://auth/callback
```

This is handled automatically by `makeRedirectUri()` in `contexts/AuthContext.tsx`.

## Step 5: Verify Bundle Identifiers

Ensure your bundle identifiers match Google Cloud Console:

**In `app.config.ts`:**

```typescript
ios: {
  bundleIdentifier: 'com.volvox.sobrietywaypoint',
},
android: {
  package: 'com.volvox.sobers',
},
```

## How It Works

### Web Flow

1. User clicks "Continue with Google"
2. `signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. Browser redirects to Google's consent screen
4. After consent, Google redirects to Supabase callback URL
5. Supabase creates session and redirects to `window.location.origin`
6. `onAuthStateChange` listener picks up the session

### Native Flow (iOS/Android)

1. User clicks "Continue with Google"
2. `signInWithGoogle()` creates redirect URL via `makeRedirectUri()`
3. `WebBrowser.openAuthSessionAsync()` opens system browser
4. User authenticates with Google
5. Google redirects to Supabase callback → Supabase redirects to `sobers://auth/callback`
6. Two possible paths:
   - **Path A**: `WebBrowser.openAuthSessionAsync()` returns with the URL, tokens extracted
   - **Path B**: Deep link arrives via `Linking.addEventListener()`, `createSessionFromUrl()` handles it
7. Session created via `supabase.auth.setSession()`
8. `onAuthStateChange` listener creates profile if needed

### Key Implementation Details

**Token Extraction** (`AuthContext.tsx:71-98`):

- Tokens can be in URL hash (`#access_token=...`) or query params (`?access_token=...`)
- Helper function `extractTokensFromUrl()` handles both cases

**Race Condition Prevention** (`AuthContext.tsx:58-62`):

- `processedUrlsRef` prevents duplicate session creation
- `isProcessingOAuthRef` prevents concurrent OAuth flows

**Profile Creation** (`AuthContext.tsx:190-261`):

- Automatically creates profile on first OAuth sign-in
- Extracts name from Google metadata when available
- Idempotent - checks for existing profile first

## Testing

### Development Testing

1. Start the development server:

   ```bash
   pnpm start
   ```

2. Test web:
   - Open `http://localhost:8081` in browser
   - Click "Continue with Google"
   - Complete OAuth flow
   - Verify redirect back to app

3. Test iOS Simulator:

   ```bash
   pnpm ios
   ```

   - Tap "Continue with Google"
   - Complete OAuth in Safari
   - Verify deep link returns to app

4. Test Android Emulator:

   ```bash
   pnpm android
   ```

   - Tap "Continue with Google"
   - Complete OAuth in Chrome
   - Verify deep link returns to app

### Troubleshooting

**"redirect_uri_mismatch" Error**

- Verify redirect URIs in Google Cloud Console match exactly
- For Supabase, the redirect URI should be: `https://<project>.supabase.co/auth/v1/callback`

**iOS Deep Link Not Working**

- Ensure `scheme` is set in `app.config.ts`
- Rebuild the app after changing scheme: `pnpm ios`
- Check that `CFBundleURLSchemes` is in `Info.plist` after build

**Android Deep Link Not Working**

- Verify SHA-1 fingerprint matches in Google Cloud Console
- For development builds, use the debug keystore fingerprint
- For EAS builds, use the fingerprint from `eas credentials`

**Session Not Created**

- Check browser console/logs for errors
- Verify tokens are present in callback URL
- Ensure Supabase project URL and anon key are correct in `.env`

**Profile Not Created**

- Check Supabase logs for RLS policy errors
- Verify the `profiles` table allows INSERT for authenticated users
- Check `onAuthStateChange` is firing (add logging if needed)

## Security Considerations

- Client secrets should never be exposed in client-side code (Supabase handles this server-side)
- Always use HTTPS in production
- Regularly rotate OAuth credentials
- Monitor for unauthorized access in Google Cloud Console

## Related Files

- `contexts/AuthContext.tsx` - OAuth implementation
- `app/login.tsx` - Login screen with Google button
- `app/signup.tsx` - Signup screen with Google button
- `components/auth/SocialLogos.tsx` - Google logo component
- `lib/supabase.ts` - Supabase client configuration
