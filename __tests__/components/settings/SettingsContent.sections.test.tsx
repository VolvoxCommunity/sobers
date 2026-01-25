/**
 * @fileoverview Section Structure Tests for components/settings/SettingsContent.tsx
 *
 * Tests for the Settings screen section structure including:
 * - Your Journey section (merged Account + Journey)
 * - Section organization and content
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { SettingsContent } from '@/components/settings/SettingsContent';

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  LogOut: () => null,
  Moon: () => null,
  Sun: () => null,
  Monitor: () => null,
  ChevronLeft: () => null,
  ChevronRight: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  Shield: () => null,
  FileText: () => null,
  Github: () => null,
  Trash2: () => null,
  X: () => null,
  AlertTriangle: () => null,
  RefreshCw: () => null,
  CheckCircle: () => null,
  Download: () => null,
  AlertCircle: () => null,
  Info: () => null,
  Copy: () => null,
  User: () => null,
  Layout: () => null,
  Sparkles: () => null,
  Bug: () => null,
  Terminal: () => null,
  Clock: () => null,
  BarChart2: () => null,
  RotateCcw: () => null,
  Zap: () => null,
  Bell: () => null,
  Calendar: () => null,
  BookOpen: () => null,
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) =>
      React.createElement('input', { ...props, 'data-testid': 'date-picker' }),
  };
});

jest.mock('@/lib/date', () => ({
  formatDateWithTimezone: (d: Date) => d.toISOString().split('T')[0],
  parseDateAsLocal: (s: string) => new Date(s),
  getUserTimezone: () => 'UTC',
}));

// Mock useWhatsNew hook
jest.mock('@/lib/whats-new', () => ({
  useWhatsNew: () => ({
    shouldShowWhatsNew: false,
    releases: [],
    isLoading: false,
    markAsSeen: jest.fn(),
    refetch: jest.fn(),
  }),
}));

// Mock WhatsNewSheet component
jest.mock('@/components/whats-new', () => ({
  WhatsNewSheet: () => null,
}));

// Mock toast
jest.mock('@/lib/toast', () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock package.json
jest.mock(
  '../../../package.json',
  () => ({
    version: '1.0.0',
  }),
  { virtual: true }
);

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      easBuildId: 'test-build-id',
      easBuildProfile: 'production',
      easBuildGitCommitHash: 'abc123def456',
      easBuildRunner: 'eas-build',
    },
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  modelName: 'Test Device',
  osName: 'iOS',
  osVersion: '17.0',
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeBuildVersion: '100',
  nativeApplicationVersion: '1.0.0',
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock AuthContext
const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
  hide_savings_card: false,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    profile: mockProfile,
    refreshProfile: jest.fn(),
  }),
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      primaryLight: '#E5F1FF',
      text: '#111827',
      textSecondary: '#6b7280',
      textTertiary: '#9ca3af',
      background: '#ffffff',
      surface: '#ffffff',
      card: '#ffffff',
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      danger: '#ef4444',
      dangerLight: '#fef2f2',
      dangerBorder: '#fecaca',
      success: '#10b981',
      successAlt: '#059669',
      warning: '#f59e0b',
      error: '#dc2626',
      info: '#3b82f6',
      white: '#ffffff',
      black: '#000000',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    themeMode: 'system',
    setThemeMode: jest.fn(),
    isDark: false,
  }),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  LogCategory: {
    AUTH: 'auth',
    DATABASE: 'database',
    UI: 'ui',
    ERROR: 'error',
    ANALYTICS: 'analytics',
  },
}));

// Mock alert
jest.mock('@/lib/alert', () => ({
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: {
    SETTINGS_CHANGED: 'Settings Changed',
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock DevToolsContext
jest.mock('@/contexts/DevToolsContext', () => ({
  useDevTools: () => ({
    verboseLogging: false,
    setVerboseLogging: jest.fn(),
    timeTravelDays: 0,
    setTimeTravelDays: jest.fn(),
    analyticsDebug: false,
    setAnalyticsDebug: jest.fn(),
  }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('SettingsContent - Section Structure', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Your Journey Section', () => {
    it('renders merged Your Journey section with display name and journey start date', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Should have single "Your Journey" section title
      expect(screen.getByText('Your Journey')).toBeTruthy();

      // Should NOT have separate "Account" section title
      expect(screen.queryByText('Account')).toBeNull();

      // Should NOT have separate "Journey" section title (only "Your Journey")
      // Note: We need to check that we don't have a standalone "Journey" title
      // "Your Journey" contains "Journey" so we query all text elements
      const journeyElements = screen.queryAllByText('Journey');
      expect(journeyElements.length).toBe(0);
    });

    it('displays Display Name row within Your Journey section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Display Name row should exist
      expect(screen.getByText('Display Name')).toBeTruthy();
      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByTestId('account-name-row')).toBeTruthy();
    });

    it('displays Journey Start Date row within Your Journey section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Journey Start Date row should exist
      expect(screen.getByText('Journey Start Date')).toBeTruthy();
      expect(screen.getByTestId('settings-journey-date-row')).toBeTruthy();
    });
  });

  describe('Other Sections Remain Unchanged', () => {
    it('renders Appearance section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Appearance')).toBeTruthy();
    });

    it('renders About section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('About')).toBeTruthy();
    });
  });

  describe('Features Section (renamed from Dashboard)', () => {
    it('renders Features section with 12-step content toggle', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Should have "Features" section title (renamed from "Dashboard")
      expect(screen.getByText('Features')).toBeTruthy();

      // Should NOT have "Dashboard" section title anymore
      expect(screen.queryByText('Dashboard')).toBeNull();

      // Should have 12-step content toggle
      expect(screen.getByText('Include 12-Step Content')).toBeTruthy();
      expect(screen.getByText('Show the 12 Steps tab')).toBeTruthy();
      expect(screen.getByTestId('settings-twelve-step-toggle')).toBeTruthy();
    });

    it('displays 12-step toggle as ON when show_program_content is true or undefined', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Default profile has show_program_content undefined, treated as true
      const toggle = screen.getByTestId('settings-twelve-step-toggle');
      expect(toggle).toBeTruthy();

      // Toggle should show ON (profile.show_program_content !== false)
      // Use within to scope the query to the specific toggle element
      expect(within(toggle).getByText('ON')).toBeTruthy();
    });

    it('still shows savings card toggle in Features section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      // Savings card toggle should still exist in the renamed Features section
      expect(screen.getByTestId('settings-show-savings-toggle')).toBeTruthy();
      expect(screen.getByText('Show savings card')).toBeTruthy();
    });
  });
});
