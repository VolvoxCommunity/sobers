import { Platform } from 'react-native';
import { Palette } from './colors';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  primary: string;
  primaryLight: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  successLight: string;
  warning: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  info: string;
  award: string;
  successAlt: string;
  white: string;
  black: string;
  shadow: string;
  fontRegular: string;
  fontMedium: string;
  fontSemiBold: string;
  fontBold: string;
  // Glass effect properties
  glassTint: string;
  glassFallback: string;
  glassBorder: string;
}

export const lightTheme: ThemeColors = {
  background: Palette.gray50,
  surface: Palette.white,
  card: Palette.white,
  text: Palette.gray900,
  textSecondary: Palette.gray500,
  textTertiary: Palette.gray400,
  textOnPrimary: Palette.white,
  primary: Palette.iosBlue,
  primaryLight: Palette.blue50,
  border: Palette.gray200,
  borderLight: Palette.gray100,
  error: Palette.red500,
  success: Palette.iosBlue,
  successLight: Palette.green50,
  warning: Palette.amber500,
  danger: Palette.red500,
  dangerLight: Palette.red50,
  dangerBorder: Palette.red100,
  info: Palette.blue500,
  award: Palette.violet500,
  successAlt: Palette.emerald500,
  white: Palette.white,
  black: Palette.black,
  shadow: Palette.black,
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
  glassTint: 'rgba(255, 255, 255, 0.1)',
  glassFallback: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
};

export const darkTheme: ThemeColors = {
  background: Palette.gray900,
  surface: Palette.gray800,
  card: Palette.gray800,
  text: Palette.gray50,
  textSecondary: Palette.gray400,
  textTertiary: Palette.gray500,
  textOnPrimary: Palette.white,
  primary: Palette.iosBlue,
  primaryLight: Palette.blue900,
  border: Palette.gray700,
  borderLight: Palette.gray600,
  error: Palette.red500,
  success: Palette.iosBlue,
  successLight: Palette.green900,
  warning: Palette.amber500,
  danger: Palette.red500,
  dangerLight: Palette.red900,
  dangerBorder: Palette.red800,
  info: Palette.blue500,
  award: Palette.violet500,
  successAlt: Palette.emerald500,
  white: Palette.white,
  black: Palette.black,
  shadow: Palette.black,
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
  glassTint: 'rgba(255, 255, 255, 0.05)',
  glassFallback: 'rgba(30, 30, 30, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
