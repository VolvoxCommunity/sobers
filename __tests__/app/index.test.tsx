import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Index from '../../app/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <Text>Redirected to {href}</Text>,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock landing page component
jest.mock('@/components/landing/LandingPage', () => {
  const MockLandingPage = () => {
    return <Text>Landing Page</Text>;
  };
  return MockLandingPage;
});

// =============================================================================
// Tests
// =============================================================================

describe('Index Route', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Platform.OS = originalPlatform;
  });

  it('redirects to login on native platforms', () => {
    // Mock native platform
    Platform.OS = 'ios';

    const { getByText } = render(<Index />);

    expect(getByText('Redirected to /login')).toBeTruthy();
  });

  it('shows landing page on web platform', () => {
    // Mock web platform
    Platform.OS = 'web';

    const { getByText } = render(<Index />);

    expect(getByText('Landing Page')).toBeTruthy();
  });
});
