import React from 'react';
import Index from '@/app/index';
import { renderWithProviders, setPlatformOS, restorePlatformOS } from '@/__tests__/test-utils';

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

describe('Index Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    restorePlatformOS();
  });

  it('redirects to login on iOS', () => {
    // Test iOS
    setPlatformOS('ios');

    const { getByText } = renderWithProviders(<Index />);

    expect(getByText('Redirected to /login')).toBeTruthy();
  });

  it('redirects to login on Android', () => {
    // Test Android
    setPlatformOS('android');

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
