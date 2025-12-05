import React from 'react';
import { Platform } from 'react-native';
import Index from '@/app/index';
import { renderWithProviders } from '@/__tests__/test-utils';

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(Text, null, `Redirected to ${href}`),
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
  };
});

// Mock landing page component
jest.mock('@/components/landing/LandingPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockLandingPage = () => {
    return React.createElement(Text, null, 'Landing Page');
  };
  return MockLandingPage;
});

// =============================================================================
// Tests
// =============================================================================

/**
 * Helper to set Platform.OS for testing platform-specific behavior.
 */
function setPlatformOS(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    value: os,
    writable: true,
    configurable: true,
  });
}

describe('Index Route', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it('redirects to login on native platforms', () => {
    // Mock native platform
    setPlatformOS('ios');

    const { getByText } = renderWithProviders(<Index />);

    expect(getByText('Redirected to /login')).toBeTruthy();
  });

  it('shows landing page on web platform', () => {
    // Mock web platform
    setPlatformOS('web');

    const { getByText } = renderWithProviders(<Index />);

    expect(getByText('Landing Page')).toBeTruthy();
  });
});
