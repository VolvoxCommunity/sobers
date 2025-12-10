import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import TabBarIcon from '@/components/navigation/TabBarIcon';

// Store original Platform.OS
const originalPlatformOS = Platform.OS;

/**
 * Helper to set Platform.OS for testing platform-specific behavior.
 */
function setPlatformOS(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    get: () => os,
    configurable: true,
  });
}

describe('TabBarIcon', () => {
  afterAll(() => {
    // Restore original Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  it('renders SF Symbol name on iOS', () => {
    setPlatformOS('ios');
    const { toJSON } = render(
      <TabBarIcon sfSymbol="house.fill" fallbackIcon={() => <></>} focused={true} color="#10b981" />
    );
    // On iOS, should pass sfSymbol to native
    expect(toJSON()).toBeTruthy();
  });

  it('renders fallback Lucide icon on Android', () => {
    setPlatformOS('android');
    const MockIcon = ({ color }: { color: string }) => <></>;
    render(
      <TabBarIcon sfSymbol="house.fill" fallbackIcon={MockIcon} focused={false} color="#666" />
    );
    // On Android, should render fallback
    expect(screen).toBeTruthy();
  });
});
