/**
 * @fileoverview Tests for app/(app)/(tabs)/program/index.tsx
 *
 * Tests the Program index redirect including:
 * - Redirect to /program/steps
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/test-utils';
import ProgramIndex from '@/app/(app)/(tabs)/program/index';

// =============================================================================
// Mocks
// =============================================================================

let redirectHref: string | null = null;

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { View, Text } = require('react-native');
    redirectHref = href;
    return (
      <View testID="redirect">
        <Text testID="redirect-href">{href}</Text>
      </View>
    );
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('ProgramIndex', () => {
  beforeEach(() => {
    redirectHref = null;
  });

  describe('redirect behavior', () => {
    it('redirects to /program/steps', () => {
      renderWithProviders(<ProgramIndex />);

      expect(redirectHref).toBe('/program/steps');
    });

    it('renders Redirect component', () => {
      renderWithProviders(<ProgramIndex />);

      expect(screen.getByTestId('redirect')).toBeTruthy();
    });

    it('passes correct href to Redirect', () => {
      renderWithProviders(<ProgramIndex />);

      expect(screen.getByTestId('redirect-href').props.children).toBe('/program/steps');
    });
  });
});
