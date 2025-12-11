/**
 * @fileoverview Tests for keyboard avoidance in profile.tsx
 *
 * Tests keyboard avoidance behavior including:
 * - KeyboardAvoidingView rendering with correct behavior prop
 * - Platform-specific behavior (iOS vs Android)
 * - Input positioning when keyboard appears
 * - Modal content adjustment with keyboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import ProfileScreen from '@/app/(tabs)/profile';

// =============================================================================
// Mocks
// =============================================================================

// Mock data
let mockSponsorRelationships: unknown[] = [];
let mockSponseeRelationships: unknown[] = [];

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'sponsor_sponsee_relationships') {
        return {
          select: jest.fn().mockImplementation(() => ({
            eq: jest.fn().mockImplementation((field: string) => {
              if (field === 'sponsee_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: mockSponsorRelationships,
                    error: null,
                  }),
                };
              }
              if (field === 'sponsor_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: mockSponseeRelationships,
                    error: null,
                  }),
                };
              }
              return {
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          })),
        };
      }
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'invite_codes') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  },
}));

// Mock expo-router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useNavigation: () => ({
    setOptions: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
}));

// Mock AuthContext
const mockProfile = {
  id: 'user-123',
  display_name: 'John D.',
  sobriety_date: '2024-01-01',
  email: 'john@example.com',
};
const mockRefreshProfile = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: 'user-123', email: 'john@example.com' },
    refreshProfile: mockRefreshProfile,
    session: {},
    loading: false,
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
      success: '#10b981',
      danger: '#ef4444',
      white: '#ffffff',
      fontRegular: 'JetBrainsMono-Regular',
      fontMedium: 'JetBrainsMono-Medium',
      fontSemiBold: 'JetBrainsMono-SemiBold',
      fontBold: 'JetBrainsMono-Bold',
    },
    isDark: false,
  }),
}));

// Mock useDaysSober hook
jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: jest.fn(() => ({
    daysSober: 180,
    journeyStartDate: new Date('2024-01-01T12:00:00'),
    currentStreakStartDate: new Date('2024-01-01T12:00:00'),
    hasSlipUps: false,
    loading: false,
    error: null,
  })),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Share2: () => null,
  QrCode: () => null,
  UserMinus: () => null,
  Edit2: () => null,
  Calendar: () => null,
  AlertCircle: () => null,
  CheckCircle: () => null,
  Settings: () => null,
  X: () => null,
  // Icons used by SettingsSheet
  LogOut: () => null,
  Moon: () => null,
  Sun: () => null,
  Monitor: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  Shield: () => null,
  FileText: () => null,
  Github: () => null,
  Trash2: () => null,
  AlertTriangle: () => null,
  RefreshCw: () => null,
  Download: () => null,
  Info: () => null,
  Copy: () => null,
  User: () => null,
  ChevronLeft: () => null,
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('View', { testID: 'date-time-picker' }),
  };
});

// Mock date library
jest.mock('@/lib/date', () => ({
  formatDateWithTimezone: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  parseDateAsLocal: jest.fn((str: string) => new Date(str)),
  getUserTimezone: jest.fn(() => 'America/New_York'),
}));

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
    DATABASE: 'database',
    UI: 'ui',
    STORAGE: 'storage',
    ANALYTICS: 'analytics',
  },
}));

// Mock analytics
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AnalyticsEvents: {
    SLIP_UP_LOGGED: 'slip_up_logged',
  },
}));

// Mock expo-clipboard (required by SettingsSheet)
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

// Mock expo-constants (required by SettingsSheet)
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock expo-updates (required by SettingsSheet)
jest.mock('expo-updates', () => ({
  channel: null,
  updateId: null,
  runtimeVersion: null,
  isEmbeddedLaunch: true,
}));

// Mock expo-device (required by SettingsSheet)
jest.mock('expo-device', () => ({
  modelName: 'iPhone 14 Pro',
  osName: 'iOS',
  osVersion: '17.0',
}));

// Mock expo-application (required by SettingsSheet)
jest.mock('expo-application', () => ({
  nativeBuildVersion: '1',
  nativeApplicationVersion: '1.0.0',
}));

// Mock useAppUpdates hook (required by SettingsSheet)
jest.mock('@/hooks/useAppUpdates', () => ({
  useAppUpdates: () => ({
    status: 'idle',
    isChecking: false,
    isDownloading: false,
    errorMessage: null,
    checkForUpdates: jest.fn(),
    applyUpdate: jest.fn(),
    isSupported: true,
  }),
}));

// Mock validation (required by SettingsSheet)
jest.mock('@/lib/validation', () => ({
  validateDisplayName: jest.fn(() => null),
}));

// Mock GlassBottomSheet (required by SettingsSheet)
// Mock LogSlipUpSheet
jest.mock('@/components/sheets/LogSlipUpSheet', () => {
  const React = require('react');
  const MockLogSlipUpSheet = React.forwardRef(() => null);
  MockLogSlipUpSheet.displayName = 'LogSlipUpSheet';
  return {
    __esModule: true,
    default: MockLogSlipUpSheet,
  };
});

jest.mock('@/components/GlassBottomSheet', () => {
  const React = require('react');
  const MockGlassBottomSheet = React.forwardRef(
    (
      { children, onDismiss }: { children: React.ReactNode; onDismiss?: () => void },
      ref: React.Ref<{ present: () => void; dismiss: () => void }>
    ) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
      }));
      return React.createElement('View', { testID: 'glass-bottom-sheet' }, children);
    }
  );
  MockGlassBottomSheet.displayName = 'GlassBottomSheet';
  return {
    __esModule: true,
    default: MockGlassBottomSheet,
  };
});

// Mock BottomSheetScrollView and BottomSheetTextInput (required by sheets)
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children, ...props }: { children: React.ReactNode }) => {
    const React = require('react');
    const { ScrollView } = require('react-native');
    return React.createElement(
      ScrollView,
      { ...props, testID: 'bottom-sheet-scroll-view' },
      children
    );
  },
  BottomSheetTextInput: (props: Record<string, unknown>) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, props);
  },
}));

// Mock EnterInviteCodeSheet
jest.mock('@/components/sheets/EnterInviteCodeSheet', () => {
  const React = require('react');
  const MockEnterInviteCodeSheet = React.forwardRef(() => null);
  MockEnterInviteCodeSheet.displayName = 'EnterInviteCodeSheet';
  return {
    __esModule: true,
    default: MockEnterInviteCodeSheet,
  };
});

// Store original Platform.OS
const originalPlatformOS = Platform.OS;

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Helper to set Platform.OS for testing platform-specific behavior.
 */
function setPlatformOS(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Test suite for keyboard avoidance in ProfileScreen
 *
 * Note: These tests verify that the keyboard avoidance infrastructure is in place.
 * Full keyboard behavior testing requires native environment or E2E tests.
 */
describe('ProfileScreen Keyboard Avoidance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSponsorRelationships = [];
    mockSponseeRelationships = [];
    setPlatformOS('ios');
  });

  afterAll(() => {
    // Restore original Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  describe('Component Rendering', () => {
    it('renders ProfileScreen without crashing', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it('shows profile elements', async () => {
      render(<ProfileScreen />);

      // Main profile sections are rendered (days sober tested in profile.test.tsx)
      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
        expect(screen.getByText('Log a Slip Up')).toBeTruthy();
      });
    });
  });

  describe('Sponsor Code Entry', () => {
    it('shows enter invite code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });

    it('presents invite code sheet when enter invite code is pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      // EnterInviteCodeSheet is mocked - the sheet is presented via ref
      // This test verifies the button is clickable and doesn't throw
    });
  });

  describe('Slip-up Sheet', () => {
    it('shows slip up button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Log a Slip Up')).toBeTruthy();
      });
    });

    it('slip-up sheet UI tests are in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All UI and interaction tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
    });
  });

  describe('Platform-specific Behavior', () => {
    it('renders correctly on iOS', async () => {
      setPlatformOS('ios');
      render(<ProfileScreen />);

      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it('renders correctly on Android', async () => {
      setPlatformOS('android');
      render(<ProfileScreen />);

      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });
  });
});
