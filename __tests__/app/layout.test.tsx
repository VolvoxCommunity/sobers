/**
 * @fileoverview Tests for app/_layout.tsx
 *
 * Tests the root layout including:
 * - Font loading behavior
 * - Auth-based routing guards
 * - Loading state display
 * - Theme-based status bar
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

// =============================================================================
// Mocks
// =============================================================================

// Mock Sentry before importing the component
jest.mock('@/lib/sentry', () => ({
  initializeSentry: jest.fn(),
  navigationIntegration: {
    registerNavigationContainer: jest.fn(),
  },
  wrapRootComponent: (Component: React.ComponentType) => Component,
}));

// Mock expo-router
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

// These need to be prefixed with "mock" to be accessible in jest.mock
let mockSegments: string[] = [];
let mockRootNavigationState: { key: string } | null = { key: 'test-key' };
let mockPathname = '/';

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useRouter: () => ({
      replace: mockReplace,
      push: mockPush,
      back: mockBack,
    }),
    useSegments: () => mockSegments,
    usePathname: () => mockPathname,
    useNavigationContainerRef: () => ({ current: null }),
    useRootNavigationState: () => mockRootNavigationState,
    SplashScreen: {
      preventAutoHideAsync: jest.fn(),
      hideAsync: jest.fn(),
    },
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
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StatusBar: ({ style }: { style: string }) =>
      React.createElement(View, { testID: `status-bar-${style}` }),
  };
});

// Mock expo-font
let mockFontsLoaded = true;
let mockFontError: Error | null = null;

jest.mock('expo-font', () => ({
  useFonts: () => [mockFontsLoaded, mockFontError],
}));

// Mock the fonts package
jest.mock('@expo-google-fonts/jetbrains-mono', () => ({
  JetBrainsMono_400Regular: 'JetBrainsMono_400Regular',
  JetBrainsMono_500Medium: 'JetBrainsMono_500Medium',
  JetBrainsMono_600SemiBold: 'JetBrainsMono_600SemiBold',
  JetBrainsMono_700Bold: 'JetBrainsMono_700Bold',
}));

// Mock useFrameworkReady
jest.mock('@/hooks/useFrameworkReady', () => ({
  useFrameworkReady: jest.fn(),
}));

// Mock Platform module for consistent cross-environment behavior
// This ensures tests run with the same platform assumption (iOS by default)
// regardless of the actual test runner environment
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((options: Record<string, unknown>) => options.ios ?? options.default),
  Version: 17,
  isPad: false,
  isTVOS: false,
  isTV: false,
  constants: {
    reactNativeVersion: { major: 0, minor: 76, patch: 0 },
  },
}));

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
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#ffffff',
      text: '#111827',
    },
    isDark: false,
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ErrorBoundary
jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

// Mock analytics module
jest.mock('@/lib/analytics', () => ({
  initializeAnalytics: jest.fn().mockResolvedValue(undefined),
  trackScreenView: jest.fn(),
  trackEvent: jest.fn(),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  resetAnalytics: jest.fn(),
}));

// =============================================================================
// Test Suite
// =============================================================================

// We need to import the component after all mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getLayout = () => require('@/app/_layout').default;

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockProfile = null;
    mockLoading = false;
    mockFontsLoaded = true;
    mockFontError = null;
    mockSegments = [];
    mockPathname = '/';
    mockRootNavigationState = { key: 'test-key' };
  });

  describe('font loading', () => {
    it('returns null when fonts are not loaded and no error', () => {
      mockFontsLoaded = false;
      mockFontError = null;

      const RootLayout = getLayout();
      const { toJSON } = render(<RootLayout />);

      expect(toJSON()).toBeNull();
    });

    it('renders app when fonts are loaded', () => {
      mockFontsLoaded = true;
      mockFontError = null;

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders app when font error occurs', () => {
      mockFontsLoaded = false;
      mockFontError = new Error('Font loading failed');

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when auth is loading', () => {
      mockLoading = true;

      const RootLayout = getLayout();
      render(<RootLayout />);

      // When loading, the ActivityIndicator is shown instead of the Stack navigator
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
      expect(screen.queryByTestId('stack-navigator')).toBeNull();
    });
  });

  describe('routing guards', () => {
    it('redirects to login when no user and in protected route', async () => {
      mockUser = null;
      mockProfile = null;
      mockSegments = ['(tabs)'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('redirects to login when no user and not in auth screen', async () => {
      mockUser = null;
      mockProfile = null;
      mockSegments = ['some-random-route'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('does not redirect when user is on login screen', async () => {
      mockUser = null;
      mockProfile = null;
      mockSegments = ['login'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      // Wait a tick to ensure no redirects happen
      await waitFor(
        () => {
          expect(mockReplace).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });

    it('does not redirect when user is on signup screen', async () => {
      mockUser = null;
      mockProfile = null;
      mockSegments = ['signup'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(
        () => {
          expect(mockReplace).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });

    it('redirects to tabs when user has complete profile on auth screen', async () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: 'John D.',
        sobriety_date: '2024-01-01',
      };
      mockSegments = ['login'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('redirects to onboarding when user has incomplete profile', async () => {
      mockUser = { id: 'user-123' };
      mockProfile = {
        display_name: null,
        sobriety_date: null,
      };
      mockSegments = ['(tabs)'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('redirects to onboarding when user has no profile', async () => {
      mockUser = { id: 'user-123' };
      mockProfile = null;
      mockSegments = ['(tabs)'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('does not redirect when already on onboarding', async () => {
      mockUser = { id: 'user-123' };
      mockProfile = null;
      mockSegments = ['onboarding'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(
        () => {
          expect(mockReplace).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });

    it('does not redirect when navigator is not ready', async () => {
      mockRootNavigationState = null;
      mockUser = null;
      mockSegments = ['(tabs)'];

      const RootLayout = getLayout();
      render(<RootLayout />);

      await waitFor(
        () => {
          expect(mockReplace).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );
    });
  });

  describe('status bar', () => {
    it('renders status bar', () => {
      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('status-bar-dark')).toBeTruthy();
    });
  });

  describe('screen configuration', () => {
    it('renders stack screens', () => {
      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('screen-login')).toBeTruthy();
      expect(screen.getByTestId('screen-signup')).toBeTruthy();
      expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
      expect(screen.getByTestId('screen-(tabs)')).toBeTruthy();
      expect(screen.getByTestId('screen-settings')).toBeTruthy();
      expect(screen.getByTestId('screen-+not-found')).toBeTruthy();
    });
  });

  describe('screen view tracking', () => {
    it('tracks screen view on initial render', () => {
      const { trackScreenView } = require('@/lib/analytics');
      mockPathname = '/';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(trackScreenView).toHaveBeenCalledWith('Home');
    });

    it('tracks screen view when pathname changes', () => {
      const { trackScreenView } = require('@/lib/analytics');
      mockPathname = '/login';

      const RootLayout = getLayout();
      const { rerender } = render(<RootLayout />);

      expect(trackScreenView).toHaveBeenCalledWith('login');

      // Change pathname
      mockPathname = '/signup';
      rerender(<RootLayout />);

      expect(trackScreenView).toHaveBeenCalledWith('signup');
    });

    it('converts pathname with hyphens to readable screen name', () => {
      const { trackScreenView } = require('@/lib/analytics');
      mockPathname = '/manage-tasks';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(trackScreenView).toHaveBeenCalledWith('manage tasks');
    });

    it('does not track duplicate screen views for same pathname', () => {
      const { trackScreenView } = require('@/lib/analytics');
      mockPathname = '/login';

      const RootLayout = getLayout();
      const { rerender } = render(<RootLayout />);

      const callCount = trackScreenView.mock.calls.length;

      // Rerender with same pathname
      rerender(<RootLayout />);

      // Should not call trackScreenView again
      expect(trackScreenView).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('page title routing (web)', () => {
    // Note: These tests verify the component renders without errors for various routes.
    // The actual page title values are generated by the internal getPageTitle function,
    // which would require a more complex mock setup to capture.
    // Since Head is a web-only feature, these tests ensure routing doesn't break rendering.

    it('renders without error for root path (Home title)', () => {
      mockPathname = '/';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for steps route (Steps title)', () => {
      mockPathname = '/steps';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for dynamic step detail routes (Step Details title)', () => {
      // Step routes use UUIDs, not step numbers
      mockPathname = '/steps/abc-123-uuid';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for unknown routes (default fallback title)', () => {
      mockPathname = '/unknown-route';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });
});
