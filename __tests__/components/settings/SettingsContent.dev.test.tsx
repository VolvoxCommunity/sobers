/**
 * @fileoverview DevToolsSection Tests for components/settings/SettingsContent.tsx
 *
 * This file tests the DevToolsSection component which is only rendered when __DEV__ is true.
 * We set __DEV__ = true before imports to ensure the component renders.
 */

// Set __DEV__ to true BEFORE importing anything that uses it
// @ts-expect-error - __DEV__ is a global that's normally set by the build system
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { SettingsContent } from '@/components/settings/SettingsContent';

global.__DEV__ = true;

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
}));

// Mock useWhatsNew hook
jest.mock('@/lib/whats-new', () => ({
  useWhatsNew: () => ({
    shouldShowWhatsNew: false,
    activeRelease: null,
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

// Mock AuthContext with mutable profile
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockRefreshProfile = jest.fn();
let mockProfile: {
  id: string;
  display_name: string | null;
  sobriety_date: string;
  hide_savings_card?: boolean;
} | null = {
  id: 'test-user-id',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
  hide_savings_card: false,
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
    get profile() {
      return mockProfile;
    },
    refreshProfile: mockRefreshProfile,
  }),
}));

// Mock ThemeContext
const mockSetThemeMode = jest.fn();
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
    setThemeMode: mockSetThemeMode,
    isDark: false,
  }),
}));

// Mock Supabase
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
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

// Mock Sentry
jest.mock('@/lib/sentry', () => ({
  captureSentryException: jest.fn(),
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

// Mock expo-router
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock DevToolsContext
const mockSetVerboseLogging = jest.fn();
const mockSetTimeTravelDays = jest.fn();
const mockSetAnalyticsDebug = jest.fn();
let mockTimeTravelDays = 0;
let mockVerboseLogging = false;
let mockAnalyticsDebug = false;
jest.mock('@/contexts/DevToolsContext', () => ({
  useDevTools: () => ({
    get verboseLogging() {
      return mockVerboseLogging;
    },
    setVerboseLogging: mockSetVerboseLogging,
    get timeTravelDays() {
      return mockTimeTravelDays;
    },
    setTimeTravelDays: mockSetTimeTravelDays,
    get analyticsDebug() {
      return mockAnalyticsDebug;
    },
    setAnalyticsDebug: mockSetAnalyticsDebug,
  }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('SettingsContent - DevToolsSection', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeTravelDays = 0;
    mockVerboseLogging = false;
    mockAnalyticsDebug = false;
    mockProfile = {
      id: 'test-user-id',
      display_name: 'Test User',
      sobriety_date: '2024-01-01',
      hide_savings_card: false,
    };
  });

  describe('Section Rendering', () => {
    it('renders Developer Tools section header', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Developer Tools')).toBeTruthy();
    });

    it('renders all dev tools menu items', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Test Sentry Error')).toBeTruthy();
      expect(screen.getByText('Verbose Logging')).toBeTruthy();
      expect(screen.getByText('Copy User ID')).toBeTruthy();
      expect(screen.getByText('Reset Onboarding')).toBeTruthy();
      expect(screen.getByText('Clear Slip-Ups')).toBeTruthy();
      expect(screen.getByText('Time Travel (days)')).toBeTruthy();
      expect(screen.getByText('Fire Test Analytics Event')).toBeTruthy();
      expect(screen.getByText('Analytics Debug')).toBeTruthy();
    });
  });

  describe('Toast Testing', () => {
    it('triggers success toast when success button is pressed', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const successButton = screen.getByTestId('test-toast-success');
      fireEvent.press(successButton);

      expect(showToast.success).toHaveBeenCalledWith('Success! This is a test message.');
    });

    it('triggers error toast when error button is pressed', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const errorButton = screen.getByTestId('test-toast-error');
      fireEvent.press(errorButton);

      expect(showToast.error).toHaveBeenCalledWith('Error! Something went wrong.');
    });

    it('triggers info toast when info button is pressed', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const infoButton = screen.getByTestId('test-toast-info');
      fireEvent.press(infoButton);

      expect(showToast.info).toHaveBeenCalledWith('Info: Here is some information.');
    });
  });

  describe('Test Sentry Error', () => {
    it('triggers test Sentry error and shows success toast', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { captureSentryException } = require('@/lib/sentry');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const sentryButton = screen.getByTestId('test-sentry-error');
      fireEvent.press(sentryButton);

      expect(captureSentryException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ source: 'dev_tools', test: true })
      );
      expect(showToast.success).toHaveBeenCalledWith('Test error sent to Sentry');
    });
  });

  describe('Verbose Logging Toggle', () => {
    it('toggles verbose logging on when currently off', () => {
      mockVerboseLogging = false;

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const toggleButton = screen.getByTestId('toggle-verbose-logging');
      fireEvent.press(toggleButton);

      expect(mockSetVerboseLogging).toHaveBeenCalledWith(true);
    });

    it('toggles verbose logging off when currently on', () => {
      mockVerboseLogging = true;

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const toggleButton = screen.getByTestId('toggle-verbose-logging');
      fireEvent.press(toggleButton);

      expect(mockSetVerboseLogging).toHaveBeenCalledWith(false);
    });
  });

  describe('Copy User ID', () => {
    it('copies user ID to clipboard when profile exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const copyButton = screen.getByTestId('copy-user-id');
      fireEvent.press(copyButton);

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalledWith('test-user-id');
        expect(showToast.success).toHaveBeenCalledWith('User ID copied to clipboard');
      });
    });

    it('shows error toast when profile is null', async () => {
      mockProfile = null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const copyButton = screen.getByTestId('copy-user-id');
      fireEvent.press(copyButton);

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith('No user ID available');
      });
    });
  });

  describe('Reset Onboarding', () => {
    it('resets onboarding when confirmed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      showConfirm.mockResolvedValueOnce(true);

      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const resetButton = screen.getByTestId('reset-onboarding');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(showConfirm).toHaveBeenCalled();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
        expect(mockUpdate).toHaveBeenCalledWith({
          display_name: null,
          sobriety_date: null,
        });
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
        expect(showToast.success).toHaveBeenCalledWith(
          'Profile reset. Redirecting to onboarding...'
        );
      });
    });

    it('does nothing when cancelled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      showConfirm.mockResolvedValueOnce(false);

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const resetButton = screen.getByTestId('reset-onboarding');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(showConfirm).toHaveBeenCalled();
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('shows error toast when profile is null', async () => {
      mockProfile = null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const resetButton = screen.getByTestId('reset-onboarding');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith('No profile to reset');
      });
    });

    it('shows error toast when Supabase fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      showConfirm.mockResolvedValueOnce(true);

      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const resetButton = screen.getByTestId('reset-onboarding');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith('Failed to reset profile');
      });
    });
  });

  describe('Clear Slip-Ups', () => {
    it('clears slip-ups when confirmed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      showConfirm.mockResolvedValueOnce(true);

      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ delete: mockDelete });

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const clearButton = screen.getByTestId('clear-slip-ups');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(showConfirm).toHaveBeenCalled();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('slip_ups');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(showToast.success).toHaveBeenCalledWith('All slip-ups cleared');
      });
    });

    it('does nothing when cancelled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      showConfirm.mockResolvedValueOnce(false);

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const clearButton = screen.getByTestId('clear-slip-ups');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(showConfirm).toHaveBeenCalled();
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });

    it('shows error toast when profile is null', async () => {
      mockProfile = null;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const clearButton = screen.getByTestId('clear-slip-ups');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith('No profile found');
      });
    });

    it('shows error toast when Supabase fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showConfirm } = require('@/lib/alert');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      showConfirm.mockResolvedValueOnce(true);

      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ delete: mockDelete });

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const clearButton = screen.getByTestId('clear-slip-ups');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(showToast.error).toHaveBeenCalledWith('Failed to clear slip-ups');
      });
    });
  });

  describe('Time Travel', () => {
    it('applies time travel with valid positive days', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const input = screen.getByTestId('time-travel-input');
      const applyButton = screen.getByTestId('apply-time-travel');

      fireEvent.changeText(input, '5');
      fireEvent.press(applyButton);

      expect(mockSetTimeTravelDays).toHaveBeenCalledWith(5);
      expect(showToast.success).toHaveBeenCalledWith('Time traveling +5 days');
    });

    it('applies time travel with negative days', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const input = screen.getByTestId('time-travel-input');
      const applyButton = screen.getByTestId('apply-time-travel');

      fireEvent.changeText(input, '-3');
      fireEvent.press(applyButton);

      expect(mockSetTimeTravelDays).toHaveBeenCalledWith(-3);
      expect(showToast.success).toHaveBeenCalledWith('Time traveling -3 days');
    });

    it('disables time travel when set to 0', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const input = screen.getByTestId('time-travel-input');
      const applyButton = screen.getByTestId('apply-time-travel');

      fireEvent.changeText(input, '0');
      fireEvent.press(applyButton);

      expect(mockSetTimeTravelDays).toHaveBeenCalledWith(0);
      expect(showToast.info).toHaveBeenCalledWith('Time travel disabled');
    });

    it('ignores invalid time travel input', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const input = screen.getByTestId('time-travel-input');
      const applyButton = screen.getByTestId('apply-time-travel');

      fireEvent.changeText(input, 'abc');
      fireEvent.press(applyButton);

      // NaN check should prevent state update
      expect(mockSetTimeTravelDays).not.toHaveBeenCalled();
    });

    it('shows reset button when time travel is active', () => {
      mockTimeTravelDays = 5;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const resetButton = screen.getByTestId('reset-time-travel');
      expect(resetButton).toBeTruthy();

      fireEvent.press(resetButton);

      expect(mockSetTimeTravelDays).toHaveBeenCalledWith(0);
      expect(showToast.info).toHaveBeenCalledWith('Time travel reset');
    });

    it('shows current time travel status', () => {
      mockTimeTravelDays = 5;

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Currently: +5 days')).toBeTruthy();
    });
  });

  describe('Analytics Debug Toggle', () => {
    it('toggles analytics debug on and shows info toast', () => {
      mockAnalyticsDebug = false;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const toggleButton = screen.getByTestId('toggle-analytics-debug');
      fireEvent.press(toggleButton);

      expect(mockSetAnalyticsDebug).toHaveBeenCalledWith(true);
      expect(showToast.info).toHaveBeenCalledWith('Analytics debug enabled');
    });

    it('toggles analytics debug off and shows info toast', () => {
      mockAnalyticsDebug = true;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const toggleButton = screen.getByTestId('toggle-analytics-debug');
      fireEvent.press(toggleButton);

      expect(mockSetAnalyticsDebug).toHaveBeenCalledWith(false);
      expect(showToast.info).toHaveBeenCalledWith('Analytics debug disabled');
    });
  });

  describe('Fire Test Analytics Event', () => {
    it('fires test analytics event and shows success toast', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { trackEvent } = require('@/lib/analytics');

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      const fireEventButton = screen.getByTestId('fire-test-event');
      fireEvent.press(fireEventButton);

      expect(trackEvent).toHaveBeenCalledWith(
        'dev_tools_test_event',
        expect.objectContaining({
          source: 'developer_tools',
        })
      );
      expect(showToast.success).toHaveBeenCalledWith('Test analytics event fired');
    });
  });
});
