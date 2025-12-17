/**
 * @fileoverview Tests for app/_layout.tsx
 *
 * Tests the root layout including:
 * - Font loading behavior
 * - Stack navigator always renders immediately
 * - Theme-based status bar
 * - Screen view tracking
 *
 * Note: Auth guards are handled in app/(app)/_layout.tsx and tested separately.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

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
    useSegments: () => [],
    usePathname: () => mockPathname,
    useNavigationContainerRef: () => ({ current: null }),
    SplashScreen: {
      preventAutoHideAsync: jest.fn(),
      hideAsync: jest.fn(),
    },
    Stack: Object.assign(
      ({ children }: { children: React.ReactNode }) =>
        React.createElement(View, { testID: 'stack-navigator' }, children),
      {
        Screen: ({ name }: { name: string }) =>
          React.createElement(View, { testID: `screen-${name}` }),
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

// Mock AuthContext - root layout provides it but doesn't consume auth state
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
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
    mockFontsLoaded = true;
    mockFontError = null;
    mockPathname = '/';
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

  describe('immediate Stack rendering', () => {
    it('always renders Stack navigator immediately without auth checks', () => {
      // Root layout must always render Stack per Expo Router best practices
      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('does not show loading indicator in root layout', () => {
      // Loading state is handled in (app)/_layout.tsx, not here
      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.queryByTestId('loading-indicator')).toBeNull();
      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
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
    it('renders correct stack screens for new architecture', () => {
      const RootLayout = getLayout();
      render(<RootLayout />);

      // Public routes at root level
      expect(screen.getByTestId('screen-login')).toBeTruthy();
      expect(screen.getByTestId('screen-signup')).toBeTruthy();
      expect(screen.getByTestId('screen-onboarding')).toBeTruthy();

      // Protected routes are in (app) group
      expect(screen.getByTestId('screen-(app)')).toBeTruthy();

      // Error fallback
      expect(screen.getByTestId('screen-+not-found')).toBeTruthy();
    });

    it('does not include settings at root level (moved to (app))', () => {
      const RootLayout = getLayout();
      render(<RootLayout />);

      // Settings is now inside (app)/_layout.tsx, not root
      expect(screen.queryByTestId('screen-settings')).toBeNull();
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
    it('renders without error when pathname is null', () => {
      mockPathname = null as unknown as string;

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for root path', () => {
      mockPathname = '/';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for steps route', () => {
      mockPathname = '/steps';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for dynamic step detail routes', () => {
      mockPathname = '/steps/abc-123-uuid';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders without error for unknown routes', () => {
      mockPathname = '/unknown-route';

      const RootLayout = getLayout();
      render(<RootLayout />);

      expect(screen.getByTestId('stack-navigator')).toBeTruthy();
    });
  });
});
