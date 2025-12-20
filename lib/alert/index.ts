/**
 * Platform-aware alert and confirm utilities.
 *
 * This is the ONLY module that app code should import for alerts.
 * Metro automatically selects the correct platform implementation:
 * - platform.web.ts for web
 * - platform.native.ts for iOS/Android
 *
 * @module lib/alert
 *
 * @example
 * ```ts
 * import { showAlert, showConfirm } from '@/lib/alert';
 *
 * // Show a simple alert
 * showAlert('Success', 'Your changes have been saved');
 *
 * // Show a confirmation dialog
 * const confirmed = await showConfirm(
 *   'Delete Account',
 *   'Are you sure you want to delete your account?',
 *   'Delete',
 *   'Cancel',
 *   true // destructive
 * );
 * ```
 */

// Re-export types
// Platform-specific implementation - Metro resolves to correct file
import { showAlertPlatform, showConfirmPlatform } from './platform';

export type { AlertButton } from './types';

/**
 * Display an alert dialog appropriate for the current platform.
 *
 * @param title - Dialog title (on web the title is prepended to the message)
 * @param message - Optional body text shown in the dialog
 * @param buttons - Optional button configurations; used on native platforms and ignored on web
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: import('./types').AlertButton[]
): void {
  showAlertPlatform(title, message, buttons);
}

/**
 * Display a confirmation dialog with Cancel and Confirm options.
 *
 * @param title - Dialog title
 * @param message - Dialog message body
 * @param confirmText - Label for the confirm button (default: 'Confirm')
 * @param cancelText - Label for the cancel button (default: 'Cancel')
 * @param destructive - If true, style the confirm button as destructive (default: false)
 * @returns `true` if the user confirms, `false` otherwise.
 */
export async function showConfirm(
  title: string,
  message: string,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false
): Promise<boolean> {
  return showConfirmPlatform(title, message, confirmText, cancelText, destructive);
}