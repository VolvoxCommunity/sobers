import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
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
    profile: { id: 'user-123', display_name: 'John D.', email: 'test@example.com', sobriety_date: '2024-01-01' },
    user: { id: 'user-123' },
    refreshProfile: mockRefreshProfile,
  }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      primary: '#007AFF', background: '#fff', text: '#000', card: '#fff', border: '#ccc',
      fontRegular: 'System', fontBold: 'System-Bold', danger: 'red', success: 'green',
      primaryLight: '#eef', dangerBorder: 'red', dangerLight: '#fee', surface: '#fff',
      textSecondary: '#666', white: '#fff'
    },
  }),
}));

jest.mock('@/hooks/useDaysSober', () => ({
  useDaysSober: jest.fn(() => ({ daysSober: 100, journeyStartDate: new Date(), loading: false })),
}));

jest.mock('lucide-react-native', () => ({
  Heart: () => null, Share2: () => null, QrCode: () => null, UserMinus: () => null,
  Edit2: () => null, CheckCircle: () => null, Settings: () => null,
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return { __esModule: true, default: (props: any) => React.createElement('input', { ...props, 'data-testid': 'date-picker' }) };
});

jest.mock('@/lib/date', () => ({
  formatDateWithTimezone: (d: Date) => d.toISOString().split('T')[0],
  parseDateAsLocal: (s: string) => new Date(s),
  getUserTimezone: () => 'UTC',
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
    ...overrides
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

    it('uses window.confirm and alert for update sobriety date success', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return createBuilder({
                    update: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: null })
                    })
                });
            }
            return createBuilder();
        });

        render(<ProfileScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText('Edit sobriety date')).toBeTruthy();
        });

        fireEvent.press(screen.getByLabelText('Edit sobriety date'));

        await waitFor(() => {
            // Check for modal
            expect(screen.getByText('Edit Sobriety Date')).toBeTruthy();
        });

        // Find Update button in the modal
        const updateButton = screen.getByText('Update');
        fireEvent.press(updateButton);

        expect(window.confirm).toHaveBeenCalled();

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Sobriety date updated successfully');
        });
    });

    it('shows error alert for update sobriety date failure', async () => {
        const { supabase } = jest.requireMock('@/lib/supabase');
        supabase.from.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return createBuilder({
                    update: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ error: new Error('Update Failed') })
                    })
                });
            }
            return createBuilder();
        });

        render(<ProfileScreen />);

        await waitFor(() => {
            expect(screen.getByLabelText('Edit sobriety date')).toBeTruthy();
        });

        fireEvent.press(screen.getByLabelText('Edit sobriety date'));

        await waitFor(() => {
            expect(screen.getByText('Edit Sobriety Date')).toBeTruthy();
        });

        const updateButton = screen.getByText('Update');
        fireEvent.press(updateButton);

        expect(window.confirm).toHaveBeenCalled();

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Update Failed');
        });
    });
});
