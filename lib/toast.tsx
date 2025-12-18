import Toast, { BaseToast, ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { StyleSheet, Platform } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from '@/constants/theme';

// =============================================================================
// Types
// =============================================================================

type ToastType = 'success' | 'error' | 'info';

// =============================================================================
// Toast Configuration
// =============================================================================

/**
 * Creates themed toast renderers for success, error, and info types.
 * Uses theme colors for background, text, and accent borders.
 *
 * @param isDark - Whether dark mode is active
 * @returns Toast configuration object for react-native-toast-message
 */
export function createToastConfig(isDark: boolean): ToastConfig {
  const theme: ThemeColors = isDark ? darkTheme : lightTheme;

  const baseStyle = {
    backgroundColor: theme.surface,
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  };

  const textStyle = {
    fontFamily: theme.fontMedium,
    fontSize: 14,
    color: theme.text,
  };

  return {
    success: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.successAlt }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
    error: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.error }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
    info: (props: ToastConfigParams<unknown>) => (
      <BaseToast
        {...props}
        style={[baseStyle, { borderLeftColor: theme.info }]}
        contentContainerStyle={styles.contentContainer}
        text1Style={textStyle}
        text1NumberOfLines={3}
      />
    ),
  };
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 0,
  },
});

// =============================================================================
// Toast API
// =============================================================================

/**
 * Show a success toast notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param message - The message to display
 */
function success(message: string): void {
  Toast.show({
    type: 'success',
    text1: message,
    visibilityTime: 3000,
  });
}

/**
 * Show an error toast notification.
 * Auto-dismisses after 5 seconds (longer for readability).
 *
 * @param message - The message to display
 */
function error(message: string): void {
  Toast.show({
    type: 'error',
    text1: message,
    visibilityTime: 5000,
  });
}

/**
 * Show an info toast notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param message - The message to display
 */
function info(message: string): void {
  Toast.show({
    type: 'info',
    text1: message,
    visibilityTime: 3000,
  });
}

/**
 * Toast notification utilities for displaying non-blocking feedback.
 * Use for success/error/info messages. For confirmations, use `showConfirm()` from `@/lib/alert`.
 */
export const showToast = {
  success,
  error,
  info,
};
