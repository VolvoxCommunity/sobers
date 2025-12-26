/**
 * @fileoverview Tests for components/settings/SettingsContent.tsx
 *
 * This file focuses on testing the App Updates (OTA) UI states that are not covered
 * in the main settings.test.tsx. The existing settings.test.tsx already covers:
 * - Display name editing (validation, save, error handling)
 * - Theme selection (light/dark/system)
 * - Sign out flow (confirmation, error handling)
 * - Account deletion (double confirmation, error handling)
 * - Build info (expansion, copy to clipboard)
 * - External links
 * - Accessibility
 *
 * This file specifically tests:
 * - App Updates section rendering based on isSupported flag
 * - Update status states (idle, checking, downloading, ready, error)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

// Mock toast - using factory function to ensure proper hoisting
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
      easBuildGitCommitHash: 'abc123',
      easBuildRunner: 'eas-build',
    },
  },
}));

// Mock expo-updates
jest.mock('expo-updates', () => ({
  channel: 'production',
  updateId: null,
  runtimeVersion: '1.0.0',
  isEmbeddedLaunch: true,
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
  setStringAsync: jest.fn(),
}));

// Mock AuthContext
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockRefreshProfile = jest.fn();
const mockProfile = {
  id: 'test-user-id',
  display_name: 'Test User',
  sobriety_date: '2024-01-01',
};
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
    profile: mockProfile,
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
      danger: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
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
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
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
  },
}));

// Mock alert
jest.mock('@/lib/alert', () => ({
  showAlert: jest.fn(),
  showConfirm: jest.fn(),
}));

// Mock useAppUpdates hook - will be overridden per test
const mockCheckForUpdates = jest.fn();
const mockApplyUpdate = jest.fn();

// Default mock state - not supported (to test when section is hidden)
let mockUpdateState = {
  status: 'idle' as const,
  isChecking: false,
  isDownloading: false,
  errorMessage: null as string | null,
  checkForUpdates: mockCheckForUpdates,
  applyUpdate: mockApplyUpdate,
  isSupported: false,
};

/**
 * Resets mockUpdateState to default values.
 * Call in beforeEach blocks to ensure clean test state.
 */
const resetMockUpdateState = (options?: { isSupported?: boolean }) => {
  mockUpdateState = {
    status: 'idle',
    isChecking: false,
    isDownloading: false,
    errorMessage: null,
    checkForUpdates: mockCheckForUpdates,
    applyUpdate: mockApplyUpdate,
    isSupported: options?.isSupported ?? false,
  };
};

jest.mock('@/hooks/useAppUpdates', () => ({
  useAppUpdates: () => mockUpdateState,
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('SettingsContent - App Updates', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUpdateState();
  });

  describe('when updates are not supported', () => {
    it('does not render App Updates section', () => {
      mockUpdateState.isSupported = false;

      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.queryByText('App Updates')).toBeNull();
    });
  });

  describe('when updates are supported', () => {
    beforeEach(() => {
      mockUpdateState.isSupported = true;
    });

    it('renders App Updates section', () => {
      render(<SettingsContent onDismiss={mockOnDismiss} />);

      expect(screen.getByText('App Updates')).toBeTruthy();
    });

    describe('idle state', () => {
      it('shows check for updates button', () => {
        mockUpdateState.status = 'idle';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Check for Updates')).toBeTruthy();
      });

      it('calls checkForUpdates when button is pressed', () => {
        mockUpdateState.status = 'idle';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        fireEvent.press(screen.getByText('Check for Updates'));

        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });

    describe('checking state', () => {
      it('shows checking indicator', () => {
        mockUpdateState.status = 'idle';
        mockUpdateState.isChecking = true;

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Checking for updates...')).toBeTruthy();
      });

      it('shows both check button and checking indicator during check', () => {
        // Note: The component shows both the idle button (status=idle) and
        // the checking indicator (isChecking=true) simultaneously.
        // This allows users to see there's a check in progress.
        mockUpdateState.status = 'idle';
        mockUpdateState.isChecking = true;

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        // Both elements are visible during checking
        expect(screen.getByText('Check for Updates')).toBeTruthy();
        expect(screen.getByText('Checking for updates...')).toBeTruthy();
      });
    });

    describe('downloading state', () => {
      it('shows downloading indicator', () => {
        mockUpdateState.status = 'downloading';
        mockUpdateState.isDownloading = true;

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Downloading update...')).toBeTruthy();
      });
    });

    describe('ready state', () => {
      it('shows restart button when update is ready', () => {
        mockUpdateState.status = 'ready';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Restart to Update')).toBeTruthy();
      });

      it('calls applyUpdate when restart button is pressed', () => {
        mockUpdateState.status = 'ready';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        fireEvent.press(screen.getByText('Restart to Update'));

        expect(mockApplyUpdate).toHaveBeenCalled();
      });

      it('shows update ready message', () => {
        mockUpdateState.status = 'ready';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Update ready to install')).toBeTruthy();
      });
    });

    describe('up-to-date state', () => {
      it('shows up to date message', () => {
        mockUpdateState.status = 'up-to-date';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('App is up to date')).toBeTruthy();
      });

      it('shows check again button when up to date', () => {
        mockUpdateState.status = 'up-to-date';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Check Again')).toBeTruthy();
      });

      it('calls checkForUpdates when check again is pressed', () => {
        mockUpdateState.status = 'up-to-date';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        fireEvent.press(screen.getByText('Check Again'));

        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });

    describe('error state', () => {
      it('shows error message', () => {
        mockUpdateState.status = 'error';
        mockUpdateState.errorMessage = 'Network error';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Network error')).toBeTruthy();
      });

      it('shows try again button on error', () => {
        mockUpdateState.status = 'error';
        mockUpdateState.errorMessage = 'Network error';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        expect(screen.getByText('Try Again')).toBeTruthy();
      });

      it('calls checkForUpdates when try again is pressed', () => {
        mockUpdateState.status = 'error';
        mockUpdateState.errorMessage = 'Network error';

        render(<SettingsContent onDismiss={mockOnDismiss} />);

        fireEvent.press(screen.getByText('Try Again'));

        expect(mockCheckForUpdates).toHaveBeenCalled();
      });
    });
  });
});

describe('SettingsContent - Accessibility', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockUpdateState({ isSupported: true });
  });

  it('has accessible check for updates button', () => {
    render(<SettingsContent onDismiss={mockOnDismiss} />);

    const button = screen.getByText('Check for Updates');
    expect(button).toBeTruthy();
  });

  it('has accessible restart to update button when ready', () => {
    mockUpdateState.status = 'ready';

    render(<SettingsContent onDismiss={mockOnDismiss} />);

    const button = screen.getByText('Restart to Update');
    expect(button).toBeTruthy();
  });
});

describe("SettingsContent - What's New", () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateState = {
      status: 'idle',
      isChecking: false,
      isDownloading: false,
      errorMessage: null,
      checkForUpdates: mockCheckForUpdates,
      applyUpdate: mockApplyUpdate,
      isSupported: true,
    };
  });

  it('shows info toast when clicked with no active release', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { showToast } = require('@/lib/toast');

    // The default mock has activeRelease: null
    render(<SettingsContent onDismiss={mockOnDismiss} />);

    const whatsNewRow = screen.getByTestId('settings-whats-new-row');
    fireEvent.press(whatsNewRow);

    expect(showToast.info).toHaveBeenCalledWith("You're all caught up! No new updates.");
  });
});

// Note: Build Info, Display Name, Theme Selection, Sign Out, and Delete Account
// are comprehensively tested in __tests__/app/settings.test.tsx.
// This file focuses specifically on App Updates UI states as documented in the fileoverview.
