/**
 * @fileoverview Tests for app/(app)/(tabs)/program/index.tsx
 *
 * Tests the Program index redirect including:
 * - Redirect to /program/steps
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
      render(<ProgramIndex />);

      expect(redirectHref).toBe('/program/steps');
    });

    it('renders Redirect component', () => {
      render(<ProgramIndex />);

      expect(screen.getByTestId('redirect')).toBeTruthy();
    });

    it('passes correct href to Redirect', () => {
      render(<ProgramIndex />);

      expect(screen.getByTestId('redirect-href').props.children).toBe('/program/steps');
    });
  });
});
