/**
 * @fileoverview Tests for app/(app)/_layout.tsx
 *
 * Tests the protected app layout including:
 * - Loading state display while auth is being determined
 * - Redirect to /login when user is not authenticated
 * - Redirect to /onboarding when profile is incomplete
 * - Rendering protected routes when user is fully authenticated
 * - Settings modal with close button functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// =============================================================================
// Mocks
// =============================================================================

// Mock expo-router
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    useRouter: () => ({
      replace: mockReplace,
      back: mockBack,
    }),
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: 'stack-navigator' }, children),
      {
        Screen: ({
          name,
          options,
        }: {
          name: string;
          options?: {
            headerLeft?: () => React.ReactNode;
            headerRight?: () => React.ReactNode;
          };
        }) =>
          React.createElement(
            View,
            { testID: `screen-${name}` },
            // Render headerLeft and headerRight if provided to ensure coverage
            options?.headerLeft?.(),
            options?.headerRight?.()
          ),
      }
    ),
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, { testID: `redirect-${href}` }, `Redirect to ${href}`),
  };
});

// Mock AuthContext
let mockUser: { id: string } | null = null;
let mockProfile: { display_name: string | null; sobriety_date: string | null } | null = null;
let mockLoading = false;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: mockLoading,
    session: null,
  }),
}));

// Mock ThemeContext
const mockTheme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#111827',
  textSecondary: '#6b7280',
  successAlt: '#10b981',
};

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockTheme,
    isDark: false,
  }),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    X: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'x-icon', ...props }),
  };
});

// =============================================================================
// Test Suite
// =============================================================================

// Import the component after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getAppLayout = () => require('@/app/(app)/_layout').default;

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockProfile = null;
    mockLoading = false;
  });

  describe('loading state', () => {
    it('shows loading indicator when auth is loading', () => {
      mockLoading = true;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.queryByTestId('stack-navigator')).toBeNull();
    });

    it('does not show stack when loading', () => {
      mockLoading = true;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.queryByTestId('stack-navigator')).toBeNull();
    });
  });

  describe('authentication redirects', () => {
    it('redirects to /login when user is not authenticated', () => {
      mockUser = null;
      mockProfile = null;
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/login')).toBeTruthy();
    });
  });

  describe('profile completion redirects', () => {
    it('redirects to /onboarding when profile is null', () => {
      mockUser = { id: 'user-123' };
      mockProfile = null;
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/onboarding')).toBeTruthy();
    });

    it('redirects to /onboarding when profile has no display_name', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: null,
        sobriety_date: '2024-01-01',
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/onboarding')).toBeTruthy();
    });

    it('redirects to /onboarding when profile has empty display_name', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: '   ',
        sobriety_date: '2024-01-01',
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/onboarding')).toBeTruthy();
    });

    it('redirects to /onboarding when profile has no sobriety_date', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: 'John D.',
        sobriety_date: null,
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/onboarding')).toBeTruthy();
    });

    it('redirects to /onboarding when both display_name and sobriety_date are missing', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: null,
        sobriety_date: null,
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('redirect-/onboarding')).toBeTruthy();
    });
  });

  describe('authenticated with complete profile', () => {
    beforeEach(() => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: 'John D.',
        sobriety_date: '2024-01-01',
      };
      mockLoading = false;
    });

    it('renders Stack navigator when user has complete profile', () => {
      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders (tabs) screen', () => {
      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('screen-(tabs)')).toBeTruthy();
    });

    it('renders settings screen', () => {
      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.getByTestId('screen-settings')).toBeTruthy();
    });

    it('does not redirect when profile is complete', () => {
      const AppLayout = getAppLayout();
      render(<AppLayout />);

      expect(screen.queryByTestId('redirect-/login')).toBeNull();
      expect(screen.queryByTestId('redirect-/onboarding')).toBeNull();
    });
  });

  describe('settings close button', () => {
    it('calls router.back when settings close button is pressed', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: 'John D.',
        sobriety_date: '2024-01-01',
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      // The settings screen renders with headerRight that includes a close button
      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.press(closeButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles profile with valid display_name after trimming whitespace', () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: '  John D.  ',
        sobriety_date: '2024-01-01',
      };
      mockLoading = false;

      const AppLayout = getAppLayout();
      render(<AppLayout />);

      // Should render stack, not redirect
      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
      expect(screen.queryByTestId('redirect-/onboarding')).toBeNull();
    });
  });
});
