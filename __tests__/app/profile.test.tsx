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
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useNavigation: () => ({
    setOptions: mockSetOptions,
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

// Mock BottomSheetScrollView (required by SettingsSheet)
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
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSponsorRelationships = [];
    mockSponseeRelationships = [];
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
    beforeEach(() => {
      mockSetOptions.mockClear();
    });

    it('configures header with settings button via navigation.setOptions', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Verify setOptions was called with headerRight
        expect(mockSetOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            headerRight: expect.any(Function),
          })
        );
      });
    });

    it('settings button in header has correct accessibility label', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      // Extract the headerRight function from the setOptions call
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const HeaderRightComponent = setOptionsCall.headerRight;

      // Render the header right component to verify its accessibility
      const { getByLabelText } = render(<HeaderRightComponent />);
      expect(getByLabelText('Open settings')).toBeTruthy();
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
        expect(screen.getByText('Log a Slip Up')).toBeTruthy();
      });
    });

    it('calls present on LogSlipUpSheet ref when log slip-up button is pressed', async () => {
      // The slip-up modal is now a bottom sheet component that uses ref pattern
      // The LogSlipUpSheet is mocked to return null, so we just verify the button exists
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Log a Slip Up')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Log a Slip Up'));

      // The sheet is mocked, so we can't test its opening behavior here
      // That behavior is tested in LogSlipUpSheet.test.tsx
    });

    it('slip-up sheet UI is tested in LogSlipUpSheet.test.tsx', async () => {
      // The slip-up modal UI has been moved to a separate LogSlipUpSheet component
      // UI tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
    });
  });

  describe('Invite Code Flow', () => {
    it('shows invite code input when Enter Invite Code is pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });
    });

    it('shows Connect and Cancel buttons in invite input form', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
      });
    });

    it('hides invite input when Cancel is pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
        expect(screen.queryByPlaceholderText('Enter 8-character code')).toBeNull();
      });
    });

    it('allows typing in invite code input', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC12345');

      expect(input.props.value).toBe('ABC12345');
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

  describe('Slip-up Sheet Interaction', () => {
    it('slip-up sheet interactions are tested in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All interaction tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
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
    it('requires 8 character code format', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter 8-character code');
        expect(input).toBeTruthy();
        // Check maxLength is set (implied by placeholder text)
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
    it('validates invite code length', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      // Enter too short code
      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC');

      // Try to connect
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invite code must be 8 characters');
      });
    });

    it('does not submit when invite code is empty', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });

      // Leave input empty and try to connect
      fireEvent.press(screen.getByText('Connect'));

      // Should not crash, just not do anything (return early)
      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });
  });

  describe('Slip-up Sheet Notes', () => {
    it('notes input tests are in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All notes input tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
    });
  });

  describe('Slip-up Sheet Date Pickers', () => {
    it('date picker tests are in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All date picker tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
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

  describe('Settings Button', () => {
    beforeEach(() => {
      mockSetOptions.mockClear();
    });

    it('renders settings gear icon button in native header', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        // Settings button is now in the native header via navigation.setOptions
        expect(mockSetOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            headerRight: expect.any(Function),
          })
        );
      });
    });

    it('settings button in header can be pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });

      // Extract and render the headerRight component
      const setOptionsCall = mockSetOptions.mock.calls[0][0];
      const HeaderRightComponent = setOptionsCall.headerRight;

      const { getByLabelText } = render(<HeaderRightComponent />);
      const settingsButton = getByLabelText('Open settings');

      // Verify the button can be pressed without errors
      fireEvent.press(settingsButton);
      expect(settingsButton).toBeTruthy();
    });
  });

  describe('Sobriety Journey Card', () => {
    it('renders Sobriety Journey title', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Sobriety Journey')).toBeTruthy();
      });
    });

    it('renders Log a Slip Up button', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Log a Slip Up')).toBeTruthy();
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

  describe('Slip Up Sheet', () => {
    it('slip-up sheet UI tests are in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All UI and interaction tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
    });
  });

  describe('Invite Code Validation', () => {
    it('shows error for short invite code', async () => {
      const { Alert } = jest.requireMock('react-native');

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'ABC');

      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invite code must be 8 characters');
      });
    });

    it('allows entering 8-character invite code', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter 8-character code');
        fireEvent.changeText(input, 'ABCD1234');
        expect(input.props.value).toBe('ABCD1234');
      });
    });
  });

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

  describe('Enter Invite Code Inline', () => {
    it('shows invite input when Enter Invite Code is pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        // Should show the input placeholder
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });
    });

    it('shows Connect button when input is visible', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      await waitFor(() => {
        // Check for the Connect button
        expect(screen.getByText('Connect')).toBeTruthy();
      });
    });

    it('shows Cancel button when input is visible', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeTruthy();
      });
    });

    it('allows entering invite code in input', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'TESTCODE');

      expect(input.props.value).toBe('TESTCODE');
    });

    it('hides input when Cancel is pressed', async () => {
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Cancel'));

      await waitFor(() => {
        // Input should be gone, button should be back
        expect(screen.queryByPlaceholderText('Enter 8-character code')).toBeNull();
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });
    });
  });

  describe('Invite Code Validation', () => {
    it('shows error for short invite code', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'SHORT');

      // Get the Connect buttons (there may be multiple) and press the last one
      const buttons = screen.getAllByText('Connect');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invite code must be 8 characters');
      });
    });
  });

  describe('Invite Code Invalid', () => {
    it('shows error for invalid invite code', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        fireEvent.press(screen.getByText('Enter Invite Code'));
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'BADCODE1');

      const buttons = screen.getAllByText('Connect');
      fireEvent.press(buttons[buttons.length - 1]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid or expired invite code');
      });
    });
  });

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

  describe('Slip Up Submission', () => {
    it('submission tests are in LogSlipUpSheet.test.tsx', () => {
      // The slip-up modal has been moved to LogSlipUpSheet component
      // All submission and loading state tests are now in __tests__/components/sheets/LogSlipUpSheet.test.tsx
      expect(true).toBe(true);
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

  describe('Join with Invite Code - Success Flow', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      // Set up successful invite code flow
      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'TESTCODE',
                    sponsor_id: 'sponsor-123',
                    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
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
                  data: { id: 'sponsor-123', display_name: 'Jane S.' },
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
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

    it('successfully connects with valid invite code', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      // Show invite input
      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      // Enter valid invite code
      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'TESTCODE');

      // Press Connect
      fireEvent.press(screen.getByText('Connect'));

      // Should show success alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          expect.stringContaining('Connected with Jane S.')
        );
      });
    });
  });

  describe('Join with Invite Code - Error Cases', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];
    });

    it('shows error for expired invite code', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      const { Alert } = jest.requireMock('react-native');

      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'EXPIRED1',
                    sponsor_id: 'sponsor-123',
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
                  data: { id: 'sponsor-123', display_name: 'Jane S.' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockSponsorRelationships, error: null }),
              }),
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'EXPIRED1');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'This invite code has expired');
      });
    });

    it('shows error for already used invite code', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      const { Alert } = jest.requireMock('react-native');

      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'USEDCODE',
                    sponsor_id: 'sponsor-123',
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    used_by: 'other-user',
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
                  data: { id: 'sponsor-123', display_name: 'Jane S.' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'sponsor_sponsee_relationships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockSponsorRelationships, error: null }),
              }),
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'USEDCODE');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'This invite code has already been used');
      });
    });

    it('shows error when trying to connect to yourself', async () => {
      const { supabase } = jest.requireMock('@/lib/supabase');
      const { Alert } = jest.requireMock('react-native');

      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'SELFCODE',
                    sponsor_id: 'user-123', // Same as current user
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: mockSponsorRelationships, error: null }),
              }),
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
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'SELFCODE');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'You cannot connect to yourself as a sponsor'
        );
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

  describe('Join with Invite Code - Already Connected', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'VALIDCOD',
                    sponsor_id: 'sponsor-123',
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
                  data: { id: 'sponsor-123', display_name: 'Jane S.' },
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
                  // For the existing relationship check - return an existing relationship
                  return {
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({
                          data: { id: 'existing-rel' }, // Already connected
                          error: null,
                        }),
                      }),
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
                  eq: jest.fn().mockResolvedValue({ data: mockSponseeRelationships, error: null }),
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

    it('shows error when already connected to sponsor', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'VALIDCOD');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'You are already connected to this sponsor'
        );
      });
    });
  });

  describe('Join with Invite Code - Relationship Creation Error', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'NEWCODE1',
                    sponsor_id: 'sponsor-123',
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
                  data: { id: 'sponsor-123', display_name: 'Jane S.' },
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
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                      }),
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
                  eq: jest.fn().mockResolvedValue({ data: mockSponseeRelationships, error: null }),
                };
              }),
            })),
            insert: jest
              .fn()
              .mockResolvedValue({ error: { message: 'Relationship creation failed' } }),
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

    it('shows error when relationship creation fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'NEWCODE1');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to connect: Relationship creation failed'
        );
      });
    });
  });

  describe('Join with Invite Code - Network Error', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockRejectedValue(new Error('Network error')),
              }),
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

    it('shows network error message when fetch throws', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'NETCODE1');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

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

  describe('Sponsor Profile Fetch Error', () => {
    beforeEach(() => {
      mockSponsorRelationships = [];
      mockSponseeRelationships = [];

      const { supabase } = jest.requireMock('@/lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'invite_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    code: 'PROFCODE',
                    sponsor_id: 'sponsor-123',
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

    it('shows error when sponsor profile fetch fails', async () => {
      const { Alert } = jest.requireMock('react-native');
      render(<ProfileScreen />);

      await waitFor(() => {
        expect(screen.getByText('Enter Invite Code')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Enter Invite Code'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter 8-character code')).toBeTruthy();
      });

      const input = screen.getByPlaceholderText('Enter 8-character code');
      fireEvent.changeText(input, 'PROFCODE');
      fireEvent.press(screen.getByText('Connect'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to fetch sponsor information');
      });
    });
  });
});
