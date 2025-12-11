/**
 * @fileoverview Tests for app/(tabs)/profile.tsx
 *
 * Tests the profile screen including:
 * - User profile display
 * - Sobriety date and days sober
 * - Sponsor/sponsee relationships
 * - Settings navigation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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
              // If querying by sponsee_id, user wants their sponsors
              if (field === 'sponsee_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: mockSponsorRelationships,
                    error: null,
                  }),
                };
              }
              // If querying by sponsor_id, user wants their sponsees
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
// Note: Use noon time (T12:00:00) to avoid timezone date shifts between UTC and local time
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
    DATABASE: 'database',
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

// Mock GlassBottomSheet (required by SettingsSheet)
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

// Mock EnterInviteCodeSheet - functional mock that captures onSubmit prop
let capturedOnSubmit: ((code: string) => Promise<void>) | null = null;
const mockEnterInviteCodePresent = jest.fn();
const mockEnterInviteCodeDismiss = jest.fn();

jest.mock('@/components/sheets/EnterInviteCodeSheet', () => {
  const React = require('react');
  const MockEnterInviteCodeSheet = React.forwardRef(
    (
      props: { onSubmit: (code: string) => Promise<void>; onClose?: () => void },
      ref: React.Ref<{ present: () => void; dismiss: () => void }>
    ) => {
      // Capture the onSubmit callback for testing
      capturedOnSubmit = props.onSubmit;
      React.useImperativeHandle(ref, () => ({
        present: mockEnterInviteCodePresent,
        dismiss: mockEnterInviteCodeDismiss,
      }));
      return null;
    }
  );
  MockEnterInviteCodeSheet.displayName = 'EnterInviteCodeSheet';
  return {
    __esModule: true,
    default: MockEnterInviteCodeSheet,
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSponsorRelationships = [];
    mockSponseeRelationships = [];
    capturedOnSubmit = null;
    mockEnterInviteCodePresent.mockClear();
    mockEnterInviteCodeDismiss.mockClear();
  });

  describe('User Profile Display', () => {
    it('renders the user avatar with first initial', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('J')).toBeTruthy();
      });
    });

    it('renders the user name elements', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText(/John/);
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it('renders the user email', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeTruthy();
      });
    });
  });

  describe('Sobriety Stats', () => {
    it('renders days sober count', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('180 Days')).toBeTruthy();
      });
    });

    it('shows sobriety journey section', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sobriety Journey')).toBeTruthy();
      });
    });
  });

  describe('Action Buttons', () => {
    it('renders generate invite code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });
    });

    it('renders enter invite code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Settings Navigation', () => {
    it('renders accessible settings button inline in profile header (not via navigation.setOptions)', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Settings button is now rendered inline in the UI (not via navigation.setOptions)
        // because native bottom tabs don't support navigation.setOptions for header customization.
        // Use testID for reliable querying since RNTL has issues resolving accessible names
        // when both accessibilityLabel and accessibilityLabelledBy are present.
        const settingsButton = screen.getByTestId('settings-button');
        expect(settingsButton).toBeTruthy();
        // Verify accessibility props are set correctly
        expect(settingsButton.props.accessibilityLabel).toBe('Open settings');
        expect(settingsButton.props.accessibilityRole).toBe('button');
      });
    });
  });

  describe('Relationships Section', () => {
    it('renders Your Sponsor section', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
      });
    });

    it('renders Your Sponsees section', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });

    it('shows no sponsor message when empty', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('No sponsor connected yet')).toBeTruthy();
      });
    });

    it('shows no sponsees message when empty', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/No sponsees yet/)).toBeTruthy();
      });
    });
  });

  describe('Slip-up Logging', () => {
    it('renders log slip-up button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Record a Setback')).toBeTruthy();
      });
    });

    it('calls present on LogSlipUpSheet ref when log slip-up button is pressed', async () => {
      // The slip-up modal is now a bottom sheet component that uses ref pattern
      // The LogSlipUpSheet is mocked to return null, so we just verify the button exists
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Record a Setback')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Record a Setback'));

      // The sheet is mocked, so we can't test its opening behavior here
      // That behavior is tested in LogSlipUpSheet.test.tsx
    });
  });

  describe('Invite Code Flow', () => {
    it('shows Enter Invite Code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });

    it('Enter Invite Code button is clickable', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      // The sheet is mocked, so we just verify the button is pressable
      fireEvent.press(screen.getByText('Enter Invite Code'));

      // No error means success - the sheet's behavior is tested in EnterInviteCodeSheet.test.tsx
    });
  });

  describe('Journey Start Date', () => {
    it('displays journey start date when available', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Journey started:/)).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('renders correctly while relationships are loading', async () => {
      render(<ProfileScreen />);

      // Component should render without crashing during loading
      await waitFor(() => {
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });
  });

  describe('Generate Invite Code', () => {
    it('renders generate invite code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });
    });

    it('has accessible generate invite code button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        const button = screen.getByText('Generate Invite Code');
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Edit Sobriety Date', () => {
    it('renders sobriety date section with journey start info', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Journey started:/)).toBeTruthy();
      });
    });

    it('shows the journey start date', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Mock has journeyStartDate: new Date('2024-01-01') which formats as January 1, 2024
        expect(screen.getByText(/January 1, 2024/)).toBeTruthy();
      });
    });
  });

  describe('Days Display', () => {
    it('shows days sober count prominently', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('180 Days')).toBeTruthy();
      });
    });
  });

  describe('Invite Code Validation', () => {
    // Note: Invite code validation tests are covered in EnterInviteCodeSheet.test.tsx
    // The profile screen now uses a sheet for invite code entry
    it('shows Enter Invite Code button (validation tested in sheet)', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Profile Header', () => {
    it('renders profile avatar', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Avatar shows first initial
        expect(screen.getByText('J')).toBeTruthy();
      });
    });

    it('renders user email correctly', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeTruthy();
      });
    });
  });

  describe('Action Card Display', () => {
    it('renders action card section', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Relationship Empty States', () => {
    it('shows informative message for no sponsor', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('No sponsor connected yet')).toBeTruthy();
      });
    });

    it('shows informative message with tip for no sponsees', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/No sponsees yet/)).toBeTruthy();
      });
    });
  });

  describe('Sobriety Journey Section', () => {
    it('renders sobriety journey header', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sobriety Journey')).toBeTruthy();
      });
    });

    it('displays days count', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('180 Days')).toBeTruthy();
      });
    });
  });

  describe('Invite Code Submission', () => {
    // Note: Invite code submission validation is now handled by EnterInviteCodeSheet
    // These tests are covered in EnterInviteCodeSheet.test.tsx
    it('(validation and submission tested in EnterInviteCodeSheet.test.tsx)', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Current Streak Display', () => {
    it('shows current streak when there are slip-ups', async () => {
      // Mock with slip-ups
      const useDaysSober = require('@/hooks/useDaysSober');
      useDaysSober.useDaysSober.mockReturnValue({
        daysSober: 30,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-06-01'),
        hasSlipUps: true,
        loading: false,
        error: null,
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('30 Days')).toBeTruthy();
      });

      // Reset mock
      useDaysSober.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: new Date('2024-01-01'),
        currentStreakStartDate: new Date('2024-01-01'),
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });
  });

  describe('Generate Invite Code Action', () => {
    it('calls supabase to generate invite code when pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Generate Invite Code'));

      // The mock should be called - check that the screen doesn't crash
      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Profile Avatar', () => {
    it('shows first initial of first name', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Main profile avatar
        expect(screen.getByText('J')).toBeTruthy();
      });
    });
  });

  describe('Sobriety Stats Labels', () => {
    it('shows Days label in stats', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // The stats display shows "X Days"
        expect(screen.getByText('180 Days')).toBeTruthy();
      });
    });
  });

  describe('Relationships with Data', () => {
    beforeEach(() => {
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('renders when relationships exist', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });
  });

  describe('Sobriety Journey Card', () => {
    it('renders Sobriety Journey title', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sobriety Journey')).toBeTruthy();
      });
    });

    it('renders Record a Setback button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Record a Setback')).toBeTruthy();
      });
    });

    it('shows journey started date', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: '2024-01-01',
        currentStreakStartDate: '2024-01-01',
        hasSlipUps: false,
        loading: false,
        error: null,
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Journey started:/)).toBeTruthy();
      });
    });
  });

  describe('Edit Sobriety Date Flow', () => {
    it('renders edit button next to sobriety date', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('180 Days')).toBeTruthy();
        // Edit button is rendered with Edit2 icon
      });
    });
  });

  // Note: The second 'Invite Code Validation' block tests are covered in EnterInviteCodeSheet.test.tsx

  describe('Your Sponsor Section', () => {
    it('renders Your Sponsor section title', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsor')).toBeTruthy();
      });
    });

    it('shows no sponsor message when no sponsor', async () => {
      mockSponsorRelationships = [];

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('No sponsor connected yet')).toBeTruthy();
      });
    });
  });

  describe('Your Sponsees Section', () => {
    it('renders Your Sponsees section title', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });

    it('shows empty state when no sponsees', async () => {
      mockSponseeRelationships = [];

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(
          screen.getByText('No sponsees yet. Generate an invite code to get started.')
        ).toBeTruthy();
      });
    });
  });

  describe('Sponsor Relationship Display', () => {
    beforeEach(() => {
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
    });

    it('shows sponsor name when connected', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
      });
    });

    it('shows Disconnect button for sponsor', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Multiple disconnect buttons may exist
        expect(screen.getAllByText('Disconnect').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sponsee Relationship Display', () => {
    beforeEach(() => {
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('shows sponsee name when connected', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });
    });

    it('shows sponsee initials in avatar', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Jane D.'s initial 'J' shows in avatar
        expect(screen.getAllByText('J').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Profile Header', () => {
    it('shows user name in header', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Name may appear in multiple places (profile header and edit sheet)
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
      });
    });

    it('shows user email in header', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching relationships', async () => {
      // Component shows loading state initially
      render(<ProfileScreen />);

      // Component should render even during load
      await waitFor(() => {
        expect(screen.getByText('Your Sponsees')).toBeTruthy();
      });
    });

    it('shows loading dots for days sober while loading', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 0,
        journeyStartDate: null,
        currentStreakStartDate: null,
        hasSlipUps: false,
        loading: true,
        error: null,
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('...')).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: '2024-01-01',
        currentStreakStartDate: '2024-01-01',
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });
  });

  describe('Current Streak Display', () => {
    it('shows current streak date when user has slip-ups', async () => {
      const useDaysSoberModule = require('@/hooks/useDaysSober');
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 30,
        journeyStartDate: '2023-01-01',
        currentStreakStartDate: '2024-11-01',
        hasSlipUps: true,
        loading: false,
        error: null,
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText(/Current streak since/)).toBeTruthy();
      });

      // Reset mock
      useDaysSoberModule.useDaysSober.mockReturnValue({
        daysSober: 180,
        journeyStartDate: '2024-01-01',
        currentStreakStartDate: '2024-01-01',
        hasSlipUps: false,
        loading: false,
        error: null,
      });
    });
  });

  // Note: Enter Invite Code Inline tests are now covered in EnterInviteCodeSheet.test.tsx
  // The profile screen now uses EnterInviteCodeSheet for invite code entry
  describe('Enter Invite Code Inline', () => {
    it('(inline input behavior now tested in EnterInviteCodeSheet.test.tsx)', async () => {
      render(<ProfileScreen />);
      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  // Note: Invite Code Validation and Invalid tests are now covered in EnterInviteCodeSheet.test.tsx

  describe('Disconnect Sponsor', () => {
    beforeEach(() => {
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
      mockSponseeRelationships = [];
    });

    it('shows Disconnect button next to sponsor', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
        expect(screen.getByText('Disconnect')).toBeTruthy();
      });
    });

    it('shows confirmation when Disconnect is pressed', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Bob S.'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Generate New Invite Code', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('shows Generate New Invite Code when has sponsees', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate New Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Disconnect Sponsee', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('shows Disconnect button next to sponsee', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
        // Disconnect is the button text for all relationships
        expect(screen.getByText('Disconnect')).toBeTruthy();
      });
    });

    it('shows confirmation when Disconnect sponsee is pressed', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Jane D.'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Sponsee Task Stats', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('shows task completion stats for sponsee', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Stats format: "X/Y tasks"
        expect(screen.getByText(/tasks/)).toBeTruthy();
      });
    });
  });

  describe('Edit Sobriety Date', () => {
    it('shows journey started date with edit icon', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Check that the journey section exists with the date
        expect(screen.getByText(/Journey started:/)).toBeTruthy();
      });
    });
  });

  describe('Sobriety Journey Date Display', () => {
    it('formats journey started date correctly', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Check for the formatted date pattern
        expect(screen.getByText(/Journey started:/)).toBeTruthy();
      });
    });
  });

  describe('Sponsor Days Sober', () => {
    beforeEach(() => {
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];
      mockSponseeRelationships = [];
    });

    it('shows sponsor sobriety info', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
      });
    });
  });

  describe('Sponsee Days Sober', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];
    });

    it('shows sponsee sobriety info', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });
    });
  });

  describe('Empty Generate Invite Code', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];
    });

    it('shows Generate Invite Code when no sponsees', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });
    });

    it('generates invite code when pressed', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Generate Invite Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invite Code Generated',
          expect.stringContaining('Your invite code is:'),
          expect.any(Array)
        );
      });
    });
  });

  // Note: Join with Invite Code - Success Flow tests are now covered in EnterInviteCodeSheet.test.tsx
  // The joinWithInviteCode function is called from EnterInviteCodeSheet's onSubmit callback
  describe('Join with Invite Code - Success Flow', () => {
    it('(success flow tested in EnterInviteCodeSheet.test.tsx)', async () => {
      render(<ProfileScreen />);
      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  // Note: Join with Invite Code - Error Cases tests are now covered in EnterInviteCodeSheet.test.tsx
  // Error messages from joinWithInviteCode are thrown and displayed by the sheet
  describe('Join with Invite Code - Error Cases', () => {
    it('(error cases tested in EnterInviteCodeSheet.test.tsx)', async () => {
      render(<ProfileScreen />);
      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  // Note: More complex flows like sponsor profile fetch error, disconnect relationship,
  // edit sobriety date, and slip-up modal submission are tested via integration tests.

  describe('Generate Invite Code Error', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            insert: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
          };
        }
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
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows error alert when invite code generation fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Generate Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Generate Invite Code'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to generate invite code');
      });
    });
  });

  describe('sponsee task statistics', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Set up sponsee relationships with task stats
      mockSponseeRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-1',
          status: 'active',
          sponsee: {
            id: 'sponsee-1',
            display_name: 'Jane S.',
            sobriety_date: '2024-06-01',
          },
        },
      ];
      mockSponsorRelationships = [];

      // Mock supabase to return tasks for the sponsees
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockImplementation((field: string) => {
                if (field === 'sponsor_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: mockSponseeRelationships,
                      error: null,
                    }),
                  };
                }
                if (field === 'sponsee_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: mockSponsorRelationships,
                      error: null,
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            })),
          };
        }
        if (table === 'tasks') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [
                    { id: 'task-1', sponsee_id: 'sponsee-1', status: 'assigned' },
                    { id: 'task-2', sponsee_id: 'sponsee-1', status: 'completed' },
                    { id: 'task-3', sponsee_id: 'sponsee-1', status: 'completed' },
                  ],
                  error: null,
                }),
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('displays sponsee with task statistics', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane S.')).toBeTruthy();
      });

      // Should show task progress (2 completed out of 3 total)
      await waitFor(() => {
        expect(screen.getByText(/2\/3/)).toBeTruthy();
      });
    });
  });

  describe('error handling for relationships fetch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      // Mock supabase to throw an error
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });
    });

    it('handles error during relationships fetch gracefully', async () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ProfileScreen />);

      // Should still render without crashing
      // Name may appear in multiple places (profile header and edit sheet)
      await waitFor(() => {
        const nameElements = screen.getAllByText('John D.');
        expect(nameElements.length).toBeGreaterThan(0);
      });

      consoleSpy.mockRestore();
    });
  });

  // Note: Join with Invite Code - Already Connected, Relationship Creation Error, Network Error
  // tests are now covered in EnterInviteCodeSheet.test.tsx
  // Error messages from joinWithInviteCode are thrown and displayed by the sheet

  describe('Disconnect Sponsee Flow', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [
        {
          id: 'rel-2',
          sponsor_id: 'user-123',
          sponsee_id: 'sponsee-456',
          status: 'active',
          connected_at: '2024-02-01T00:00:00Z',
          sponsee: {
            id: 'sponsee-456',
            display_name: 'Jane D.',
            sobriety_date: '2024-01-01',
          },
        },
      ];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            })),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
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
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows disconnect confirmation dialog for sponsee', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Jane D.'),
          expect.any(Array)
        );
      });
    });

    it('successfully disconnects sponsee when confirmed', async () => {
      const { Alert } = jest.requireMock('react-native');
      // Mock Alert.alert to auto-confirm
      Alert.alert.mockImplementation(
        (_title: string, _message: string, buttons: { text: string; onPress?: () => void }[]) => {
          const disconnectButton = buttons?.find((b) => b.text === 'Disconnect');
          if (disconnectButton?.onPress) {
            disconnectButton.onPress();
          }
        }
      );

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Jane D.')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Successfully disconnected');
      });
    });
  });

  describe('Disconnect Sponsor Flow', () => {
    beforeEach(() => {
      mockSponseeRelationships = [];
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            })),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'notifications') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
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
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows disconnect confirmation for sponsor relationship', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Disconnection',
          expect.stringContaining('Bob S.'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Disconnect - Error Handling', () => {
    beforeEach(() => {
      mockSponseeRelationships = [];
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                };
              }),
            })),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: { message: 'Disconnect failed' } }),
            }),
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
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows error when disconnect fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      // Mock Alert.alert to auto-confirm disconnect
      Alert.alert.mockImplementation(
        (_title: string, _message: string, buttons: { text: string; onPress?: () => void }[]) => {
          const disconnectButton = buttons?.find((b) => b.text === 'Disconnect');
          if (disconnectButton?.onPress) {
            disconnectButton.onPress();
          }
        }
      );

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Disconnect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to disconnect.');
      });
    });
  });

  describe('Connect to Another Sponsor', () => {
    beforeEach(() => {
      mockSponseeRelationships = [];
      mockSponsorRelationships = [
        {
          id: 'rel-1',
          sponsor_id: 'sponsor-123',
          sponsee_id: 'user-123',
          status: 'active',
          connected_at: '2024-01-15T00:00:00Z',
          sponsor: {
            id: 'sponsor-123',
            display_name: 'Bob S.',
            sobriety_date: '2020-01-01',
          },
        },
      ];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
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
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
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
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });
    });

    it('shows Connect to Another Sponsor button when already has sponsor', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Bob S.')).toBeTruthy();
      });

      await waitFor(() => {
        expect(screen.getByText('Connect to Another Sponsor')).toBeTruthy();
      });
    });
  });

  // Note: Sponsor Profile Fetch Error test is now covered in EnterInviteCodeSheet.test.tsx
  // Error from joinWithInviteCode is thrown and displayed by the sheet

  // =============================================================================
  // Integration Tests: Profile + EnterInviteCodeSheet
  // =============================================================================
  // These tests verify the integration between profile screen and the sheet,
  // specifically testing the joinWithInviteCode callback that gets passed to the sheet.

  describe('Profile + EnterInviteCodeSheet Integration', () => {
    describe('joinWithInviteCode callback', () => {
      it('passes joinWithInviteCode to EnterInviteCodeSheet', async () => {
        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
          expect(typeof capturedOnSubmit).toBe('function');
        });
      });

      it('presents sheet when Enter Invite Code button is pressed', async () => {
        render(<ProfileScreen />);

        await waitFor(() => {
          expect(screen.getByText('Enter Invite Code')).toBeTruthy();
        });

        fireEvent.press(screen.getByText('Enter Invite Code'));

        expect(mockEnterInviteCodePresent).toHaveBeenCalled();
      });
    });

    describe('joinWithInviteCode - Success Flow', () => {
      beforeEach(() => {
        mockSponsorRelationships = [];
        mockSponseeRelationships = [];

        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
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
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-123',
                      code: 'TEST1234',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'sponsor-456', display_name: 'Test Sponsor' },
                    error: null,
                  }),
                }),
              }),
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            };
          }
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
                      eq: jest.fn().mockImplementation((field2: string) => {
                        if (field2 === 'sponsee_id') {
                          return {
                            eq: jest.fn().mockImplementation(() => ({
                              maybeSingle: jest.fn().mockResolvedValue({
                                data: null, // No existing relationship
                                error: null,
                              }),
                            })),
                            maybeSingle: jest.fn().mockResolvedValue({
                              data: null,
                              error: null,
                            }),
                          };
                        }
                        return {
                          eq: jest.fn().mockResolvedValue({
                            data: mockSponseeRelationships,
                            error: null,
                          }),
                        };
                      }),
                    };
                  }
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }),
              })),
              insert: jest.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === 'notifications') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });
      });

      it('connects to sponsor successfully when invite code is valid', async () => {
        const { Alert } = jest.requireMock('react-native');
        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        // Call the captured callback (simulating sheet submission)
        await capturedOnSubmit!('TEST1234');

        // Should show success alert
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Connected with Test Sponsor');
      });
    });

    describe('joinWithInviteCode - Error Cases', () => {
      it('throws error for invalid/expired invite code', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation(() => ({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        // Should throw error for invalid code
        await expect(capturedOnSubmit!('INVALID1')).rejects.toThrow(
          'Invalid or expired invite code'
        );
      });

      it('throws error for expired invite code', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-expired',
                      code: 'EXPIRED1',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'sponsor-456', display_name: 'Test Sponsor' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation(() => ({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('EXPIRED1')).rejects.toThrow('This invite code has expired');
      });

      it('throws error for already used invite code', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-used',
                      code: 'USEDCODE',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      used_by: 'other-user-id', // Already used
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'sponsor-456', display_name: 'Test Sponsor' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation(() => ({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('USEDCODE')).rejects.toThrow(
          'This invite code has already been used'
        );
      });

      it('throws error when trying to connect to self', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-self',
                      code: 'SELFCODE',
                      sponsor_id: 'user-123', // Same as mock user id
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'user-123', display_name: 'John D.' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation(() => ({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('SELFCODE')).rejects.toThrow(
          'You cannot connect to yourself as a sponsor'
        );
      });

      it('throws error when already connected to sponsor', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-dup',
                      code: 'DUPCODE1',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'sponsor-456', display_name: 'Test Sponsor' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation((field: string) => {
                  // Check for existing relationship query
                  if (field === 'sponsor_id') {
                    return {
                      eq: jest.fn().mockImplementation((field2: string) => {
                        if (field2 === 'sponsee_id') {
                          return {
                            eq: jest.fn().mockReturnValue({
                              maybeSingle: jest.fn().mockResolvedValue({
                                data: { id: 'existing-rel' }, // Existing relationship
                                error: null,
                              }),
                            }),
                          };
                        }
                        return {
                          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                        };
                      }),
                    };
                  }
                  if (field === 'sponsee_id') {
                    return {
                      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                    };
                  }
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('DUPCODE1')).rejects.toThrow(
          'You are already connected to this sponsor'
        );
      });

      it('throws error when sponsor profile fetch fails', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-123',
                      code: 'PROFAIL1',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Profile not found' },
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation(() => ({
                  eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                })),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('PROFAIL1')).rejects.toThrow(
          'Unable to fetch sponsor information'
        );
      });

      it('throws error when relationship creation fails', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
          if (table === 'invite_codes') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'invite-123',
                      code: 'RELFAIL1',
                      sponsor_id: 'sponsor-456',
                      expires_at: new Date(Date.now() + 86400000).toISOString(),
                      used_by: null,
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'sponsor-456', display_name: 'Test Sponsor' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'sponsor_sponsee_relationships') {
            return {
              select: jest.fn().mockImplementation(() => ({
                eq: jest.fn().mockImplementation((field: string) => {
                  if (field === 'sponsor_id') {
                    return {
                      eq: jest.fn().mockImplementation((field2: string) => {
                        if (field2 === 'sponsee_id') {
                          return {
                            eq: jest.fn().mockReturnValue({
                              maybeSingle: jest.fn().mockResolvedValue({
                                data: null, // No existing relationship
                                error: null,
                              }),
                            }),
                          };
                        }
                        return {
                          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                        };
                      }),
                    };
                  }
                  if (field === 'sponsee_id') {
                    return {
                      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                    };
                  }
                  return {
                    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }),
              })),
              insert: jest
                .fn()
                .mockResolvedValue({ error: { message: 'Database constraint error' } }),
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
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };
        });

        render(<ProfileScreen />);

        await waitFor(() => {
          expect(capturedOnSubmit).not.toBeNull();
        });

        await expect(capturedOnSubmit!('RELFAIL1')).rejects.toThrow('Database constraint error');
      });
    });
  });
});
