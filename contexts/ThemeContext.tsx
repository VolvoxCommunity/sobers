import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger, LogCategory } from '@/lib/logger';

export type ThemeMode = 'light' | 'dark' | 'system';

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
  warning: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  white: string;
  black: string;
  fontRegular: string;
  fontMedium: string;
  fontSemiBold: string;
  fontBold: string;
  // Glass effect properties
  glassTint: string;
  glassFallback: string;
  glassBorder: string;
}

interface ThemeContextType {
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const lightTheme: ThemeColors = {
  background: '#f9fafb',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textOnPrimary: '#ffffff',
  primary: '#007AFF',
  primaryLight: '#e5f1ff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  error: '#ef4444',
  success: '#007AFF',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  dangerBorder: '#fee2e2',
  white: '#ffffff',
  black: '#000000',
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
  // Glass effect properties
  glassTint: 'rgba(255, 255, 255, 0.1)',
  glassFallback: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
};

const darkTheme: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  card: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  textOnPrimary: '#ffffff',
  primary: '#007AFF',
  primaryLight: '#003d7a',
  border: '#374151',
  borderLight: '#4b5563',
  error: '#ef4444',
  success: '#007AFF',
  warning: '#f59e0b',
  danger: '#ef4444',
  dangerLight: '#7f1d1d',
  dangerBorder: '#991b1b',
  white: '#ffffff',
  black: '#000000',
  fontRegular: 'JetBrainsMono-Regular',
  fontMedium: 'JetBrainsMono-Medium',
  fontSemiBold: 'JetBrainsMono-SemiBold',
  fontBold: 'JetBrainsMono-Bold',
  // Glass effect properties
  glassTint: 'rgba(255, 255, 255, 0.05)',
  glassFallback: 'rgba(30, 30, 30, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_mode');
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      logger.error('Failed to load theme preference', error as Error, {
        category: LogCategory.STORAGE,
      });
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      setThemeModeState(mode);
    } catch (error) {
      logger.error('Failed to save theme preference', error as Error, {
        category: LogCategory.STORAGE,
      });
    }
  };

  const getEffectiveTheme = (): ThemeColors => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme: getEffectiveTheme(),
        themeMode,
        setThemeMode,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
