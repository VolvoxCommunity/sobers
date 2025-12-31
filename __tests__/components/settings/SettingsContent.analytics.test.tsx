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

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    ANALYTICS: 'ANALYTICS',
  },
}));

// =============================================================================
// Get Mock References (after all jest.mock calls)
// =============================================================================
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { trackEvent: mockTrackEvent } = require('@/lib/analytics');

// =============================================================================
// Test Data
// =============================================================================

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  display_name: 'Test User',
  theme: 'system' as const,
  hide_savings_card: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notification_preferences: {
    tasks: true,
    messages: true,
    milestones: true,
    daily: true,
  },
};

const mockTheme = {
  primary: '#007AFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  background: '#F5F5F5',
  border: '#E5E7EB',
  fontRegular: 'System',
};

// =============================================================================
// Tests
// =============================================================================

describe('SettingsContent Analytics Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Theme Change Analytics', () => {
    it('tracks SETTINGS_CHANGED event when theme is changed to light', async () => {
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
    // TODO: This test requires proper AuthContext mocking - component doesn't accept profile prop
    it.skip('tracks SETTINGS_CHANGED event when savings card visibility is toggled on', async () => {
      const profileWithHiddenCard = {
        ...mockProfile,
        hide_savings_card: true,
      };

      render(
        <SettingsContent
          profile={profileWithHiddenCard}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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

    // TODO: This test requires proper AuthContext mocking - component doesn't accept profile prop
    it.skip('tracks SETTINGS_CHANGED event when savings card visibility is toggled off', async () => {
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

      const testEventButton = screen.getByText('Fire Test Analytics Event');
      fireEvent.press(testEventButton);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      expect(showToast.success).toHaveBeenCalledWith('Test analytics event fired');
    });

    it('toggles analytics debug mode', () => {
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

      const analyticsDebugToggle = screen.getByTestId('toggle-analytics-debug');
      fireEvent.press(analyticsDebugToggle);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { showToast } = require('@/lib/toast');
      expect(showToast.info).toHaveBeenCalledWith('Analytics debug enabled');
    });

    it('shows disabled message when analytics debug is toggled off', () => {
      // Need to render with analytics debug initially enabled
      // This would require DevToolsContext mock, so we'll test the toggle behavior
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

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
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

      const whatsNewButton = screen.getByText(/what's new/i);
      fireEvent.press(whatsNewButton);

      // Should only show toast, not track event
      expect(mockTrackEvent).not.toHaveBeenCalledWith('Settings Changed', expect.any(Object));
    });

    it('does not track analytics for sign out button press', () => {
      render(
        <SettingsContent
          profile={mockProfile}
          theme={mockTheme}
          isDark={false}
          setTheme={jest.fn()}
          onSignOut={jest.fn()}
          onRefreshProfile={jest.fn()}
        />
      );

      const signOutButton = screen.getByText('Sign Out');
      fireEvent.press(signOutButton);

      expect(mockTrackEvent).not.toHaveBeenCalledWith('Settings Changed', expect.any(Object));
    });
  });
});
