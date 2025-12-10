/**
 * Shared module for passing Apple Sign In name data between components.
 *
 * Apple only provides the user's name on the FIRST sign-in. This data comes
 * from the native credential object, NOT from the identity token. Since
 * Supabase's signInWithIdToken only receives the token (not the credential),
 * the name data is not available in user_metadata automatically.
 *
 * This module allows AppleSignInButton to store the name data BEFORE calling
 * signInWithIdToken, so that AuthContext can store it in user_metadata for
 * later use during onboarding.
 *
 * Flow:
 * 1. AppleSignInButton receives credential with fullName from Apple
 * 2. AppleSignInButton calls setPendingAppleAuthName() with the name data
 * 3. AppleSignInButton calls signInWithIdToken()
 * 4. onAuthStateChange fires → storeAppleNameInMetadata runs
 * 5. storeAppleNameInMetadata calls getPendingAppleAuthName() to get name
 * 6. Name is stored in Supabase user_metadata (persists across sessions)
 * 7. Onboarding screen pre-fills display name from user_metadata
 * 8. Profile is created when user completes onboarding
 *
 * @module lib/apple-auth-name
 */

// =============================================================================
// Types
// =============================================================================

export interface PendingAppleAuthName {
  firstName: string;
  familyName: string;
  displayName: string;
  fullName: string;
}

// =============================================================================
// Module State
// =============================================================================

let pendingName: PendingAppleAuthName | null = null;

// =============================================================================
// Functions
// =============================================================================

/**
 * Store pending Apple Sign In name data before authentication.
 * Call this BEFORE signInWithIdToken so the data is available
 * when createOAuthProfileIfNeeded runs.
 *
 * @param data - The name data extracted from Apple credential
 */
export function setPendingAppleAuthName(data: PendingAppleAuthName): void {
  pendingName = data;
}

/**
 * Get pending Apple Sign In name data.
 * Call this in storeAppleNameInMetadata to check if there's
 * name data from an in-progress Apple Sign In.
 *
 * @returns The pending name data, or null if none
 */
export function getPendingAppleAuthName(): PendingAppleAuthName | null {
  return pendingName;
}

/**
 * Clear pending Apple Sign In name data.
 * Call this after the name has been stored in user_metadata to clean up.
 */
export function clearPendingAppleAuthName(): void {
  pendingName = null;
}
