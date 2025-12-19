import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { StyleSheet, Platform, View, Text, Dimensions } from 'react-native';
import { lightTheme, darkTheme, ThemeColors } from '@/constants/theme';

// =============================================================================
// Toast Configuration
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 400);

/**
 * Custom toast component that properly wraps long text.
 * Unlike BaseToast, this has no internal width constraints on text.
 */
function CustomToast({
  text1,
  borderColor,
  theme,
}: {
  text1?: string;
  borderColor: string;
  theme: ThemeColors;
}) {
  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.surface,
      borderLeftColor: borderColor,
      width: TOAST_WIDTH,
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
    },
  ];

  const textStyle = [
    styles.text,
    {
      fontFamily: theme.fontMedium,
      color: theme.text,
    },
  ];

  return (
    <View style={containerStyle}>{text1 ? <Text style={textStyle}>{text1}</Text> : null}</View>
  );
}

/**
 * Creates themed toast renderers for success, error, and info types.
 * Uses custom component that properly handles long text with wrapping.
 *
 * @param isDark - Whether dark mode is active
 * @returns Toast configuration object for react-native-toast-message
 */
export function createToastConfig(isDark: boolean): ToastConfig {
  const theme: ThemeColors = isDark ? darkTheme : lightTheme;

  return {
    success: (props: ToastConfigParams<unknown>) => (
      <CustomToast text1={props.text1} borderColor={theme.successAlt} theme={theme} />
    ),
    error: (props: ToastConfigParams<unknown>) => (
      <CustomToast text1={props.text1} borderColor={theme.error} theme={theme} />
    ),
    info: (props: ToastConfigParams<unknown>) => (
      <CustomToast text1={props.text1} borderColor={theme.info} theme={theme} />
    ),
  };
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
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
