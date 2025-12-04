
import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Index from '../../app/index';

// Mock expo-router
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => `Redirected to ${href}`,
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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login on native platforms', () => {
    // Mock native platform
    Platform.OS = 'ios';

    const { toJSON } = render(<Index />);
    const tree = toJSON();

    expect(tree).toContain('Redirected to /login');
  });

  it('shows landing page on web platform', () => {
    // Mock web platform
    Platform.OS = 'web';

    const { getByText } = render(<Index />);

    expect(getByText('Landing Page')).toBeTruthy();

  });
});
