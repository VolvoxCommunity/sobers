import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import TabBarIcon from '@/components/navigation/TabBarIcon';

// Mock expo-symbols SymbolView
jest.mock('expo-symbols', () => ({
  SymbolView: ({ name, tintColor, weight, testID }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={testID || 'symbol-view'}>
        <Text testID="symbol-name">{name}</Text>
        <Text testID="symbol-color">{tintColor}</Text>
        <Text testID="symbol-weight">{weight}</Text>
      </View>
    );
  },
}));

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
  afterEach(() => {
    // Restore original Platform.OS after each test
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatformOS,
      configurable: true,
    });
  });

  it('renders SymbolView with correct props on iOS', () => {
    setPlatformOS('ios');
    const { getByTestId } = render(
      <TabBarIcon sfSymbol="house.fill" fallbackIcon={() => <></>} focused={true} color="#10b981" />
    );

    // Verify SymbolView is rendered with correct symbol name and color
    expect(getByTestId('symbol-view')).toBeTruthy();
    expect(getByTestId('symbol-name')).toHaveTextContent('house.fill');
    expect(getByTestId('symbol-color')).toHaveTextContent('#10b981');
    expect(getByTestId('symbol-weight')).toHaveTextContent('semibold');
  });

  it('renders fallback Lucide icon with correct color on Android', () => {
    setPlatformOS('android');
    const MockIcon = ({ color }: { color: string }) => <Text testID="mock-icon">{color}</Text>;
    const { getByTestId } = render(
      <TabBarIcon sfSymbol="house.fill" fallbackIcon={MockIcon} focused={false} color="#666" />
    );

    // Verify fallback icon is rendered with correct color
    expect(getByTestId('mock-icon')).toBeTruthy();
    expect(getByTestId('mock-icon')).toHaveTextContent('#666');
  });
});
