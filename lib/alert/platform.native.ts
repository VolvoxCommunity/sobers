/**
 * Native alert implementation for iOS and Android.
 *
 * Uses React Native's Alert API for native platform dialogs.
 *
 * @module lib/alert/platform.native
 */

import { Alert } from 'react-native';

import type { AlertButton } from './types';

/**
 * Displays a native alert dialog on iOS/Android.
 *
 * @param title - Dialog title
 * @param message - Optional body text shown in the dialog
 * @param buttons - Optional button configurations
 */
export function showAlertPlatform(title: string, message?: string, buttons?: AlertButton[]): void {
  Alert.alert(title, message, buttons);
}

/**
 * Show a native confirmation dialog and resolve with the user's choice.
 *
 * @param title - Dialog title
 * @param message - Dialog message body
 * @param confirmText - Label for the confirm button (default: 'Confirm')
 * @param cancelText - Label for the cancel button (default: 'Cancel')
 * @param destructive - If true, style the confirm button as destructive (default: false)
 * @returns `true` if the user confirmed, `false` otherwise
 */
export async function showConfirmPlatform(
  title: string,
  message: string,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      }
    );
  });
}