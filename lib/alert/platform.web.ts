/**
 * Web alert implementation using browser APIs.
 *
 * Uses window.alert and window.confirm for web platform dialogs.
 *
 * @module lib/alert/platform.web
 */

import type { AlertButton } from './types';

/**
 * Displays a browser alert dialog on web.
 *
 * On web, the title and message are combined since window.alert
 * only accepts a single string parameter.
 *
 * @param title - Dialog title; prepended to message on web
 * @param message - Optional body text shown in the dialog
 * @param _buttons - Button configurations (ignored on web)
 */
export function showAlertPlatform(title: string, message?: string, _buttons?: AlertButton[]): void {
  // On web, combine title and message for window.alert
  // Format: "Title: Message" or just "Title" if no message
  const alertText = message ? `${title}: ${message}` : title;
  window.alert(alertText);
}

/**
 * Displays a browser confirmation dialog on web.
 *
 * Uses window.confirm which only supports OK/Cancel buttons.
 * Custom button labels and destructive styling are not supported on web.
 *
 * @param title - Dialog title
 * @param message - Dialog message body
 * @param _confirmText - Label for confirm button (ignored on web)
 * @param _cancelText - Label for cancel button (ignored on web)
 * @param _destructive - Destructive styling (ignored on web)
 * @returns Promise that resolves to true if OK clicked, false if Cancel clicked
 */
export async function showConfirmPlatform(
  title: string,
  message: string,
  _confirmText?: string,
  _cancelText?: string,
  _destructive?: boolean
): Promise<boolean> {
  // On web, combine title and message for window.confirm
  const confirmMessage = `${title}\n\n${message}`;
  return window.confirm(confirmMessage);
}
