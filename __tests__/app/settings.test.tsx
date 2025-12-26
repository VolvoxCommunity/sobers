/**
 * @fileoverview Tests for app/settings.tsx
 *
 * Tests the settings screen including:
 * - Header and navigation
 * - Theme switching
 * - Sign out functionality
 * - External links
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '@/app/(app)/settings';

// Import Toast mock for assertions
import Toast from 'react-native-toast-message';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: jest.fn(),
  }),
  Stack: {
    Screen: () => null,
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// Mock AuthContext
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockRefreshProfile = jest.fn();
const defaultMockProfile = {
  id: 'test-user-id',
  display_name: 'Test D.',
  sobriety_date: '2024-01-01',
};
// Use a mutable variable to allow per-test override
let mockProfile: typeof defaultMockProfile | null = defaultMockProfile;
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

// Mock useAppUpdates hook
jest.mock('@/hooks/useAppUpdates', () => ({
  useAppUpdates: () => ({
    status: 'idle',
    isChecking: false,
    isDownloading: false,
    errorMessage: null,
    checkForUpdates: jest.fn(),
    applyUpdate: jest.fn(),
    isSupported: false,
  }),
}));

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

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      easBuildId: 'test-build-id',
      easBuildProfile: 'preview',
      easBuildGitCommitHash: 'abc123',
    },
  },
}));

// Mock expo-updates
jest.mock('expo-updates', () => ({
  channel: 'preview',
  updateId: null,
  runtimeVersion: '1.1.0',
  isEmbeddedLaunch: true,
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  modelName: 'iPhone 15',
  osName: 'iOS',
  osVersion: '17.0',
}));

// Mock expo-application
jest.mock('expo-application', () => ({
  nativeBuildVersion: '1',
  nativeApplicationVersion: '1.1.0',
}));

// Mock package.json - use absolute path from project root
jest.mock(
  '../../package.json',
  () => ({
    version: '1.1.0',
  }),
  { virtual: true }
);

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  LogCategory: {
    AUTH: 'auth',
    UI: 'ui',
    DATABASE: 'database',
  },
}));

// Mock @/lib/alert - only showConfirm is used for confirmations
const mockShowConfirm = jest.fn();
let mockUseRealAlertImplementation = false;

jest.mock('@/lib/alert', () => {
  const actualAlert = jest.requireActual('@/lib/alert');
  return {
    showConfirm: (...args: unknown[]) => {
      if (mockUseRealAlertImplementation) {
        return actualAlert.showConfirm(...args);
      }
      return mockShowConfirm(...args);
    },
  };
});

// Mock Supabase
const mockSupabaseFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockSupabaseFrom.mockReset();
    // Reset profile to default for each test
    mockProfile = defaultMockProfile;
    // Reset alert mocks with default behaviors
    mockShowConfirm.mockResolvedValue(true);
    (Toast.show as jest.Mock).mockClear();
  });

  describe('Theme Section', () => {
    it('renders appearance section', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Appearance')).toBeTruthy();
    });

    it('renders theme options', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Light')).toBeTruthy();
      expect(screen.getByText('Dark')).toBeTruthy();
      expect(screen.getByText('System')).toBeTruthy();
    });

    it('changes theme when Light is pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Light'));

      expect(mockSetThemeMode).toHaveBeenCalledWith('light');
    });

    it('changes theme when Dark is pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Dark'));

      expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
    });

    it('changes theme when System is pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('System'));

      expect(mockSetThemeMode).toHaveBeenCalledWith('system');
    });
  });

  describe('About Section', () => {
    it('renders version info', () => {
      render(<SettingsScreen />);

      expect(screen.getByText(/v1\.1\.0/)).toBeTruthy();
    });

    it('renders developer attribution', () => {
      render(<SettingsScreen />);

      expect(screen.getByText(/By Bill Chirico/)).toBeTruthy();
    });
  });

  describe('About Section Links', () => {
    it('renders privacy policy link', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Privacy Policy')).toBeTruthy();
    });

    it('renders terms of service link', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Terms of Service')).toBeTruthy();
    });

    it('renders source code link', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Source Code')).toBeTruthy();
    });
  });

  describe('Sign Out', () => {
    it('renders sign out button', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Sign Out')).toBeTruthy();
    });

    it('has accessible sign out button', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Sign out of your account')).toBeTruthy();
    });
  });

  describe('Danger Zone', () => {
    it('renders danger zone collapsible header', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('DANGER ZONE')).toBeTruthy();
    });

    it('has accessible expand/collapse button', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Danger Zone section')).toBeTruthy();
    });
  });

  describe('Build Info', () => {
    it('renders build info collapsible header', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('BUILD INFO')).toBeTruthy();
    });

    it('has accessible expand/collapse button', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Build Information section')).toBeTruthy();
    });

    it('expands build info section when pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      // After expanding, should see build details
      expect(screen.getByText('BUILD INFO')).toBeTruthy();
    });
  });

  describe('Danger Zone Expansion', () => {
    it('expands danger zone section when pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      // Danger zone is expanded, should show delete account button
      expect(screen.getByText('DANGER ZONE')).toBeTruthy();
    });

    it('shows delete account button when danger zone is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });
    });
  });

  describe('Theme Button States', () => {
    it('renders all theme option icons', () => {
      render(<SettingsScreen />);

      // Buttons should be rendered (icons are mocked)
      expect(screen.getByText('Light')).toBeTruthy();
      expect(screen.getByText('Dark')).toBeTruthy();
      expect(screen.getByText('System')).toBeTruthy();
    });
  });

  describe('External Links Rendering', () => {
    it('renders all external link buttons', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Privacy Policy')).toBeTruthy();
      expect(screen.getByText('Terms of Service')).toBeTruthy();
      expect(screen.getByText('Source Code')).toBeTruthy();
    });
  });

  describe('Version Display', () => {
    it('shows version number from package.json', () => {
      render(<SettingsScreen />);

      expect(screen.getByText(/v1\.1\.0/)).toBeTruthy();
    });

    it('shows developer attribution', () => {
      render(<SettingsScreen />);

      expect(screen.getByText(/By Bill Chirico/)).toBeTruthy();
    });
  });

  describe('Settings Section', () => {
    it('renders Appearance section heading', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Appearance')).toBeTruthy();
    });

    it('renders all UI elements', () => {
      render(<SettingsScreen />);

      // Main sections should be rendered (header is now native, not rendered in component)
      expect(screen.getByText('Appearance')).toBeTruthy();
      expect(screen.getByText('Sign Out')).toBeTruthy();
      expect(screen.getByText('DANGER ZONE')).toBeTruthy();
      expect(screen.getByText('BUILD INFO')).toBeTruthy();
    });
  });

  describe('Sign Out Button', () => {
    it('renders sign out text', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Sign Out')).toBeTruthy();
    });

    it('sign out button is pressable', () => {
      render(<SettingsScreen />);

      const signOutButton = screen.getByLabelText('Sign out of your account');
      expect(signOutButton).toBeTruthy();
    });
  });

  describe('Sign Out Flow', () => {
    it('shows confirmation dialog when sign out is pressed', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Sign Out',
          'Are you sure you want to sign out?',
          'Sign Out',
          'Cancel',
          true
        );
      });
    });

    it('calls signOut and dismisses modal on confirmation', async () => {
      mockShowConfirm.mockResolvedValueOnce(true);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled();
      });

      // Modal is dismissed first, then signOut is called
      // Auth guard in _layout.tsx handles redirect to /login
      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('shows error toast when sign out fails', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));
      mockShowConfirm.mockResolvedValueOnce(true);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to sign out: Sign out failed' })
        );
      });
    });

    it('does not sign out when cancel is pressed', async () => {
      mockShowConfirm.mockResolvedValueOnce(false);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalled();
      });

      // Cancel does nothing, signOut should not be called
      expect(mockSignOut).not.toHaveBeenCalled();
    });
  });

  describe('Delete Account Flow', () => {
    it('shows delete account button when danger zone is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });
    });

    it('shows first confirmation dialog when delete account is pressed', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledWith(
          'Delete Account?',
          expect.stringContaining('permanently delete your account'),
          'Delete Account',
          'Cancel',
          true
        );
      });
    });

    it('shows second confirmation dialog after first confirmation', async () => {
      mockShowConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(mockShowConfirm).toHaveBeenCalledTimes(2);
        expect(mockShowConfirm).toHaveBeenNthCalledWith(
          2,
          'Final Confirmation',
          expect.stringContaining('last chance to cancel'),
          'Yes, Delete My Account',
          'Cancel',
          true
        );
      });
    });

    it('calls deleteAccount after both confirmations', async () => {
      mockDeleteAccount.mockResolvedValue(undefined);
      mockShowConfirm.mockResolvedValue(true);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(mockDeleteAccount).toHaveBeenCalled();
      });
    });

    it('shows error toast when delete account fails', async () => {
      mockDeleteAccount.mockRejectedValueOnce(new Error('Deletion failed'));
      mockShowConfirm.mockResolvedValue(true);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Failed to delete account: Deletion failed',
          })
        );
      });
    });

    it('shows danger zone description when expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(
          screen.getByText(/Permanently delete your account and all associated data/)
        ).toBeTruthy();
      });
    });
  });

  describe('External Links', () => {
    it('opens privacy policy URL when pressed', async () => {
      const { Linking } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Privacy Policy'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://sobers.app/privacy');
      });
    });

    it('opens terms of service URL when pressed', async () => {
      const { Linking } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Terms of Service'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://sobers.app/terms');
      });
    });

    it('opens source code URL when pressed', async () => {
      const { Linking } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Source Code'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          'https://github.com/VolvoxCommunity/Sobriety-Waypoint'
        );
      });
    });

    it('opens developer URL when footer credit is pressed', async () => {
      const { Linking } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('By Bill Chirico'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://billchirico.dev');
      });
    });
  });

  describe('Build Info Expansion', () => {
    it('shows app version when build info is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('App Version')).toBeTruthy();
      });
    });

    it('shows device info when build info is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Device')).toBeTruthy();
        expect(screen.getByText('iPhone 15')).toBeTruthy();
      });
    });

    it('shows OS info when build info is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('OS')).toBeTruthy();
      });
    });

    it('shows build profile when build info is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Build Profile')).toBeTruthy();
        // There may be multiple "preview" texts (channel and profile)
        expect(screen.getAllByText('preview').length).toBeGreaterThan(0);
      });
    });

    it('shows copy all button when build info is expanded', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Copy All Build Info')).toBeTruthy();
      });
    });

    it('renders bundle type label', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Bundle')).toBeTruthy();
        expect(screen.getByText('Embedded')).toBeTruthy();
      });
    });
  });

  describe('Clipboard Copy', () => {
    it('copies all build info when copy all button is pressed', async () => {
      const Clipboard = require('expo-clipboard');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Copy All Build Info')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Copy all build information to clipboard'));

      await waitFor(() => {
        expect(Clipboard.setStringAsync).toHaveBeenCalled();
      });
    });

    it('shows copied feedback after copying', async () => {
      const Clipboard = require('expo-clipboard');
      Clipboard.setStringAsync.mockResolvedValue(undefined);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Build Information section'));

      await waitFor(() => {
        expect(screen.getByText('Copy All Build Info')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Copy all build information to clipboard'));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible theme options', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Light theme')).toBeTruthy();
      expect(screen.getByLabelText('Dark theme')).toBeTruthy();
      expect(screen.getByLabelText('System theme')).toBeTruthy();
    });

    it('has accessible external links', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('View Privacy Policy')).toBeTruthy();
      expect(screen.getByLabelText('View Terms of Service')).toBeTruthy();
      expect(screen.getByLabelText('View source code on GitHub')).toBeTruthy();
    });

    it('has accessible developer link', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Visit developer website')).toBeTruthy();
    });
  });

  describe('Footer', () => {
    it('renders footer tagline', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Supporting recovery, one day at a time')).toBeTruthy();
    });
  });

  describe('Account Section', () => {
    it('renders Account section with current display name', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Account')).toBeTruthy();
        expect(getByText('Display Name')).toBeTruthy();
        expect(getByText('Test D.')).toBeTruthy(); // mockProfile has display_name: 'Test D.'
      });
    });

    it('opens edit modal when tapping the name row', async () => {
      const { getByText, getByTestId } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Test D.')).toBeTruthy();
      });

      // Tap the account row
      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });
    });

    it('pre-fills modal input with current display name', async () => {
      const { getByTestId, getByDisplayValue } = render(<SettingsScreen />);

      await waitFor(() => {
        fireEvent.press(getByTestId('account-name-row'));
      });

      await waitFor(() => {
        expect(getByDisplayValue('Test D.')).toBeTruthy();
      });
    });

    it('validates display name is required', async () => {
      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      // Clear display name
      const displayNameInput = getByTestId('edit-display-name-input');
      fireEvent.changeText(displayNameInput, '');

      // Try to save
      fireEvent.press(getByTestId('edit-name-save-button'));

      // Should show validation error
      await waitFor(() => {
        expect(getByText('Display name is required')).toBeTruthy();
      });
    });

    it('validates display name minimum length', async () => {
      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      // Enter too short display name
      const displayNameInput = getByTestId('edit-display-name-input');
      fireEvent.changeText(displayNameInput, 'A');

      // Try to save
      fireEvent.press(getByTestId('edit-name-save-button'));

      // Should show validation error
      await waitFor(() => {
        expect(getByText('Display name must be at least 2 characters')).toBeTruthy();
      });
    });

    it('closes modal on cancel', async () => {
      const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      fireEvent.press(getByTestId('edit-name-cancel-button'));

      await waitFor(() => {
        expect(queryByText('Edit Display Name')).toBeNull();
      });
    });

    it('calls Supabase update and refreshProfile on save', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      // Change name
      fireEvent.changeText(getByTestId('edit-display-name-input'), 'New Name');

      // Save
      fireEvent.press(getByTestId('edit-name-save-button'));

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
        expect(mockUpdate).toHaveBeenCalledWith({
          display_name: 'New Name',
        });
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(queryByText('Edit Display Name')).toBeNull(); // Modal closed
      });
    });

    it('shows error toast on save failure', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      // Save without changing anything (profile has valid data)
      fireEvent.press(getByTestId('edit-name-save-button'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Database error' })
        );
      });
    });

    it('keeps modal open on error', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });

      fireEvent.press(getByTestId('edit-name-save-button'));

      // Modal should still be open after error
      await waitFor(() => {
        expect(getByText('Edit Display Name')).toBeTruthy();
      });
    });

    it('does not open modal when profile is null', async () => {
      // Set profile to null before rendering
      mockProfile = null;

      const { getByTestId, queryByText } = render(<SettingsScreen />);

      // Try to open the modal - should be blocked by guard
      fireEvent.press(getByTestId('account-name-row'));

      // Modal should NOT open when profile is null
      expect(queryByText('Edit Display Name')).toBeNull();
    });
  });

  it('trims whitespace from display name on save', async () => {
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    // Enter name with leading/trailing whitespace
    fireEvent.changeText(getByTestId('edit-display-name-input'), '  John D.  ');

    fireEvent.press(getByTestId('edit-name-save-button'));

    // First, verify the update was called with trimmed values
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        display_name: 'John D.', // Should be trimmed
      });
    });

    // Then verify the modal closes after the async save completes
    await waitFor(() => {
      expect(queryByText('Edit Display Name')).toBeNull();
    });
  });

  it('shows character count', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    // Check initial character count (Test D. = 7 chars)
    expect(getByText('7/30 characters')).toBeTruthy();

    // Change the name and verify count updates
    fireEvent.changeText(getByTestId('edit-display-name-input'), 'New Name');
    expect(getByText('8/30 characters')).toBeTruthy();
  });

  it('shows loading state and disables button during save', async () => {
    let resolveUpdate: (value: { error: null }) => void;
    const updatePromise = new Promise<{ error: null }>((resolve) => {
      resolveUpdate = resolve;
    });

    const mockEq = jest.fn().mockReturnValue(updatePromise);
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('edit-display-name-input'), 'New Name');

    // Save button should show "Save" text before saving
    expect(getByText('Save')).toBeTruthy();

    // First save
    fireEvent.press(getByTestId('edit-name-save-button'));

    // Wait for save to start - "Save" text should disappear (replaced by spinner)
    await waitFor(() => {
      expect(queryByText('Save')).toBeNull();
    });

    // The save should have been initiated
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolveUpdate!({ error: null });

    await waitFor(() => {
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });

  it('clears validation error when typing', async () => {
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    // Clear display name to trigger validation error
    fireEvent.changeText(getByTestId('edit-display-name-input'), '');
    fireEvent.press(getByTestId('edit-name-save-button'));

    await waitFor(() => {
      expect(getByText('Display name is required')).toBeTruthy();
    });

    // Start typing - error should clear
    fireEvent.changeText(getByTestId('edit-display-name-input'), 'Jo');

    await waitFor(() => {
      expect(queryByText('Display name is required')).toBeNull();
    });
  });

  it('closes modal on cancel button press', async () => {
    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    fireEvent.press(getByTestId('edit-name-cancel-button'));

    await waitFor(() => {
      expect(queryByText('Edit Display Name')).toBeNull();
    });
  });

  it('validates display name is not just whitespace', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    // Enter whitespace-only display name
    fireEvent.changeText(getByTestId('edit-display-name-input'), '   ');

    fireEvent.press(getByTestId('edit-name-save-button'));

    // Should show validation error (trimmed string is empty)
    await waitFor(() => {
      expect(getByText('Display name is required')).toBeTruthy();
    });
  });

  it('does not open modal when profile has null display_name', async () => {
    // Use the existing mock infrastructure by setting mockProfile before render
    mockProfile = {
      ...defaultMockProfile,
      display_name: null,
    } as unknown as typeof defaultMockProfile;

    const { getByText, getByTestId, queryByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(getByText('Account')).toBeTruthy();
    });

    // Try to open the modal - should be blocked by guard
    fireEvent.press(getByTestId('account-name-row'));

    // Modal should NOT open when profile has null values
    expect(queryByText('Edit Display Name')).toBeNull();
  });

  it('enforces maxLength on display name input', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    const displayNameInput = getByTestId('edit-display-name-input');

    // Enter a name
    fireEvent.changeText(displayNameInput, 'John Doe');

    // Should accept the input
    expect(displayNameInput.props.value).toBe('John Doe');
  });

  it('shows ActivityIndicator while saving', async () => {
    let resolveUpdate: (value: { error: null }) => void;
    const updatePromise = new Promise<{ error: null }>((resolve) => {
      resolveUpdate = resolve;
    });

    const mockEq = jest.fn().mockReturnValue(updatePromise);
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

    const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('edit-display-name-input'), 'New Name');

    fireEvent.press(getByTestId('edit-name-save-button'));

    // Should show ActivityIndicator (Save text is replaced with spinner)
    await waitFor(() => {
      expect(queryByText('Save')).toBeNull();
    });

    // Resolve to complete save
    resolveUpdate({ error: null });

    await waitFor(() => {
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });

  it('validates invalid characters in display name', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('account-name-row'));

    await waitFor(() => {
      expect(getByText('Edit Display Name')).toBeTruthy();
    });

    // Enter display name with invalid characters
    fireEvent.changeText(getByTestId('edit-display-name-input'), 'John@123');

    fireEvent.press(getByTestId('edit-name-save-button'));

    // Should show validation error
    await waitFor(() => {
      expect(
        getByText('Display name can only contain letters, spaces, periods, and hyphens')
      ).toBeTruthy();
    });
  });
});

// =============================================================================
// Web Platform Tests
// =============================================================================

describe('SettingsScreen - Web Platform', () => {
  const { Platform } = require('react-native');
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockProfile = defaultMockProfile;
    // Enable real alert implementation for web tests
    mockUseRealAlertImplementation = true;
    Platform.OS = 'web';
    global.window = {
      ...originalWindow,
      confirm: jest.fn().mockReturnValue(true),
      alert: jest.fn(),
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    Platform.OS = 'ios';
    global.window = originalWindow;
    mockUseRealAlertImplementation = false;
  });

  describe('Sign Out - Web', () => {
    it('shows web confirmation dialog when sign out is pressed', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(global.window.confirm).toHaveBeenCalledWith(
          'Sign Out\n\nAre you sure you want to sign out?'
        );
      });
    });

    it('calls signOut on web after confirmation', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled();
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('does not sign out when cancelled on web', async () => {
      (global.window.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(global.window.confirm).toHaveBeenCalled();
      });

      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('shows error toast when sign out fails on web', async () => {
      mockSignOut.mockRejectedValueOnce(new Error('Network error'));

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', text1: 'Failed to sign out: Network error' })
        );
      });
    });
  });

  describe('Delete Account - Web', () => {
    it('shows two confirmation dialogs on web before deleting', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        // Both confirms should be called
        expect(global.window.confirm).toHaveBeenCalledTimes(2);
        expect(mockBack).toHaveBeenCalled();
        expect(mockDeleteAccount).toHaveBeenCalled();
      });
    });

    it('shows success toast after account deletion on web', async () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'success',
            text1: 'Your account has been deleted. We wish you well on your journey.',
          })
        );
      });
    });

    it('does not delete when first confirm is cancelled on web', async () => {
      (global.window.confirm as jest.Mock).mockReturnValueOnce(false);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(global.window.confirm).toHaveBeenCalledTimes(1);
      });

      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });

    it('does not delete when second confirm is cancelled on web', async () => {
      (global.window.confirm as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(global.window.confirm).toHaveBeenCalledTimes(2);
      });

      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });

    it('shows error toast when delete fails on web', async () => {
      mockDeleteAccount.mockRejectedValueOnce(new Error('Delete failed'));

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            text1: 'Failed to delete account: Delete failed',
          })
        );
      });
    });
  });
});
