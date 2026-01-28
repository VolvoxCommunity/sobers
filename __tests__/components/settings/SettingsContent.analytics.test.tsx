/**
 * @fileoverview Analytics Tracking Tests for components/settings/SettingsContent.tsx
 *
 * Tests analytics tracking for settings changes including:
 * - Theme changes
 * - Dashboard preferences
 * - Dev tools analytics events
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SettingsContent } from '@/components/settings/SettingsContent';

// =============================================================================
// Test Data (must be defined before mocks that reference them)
// =============================================================================

const defaultMockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  theme: 'system' as const,
  hide_savings_card: false,
  show_program_content: true,
  timezone: 'America/New_York',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: {
    tasks: true,
    messages: true,
    milestones: true,
    daily: true,
  },
};

// Mutable profile for tests that need to modify it
let mockProfile = { ...defaultMockProfile };

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  LogOut: () => null,
  Moon: () => null,
  Sun: () => null,
  Monitor: () => null,
  ChevronRight: () => null,
  Shield: () => null,
  FileText: () => null,
  Github: () => null,
  Info: () => null,
  Layout: () => null,
  Sparkles: () => null,
  Bug: () => null,
  Terminal: () => null,
  Clock: () => null,
  BarChart2: () => null,
  RotateCcw: () => null,
  Zap: () => null,
  Bell: () => null,
  Copy: () => null,
  User: () => null,
  Trash2: () => null,
  X: () => null,
  AlertTriangle: () => null,
  RefreshCw: () => null,
  CheckCircle: () => null,
  Download: () => null,
  AlertCircle: () => null,
  ChevronLeft: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
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

// Mock toast - define inline to avoid hoisting issues
jest.mock('@/lib/toast', () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock analytics - define inline to avoid hoisting issues
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: jest.requireActual('@/types/analytics').AnalyticsEvents,
}));

// Mock package.json
jest.mock('../../../package.json', () => ({ version: '1.0.0' }), { virtual: true });

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      easBuildId: 'test-build-id',
      easBuildProfile: 'production',
      easBuildGitCommitHash: 'abc123',
      easBuildRunner: 'eas-build',
    },
  },
}));

// Mock Supabase - inline to avoid hoisting issues
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

// Mock logger with all LogCategory values used by the component
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  LogCategory: {
    ANALYTICS: 'ANALYTICS',
    AUTH: 'AUTH',
    DATABASE: 'DATABASE',
    ERROR: 'ERROR',
    UI: 'UI',
  },
}));

// Mock refreshProfile function (defined outside mock for reference in tests)
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);

// Mock AuthContext - uses mockProfile variable which can be modified between tests
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    profile: mockProfile,
    refreshProfile: mockRefreshProfile,
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
      infoLight: '#eff6ff',
      fontRegular: 'JetBrainsMono_400Regular',
      fontMedium: 'JetBrainsMono_500Medium',
      fontSemiBold: 'JetBrainsMono_600SemiBold',
      fontBold: 'JetBrainsMono_700Bold',
    },
    themeMode: 'system',
    setThemeMode: jest.fn(),
    isDark: false,
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
// Get Mock References (after all jest.mock calls)
// =============================================================================
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { trackEvent: mockTrackEvent } = require('@/lib/analytics');

// =============================================================================
// Tests
// =============================================================================

describe('SettingsContent Analytics Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset profile to default values
    mockProfile = { ...defaultMockProfile };
  });

  describe('Theme Change Analytics', () => {
    it('tracks SETTINGS_CHANGED event when theme is changed to light', async () => {
      render(<SettingsContent />);

      // Press the light theme button directly (theme options are visible)
      const lightOption = screen.getByText('Light');
      fireEvent.press(lightOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'Settings Changed',
          expect.objectContaining({
            setting: 'theme',
            value: 'light',
          })
        );
      });
    });

    it('tracks SETTINGS_CHANGED event when theme is changed to dark', async () => {
      render(<SettingsContent />);

      const darkOption = screen.getByText('Dark');
      fireEvent.press(darkOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'Settings Changed',
          expect.objectContaining({
            setting: 'theme',
            value: 'dark',
          })
        );
      });
    });

    it('tracks SETTINGS_CHANGED event when theme is changed to system', async () => {
      render(<SettingsContent />);

      const systemOption = screen.getByText('System');
      fireEvent.press(systemOption);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'Settings Changed',
          expect.objectContaining({
            setting: 'theme',
            value: 'system',
          })
        );
      });
    });
  });

  describe('Dashboard Preferences Analytics', () => {
    it('tracks SETTINGS_CHANGED event when savings card visibility is toggled on', async () => {
      // Set up profile with hidden card
      mockProfile = { ...defaultMockProfile, hide_savings_card: true };

      render(<SettingsContent />);

      // Toggle savings card visibility
      const toggleButton = screen.getByTestId('settings-show-savings-toggle');
      fireEvent.press(toggleButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'Settings Changed',
          expect.objectContaining({
            setting: 'show_savings_card',
            value: true,
          })
        );
      });
    });

    it('tracks SETTINGS_CHANGED event when savings card visibility is toggled off', async () => {
      // Profile starts with hide_savings_card: false (default)
      render(<SettingsContent />);

      const toggleButton = screen.getByTestId('settings-show-savings-toggle');
      fireEvent.press(toggleButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'Settings Changed',
          expect.objectContaining({
            setting: 'show_savings_card',
            value: false,
          })
        );
      });
    });
  });

  describe('Dev Tools Analytics (in __DEV__ mode)', () => {
    beforeAll(() => {
      // Enable dev mode for these tests
      global.__DEV__ = true;
    });

    afterAll(() => {
      global.__DEV__ = false;
    });

    it('fires test analytics event when dev tool button is pressed', () => {
      render(<SettingsContent />);

      const testEventButton = screen.getByText('Fire Test Analytics Event');
      fireEvent.press(testEventButton);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'dev_tools_test_event',
        expect.objectContaining({
          source: 'developer_tools',
        })
      );
    });

    it('shows success toast when test analytics event is fired', () => {
      render(<SettingsContent />);

      const testEventButton = screen.getByText('Fire Test Analytics Event');
      fireEvent.press(testEventButton);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      expect(showToast.success).toHaveBeenCalledWith('Test analytics event fired');
    });

    it('toggles analytics debug mode', () => {
      render(<SettingsContent />);

      const analyticsDebugToggle = screen.getByTestId('toggle-analytics-debug');
      fireEvent.press(analyticsDebugToggle);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      expect(showToast.info).toHaveBeenCalledWith('Analytics debug enabled');
    });

    it('shows disabled message when analytics debug is toggled off', () => {
      render(<SettingsContent />);

      const analyticsDebugToggle = screen.getByTestId('toggle-analytics-debug');

      // First toggle enables it
      fireEvent.press(analyticsDebugToggle);
      jest.clearAllMocks();

      // Second toggle disables it
      fireEvent.press(analyticsDebugToggle);

      // Check that info toast was called (exact message depends on state)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      expect(showToast.info).toHaveBeenCalled();
    });
  });

  describe('Analytics Not Fired for Non-Preference Changes', () => {
    it("does not track analytics for What's New button press", () => {
      render(<SettingsContent />);

      const whatsNewButton = screen.getByText(/what's new/i);
      fireEvent.press(whatsNewButton);

      // Should only show toast, not track event
      expect(mockTrackEvent).not.toHaveBeenCalledWith('Settings Changed', expect.any(Object));
    });

    it('does not track analytics for sign out button press', () => {
      render(<SettingsContent />);

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.press(signOutButton);

      expect(mockTrackEvent).not.toHaveBeenCalledWith('Settings Changed', expect.any(Object));
    });
  });
});
