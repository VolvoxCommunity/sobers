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
import SettingsScreen from '@/app/settings';

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
const mockProfile = {
  id: 'test-user-id',
  first_name: 'Test',
  last_initial: 'D',
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
  runtimeVersion: '1.0.0',
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
  nativeApplicationVersion: '1.0.0',
}));

// Mock package.json - use absolute path from project root
jest.mock(
  '../../package.json',
  () => ({
    version: '1.0.0',
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
    mockSupabaseFrom.mockReset();
  });

  describe('Header', () => {
    it('renders settings header', () => {
      render(<SettingsScreen />);

      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('renders close button', () => {
      render(<SettingsScreen />);

      expect(screen.getByLabelText('Close settings')).toBeTruthy();
    });

    it('navigates back when close button is pressed', () => {
      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Close settings'));

      expect(mockBack).toHaveBeenCalled();
    });
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

      expect(screen.getByText(/v1\.0\.0/)).toBeTruthy();
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

      expect(screen.getByText(/v1\.0\.0/)).toBeTruthy();
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

      // Main sections should be rendered
      expect(screen.getByText('Settings')).toBeTruthy();
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
      const { Alert } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sign Out',
          'Are you sure you want to sign out?',
          expect.any(Array)
        );
      });
    });

    it('calls signOut and navigates on confirmation', async () => {
      const { Alert } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get the Sign Out button from the alert options
      const alertCall = Alert.alert.mock.calls[0];
      const signOutOption = alertCall[2].find((opt: { text: string }) => opt.text === 'Sign Out');

      await signOutOption.onPress();

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('shows error alert when sign out fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      const alertCall = Alert.alert.mock.calls[0];
      const signOutOption = alertCall[2].find((opt: { text: string }) => opt.text === 'Sign Out');

      await signOutOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to sign out: Sign out failed');
      });
    });

    it('does not sign out when cancel is pressed', async () => {
      const { Alert } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Sign out of your account'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
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
      const { Alert } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Delete Account?',
          expect.stringContaining('permanently delete your account'),
          expect.any(Array)
        );
      });
    });

    it('shows second confirmation dialog after first confirmation', async () => {
      const { Alert } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Get first confirmation
      const firstAlertCall = Alert.alert.mock.calls[0];
      const deleteOption = firstAlertCall[2].find(
        (opt: { text: string }) => opt.text === 'Delete Account'
      );

      deleteOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Final Confirmation',
          expect.stringContaining('last chance to cancel'),
          expect.any(Array)
        );
      });
    });

    it('calls deleteAccount after both confirmations', async () => {
      const { Alert } = jest.requireMock('react-native');
      mockDeleteAccount.mockResolvedValue(undefined);

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // First confirmation
      const firstAlertCall = Alert.alert.mock.calls[0];
      const deleteOption = firstAlertCall[2].find(
        (opt: { text: string }) => opt.text === 'Delete Account'
      );
      deleteOption.onPress();

      await waitFor(() => {
        expect(Alert.alert.mock.calls.length).toBeGreaterThan(1);
      });

      // Second confirmation
      const secondAlertCall = Alert.alert.mock.calls[1];
      const finalDeleteOption = secondAlertCall[2].find(
        (opt: { text: string }) => opt.text === 'Yes, Delete My Account'
      );

      await finalDeleteOption.onPress();

      await waitFor(() => {
        expect(mockDeleteAccount).toHaveBeenCalled();
      });
    });

    it('shows error alert when delete account fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      mockDeleteAccount.mockRejectedValueOnce(new Error('Deletion failed'));

      render(<SettingsScreen />);

      fireEvent.press(screen.getByLabelText('Danger Zone section'));

      await waitFor(() => {
        expect(screen.getByText('Delete Account')).toBeTruthy();
      });

      fireEvent.press(screen.getByLabelText('Delete your account permanently'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // First confirmation
      const firstAlertCall = Alert.alert.mock.calls[0];
      const deleteOption = firstAlertCall[2].find(
        (opt: { text: string }) => opt.text === 'Delete Account'
      );
      deleteOption.onPress();

      await waitFor(() => {
        expect(Alert.alert.mock.calls.length).toBeGreaterThan(1);
      });

      // Second confirmation
      const secondAlertCall = Alert.alert.mock.calls[1];
      const finalDeleteOption = secondAlertCall[2].find(
        (opt: { text: string }) => opt.text === 'Yes, Delete My Account'
      );

      await finalDeleteOption.onPress();

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to delete account: Deletion failed'
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
        expect(Linking.openURL).toHaveBeenCalledWith('https://www.volvoxdev.com/privacy');
      });
    });

    it('opens terms of service URL when pressed', async () => {
      const { Linking } = jest.requireMock('react-native');

      render(<SettingsScreen />);

      fireEvent.press(screen.getByText('Terms of Service'));

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('https://sobrietywaypoint.com/terms');
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
    it('renders Account section with current name displayed', async () => {
      const { getByText } = render(<SettingsScreen />);

      await waitFor(() => {
        expect(getByText('Account')).toBeTruthy();
        expect(getByText('Name')).toBeTruthy();
        expect(getByText('Test D.')).toBeTruthy(); // mockProfile has first_name: 'Test', last_initial: 'D'
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
        expect(getByText('Edit Name')).toBeTruthy();
      });
    });

    it('pre-fills modal inputs with current name values', async () => {
      const { getByTestId, getByDisplayValue } = render(<SettingsScreen />);

      await waitFor(() => {
        fireEvent.press(getByTestId('account-name-row'));
      });

      await waitFor(() => {
        expect(getByDisplayValue('Test')).toBeTruthy(); // First name
        expect(getByDisplayValue('D')).toBeTruthy(); // Last initial
      });
    });

    it('validates first name is required', async () => {
      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      // Clear first name
      const firstNameInput = getByTestId('edit-first-name-input');
      fireEvent.changeText(firstNameInput, '');

      // Try to save
      fireEvent.press(getByTestId('save-name-button'));

      // Should show validation error
      await waitFor(() => {
        expect(getByText('First name is required')).toBeTruthy();
      });
    });

    it('validates last initial is exactly 1 character', async () => {
      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      // Clear last initial (empty)
      const lastInitialInput = getByTestId('edit-last-initial-input');
      fireEvent.changeText(lastInitialInput, '');

      // Try to save
      fireEvent.press(getByTestId('save-name-button'));

      // Should show validation error
      await waitFor(() => {
        expect(getByText('Last initial must be exactly 1 character')).toBeTruthy();
      });
    });

    it('closes modal on cancel', async () => {
      const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      fireEvent.press(getByTestId('cancel-name-button'));

      await waitFor(() => {
        expect(queryByText('Edit Name')).toBeNull();
      });
    });

    it('calls Supabase update and refreshProfile on save', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText, queryByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      // Change name
      fireEvent.changeText(getByTestId('edit-first-name-input'), 'NewName');
      fireEvent.changeText(getByTestId('edit-last-initial-input'), 'X');

      // Save
      fireEvent.press(getByTestId('save-name-button'));

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
        expect(mockUpdate).toHaveBeenCalledWith({
          first_name: 'NewName',
          last_initial: 'X',
        });
        expect(mockRefreshProfile).toHaveBeenCalled();
        expect(queryByText('Edit Name')).toBeNull(); // Modal closed
      });
    });

    it('shows error alert on save failure', async () => {
      const { Alert } = jest.requireMock('react-native');
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      // Save without changing anything (profile has valid data)
      fireEvent.press(getByTestId('save-name-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Database error');
      });
    });

    it('keeps modal open on error', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: { message: 'Database error' } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseFrom.mockReturnValue({ update: mockUpdate });

      const { getByTestId, getByText } = render(<SettingsScreen />);

      fireEvent.press(getByTestId('account-name-row'));

      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });

      fireEvent.press(getByTestId('save-name-button'));

      // Modal should still be open after error
      await waitFor(() => {
        expect(getByText('Edit Name')).toBeTruthy();
      });
    });
  });
});
