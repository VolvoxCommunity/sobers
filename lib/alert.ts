import { Alert, Platform } from 'react-native';

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Button configuration for native Alert dialogs.
 * Maps to React Native's AlertButton type.
 */
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

// =============================================================================
// Alert Utilities
// =============================================================================

/**
 * Displays an alert dialog appropriate for the current platform.
 *
 * @param title - Dialog title; on web the title is prepended to the message
 * @param message - Optional body text shown in the dialog
 * @param buttons - Optional button configurations; applied on native platforms and ignored on web
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
    // On web, combine title and message for window.alert
    // Format: "Title: Message" or just "Title" if no message
    const alertText = message ? `${title}: ${message}` : title;
    window.alert(alertText);
  } else {
    Alert.alert(title, message, buttons);
  }
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
  if (Platform.OS === 'web') {
    // On web, combine title and message for window.confirm
    const confirmMessage = `${title}\n\n${message}`;
    return window.confirm(confirmMessage);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}