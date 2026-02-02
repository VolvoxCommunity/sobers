import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(app)/(tabs)/profile';
import { Platform } from 'react-native';

// Mocks
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) }),
}));

const mockRefreshProfile = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-123',
      display_name: 'John D.',
      email: 'test@example.com',
      sobriety_date: '2024-01-01',
    },
    user: { id: 'user-123' },
    refreshProfile: mockRefreshProfile,
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF',
      background: '#fff',
      text: '#000',
      card: '#fff',
      border: '#ccc',
      fontRegular: 'System',
      fontBold: 'System-Bold',
      danger: 'red',
      success: 'green',
      primaryLight: '#eef',
      dangerBorder: 'red',
      dangerLight: '#fee',
      surface: '#fff',
      textSecondary: '#666',
      white: '#fff',
    },
  }),
}));

jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: jest.fn(() => ({
    daysSober: 100,
    journeyStartDate: '2024-01-01',
    currentStreakStartDate: '2024-01-01',
    hasSlipUps: false,
    loading: false,
  })),
}));

jest.mock('lucide-react-native', () => ({
  Heart: () => null,
  Share2: () => null,
  QrCode: () => null,
  UserMinus: () => null,
  CheckCircle: () => null,
  Settings: () => null,
  // ConnectionIntentSelector icons
  Search: () => null,
  Users: () => null,
  UserPlus: () => null,
  // PersistentInviteCard icons
  Copy: () => null,
  RefreshCw: () => null,
  Trash2: () => null,
  Clock: () => null,
  Plus: () => null,
  // SymmetricRevealSection icons
  Eye: () => null,
  EyeOff: () => null,
  MessageCircle: () => null,
  Phone: () => null,
  Send: () => null,
  Check: () => null,
  Shield: () => null,
  X: () => null,
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() },
  LogCategory: { DATABASE: 'database' },
}));

jest.mock('@/components/SettingsSheet', () => {
  const React = require('react');
  const Component = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ present: jest.fn() }));
    return null;
  });
  Component.displayName = 'SettingsSheet';
  return Component;
});
jest.mock('@/components/sheets/LogSlipUpSheet', () => {
  const React = require('react');
  const Component = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ present: jest.fn() }));
    return null;
  });
  Component.displayName = 'LogSlipUpSheet';
  return Component;
});
jest.mock('@/components/sheets/EnterInviteCodeSheet', () => {
  const React = require('react');
  const Component = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ present: jest.fn() }));
    return null;
  });
  Component.displayName = 'EnterInviteCodeSheet';
  return Component;
});
jest.mock('@/hooks/useTabBarPadding', () => ({
  useTabBarPadding: () => 0,
}));

const createBuilder = (overrides = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  update: jest.fn().mockResolvedValue({ error: null }),
  insert: jest.fn().mockResolvedValue({ error: null }),
  delete: jest.fn().mockResolvedValue({ error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve) => Promise.resolve({ data: [], error: null }).then(resolve)),
  ...overrides,
});

describe('ProfileScreen Web', () => {
  let originalPlatform: typeof Platform.OS;

  beforeAll(() => {
    originalPlatform = Platform.OS;
  });

  beforeEach(() => {
    Platform.OS = 'web';
    global.window = {
      alert: jest.fn(),
      confirm: jest.fn(() => true),
    } as any;

    const { supabase } = jest.requireMock('@/lib/supabase');
    supabase.from.mockImplementation(() => createBuilder());
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    delete (global as any).window;
    jest.clearAllMocks();
  });

  it('renders profile screen on web platform', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-display-name')).toBeTruthy();
    });

    expect(screen.getByText('John D.')).toBeTruthy();
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('displays sobriety stats on web', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-sobriety-stats')).toBeTruthy();
    });

    expect(screen.getByText('100 Days')).toBeTruthy();
    expect(screen.getByText(/Journey started:/)).toBeTruthy();
  });

  it('shows record a setback button on web', async () => {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('Record a Setback')).toBeTruthy();
    });
  });
});
